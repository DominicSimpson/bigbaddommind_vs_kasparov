import { Square } from "./Square.js";
import { FILES, RANKS } from "../types/coords.js";
import type { File, Rank } from "../types/coords.js";
import { Piece } from "../pieces/Piece.js";
import type { PieceType } from "../pieces/Piece.js";
import type { Move } from "../types/Move.js";
import type { Colour } from "../types/colour.js";
import type { CastlingRights } from "../types/CastlingRights.js";
import type { UndoRecord } from "../types/UndoRecord.js";
import { LegalMoveFilter } from "../move/LegalMoveFilter.js";
import { GameResult } from "../types/GameResult.js";
import { all } from "axios";



export class ChessBoard {

    // ───────────────────────────────
        // 1. Fields / state properties
    // ───────────────────────────────
    private squares: Square[][]; //declares private property called squares
    //Type: 2D array of Square objects (8 rows x 8 columns)
    //private so that code outside the class cannot do board.squares
    private history: UndoRecord[] = []; // see notes in UndoRecord.ts


    private sideToMove: Colour = "white"; // white always moves first - that's the rules!

    private castlingRights: CastlingRights = { 
        whiteK: true, // white king
        whiteQ: true, // white queen
        blackK: true, // black king
        blackQ: true  // black queen
    };

    private enPassantTarget: { rank: Rank, file: File} | null = null;

    private halfMoveClock = 0; // see UndoRecord.ts notes for more on this
    private fullMoveNumber = 1; // ditto

    private repetitionCounts = new Map<string, number>();

    private legalMoveFilter: LegalMoveFilter; // instance of LegalMoveFilter to use for move generation and legality checks

    
    // ───────────────────────────────
        // 2. Constructor / setup
    // ───────────────────────────────

    constructor() {
        this.squares = this.createEmptyBoard(); //sets internal squares grid
        // to freshly generated empty 8x8 board
        // and calls helper method createEmptyBoard below
        this.setupInitialPosition();

        // Initialise repetition tracking with the starting position.
        // For threefold repetition detection, we need to track how many 
        // times each position has occurred in the game history:
        this.bumpRepitition(this.getPositionKey());

        this.legalMoveFilter = new LegalMoveFilter(this); // initializes legal move filter with reference to this board
    }
    
    private setupInitialPosition(): void { 

        const backRank: PieceType[] = [ // the row with the major pieces (not pawns!)
            "rook", // file index: 0
            "knight", // 1
            "bishop", // 2
            "queen",  // 3
            "king",   // 4
            "bishop", // 5
            "knight", // 6
            "rook"    // 7
        ];

            this.setUpPawns(); 
            this.setUpBackRanks(backRank); // external data on piece type layout above is passed in

        }
    
    private setUpPawns(): void {
        for (const file of FILES) {
            this.placePiece(1, file, new Piece("pawn", "white")); // create all white pawns via loop
            this.placePiece(6, file, new Piece("pawn", "black")); // create all black pawns via loop
        }
    }

    private setUpBackRanks(backRank: PieceType[]): void {
        for (const file of FILES) {
            this.placePiece(0, file, new Piece(backRank[file], "white")); // create white back rank pieces via loop
            this.placePiece(7, file, new Piece(backRank[file], "black")); // create black back rank pieces via loop
            }
        } 
        
    private placePiece(rank: Rank, file: File, piece: Piece): void {
        this.squares[rank][file].piece = piece; // Places piece on square
    }

    // ───────────────────────────────
        // 3. Public queries (read-only)
    // ───────────────────────────────
 
    public getSquare(rank: Rank, file: File): Square {
        return this.squares[rank][file]; // rank first, then file, as is normal
        // public method callable outside the class that returns Square
        // safe public way to access one square
    }

    public getSideToMove(): Colour {
        return this.sideToMove;
    }

    public getLegalMoves(fromRank: Rank, fromFile: File): Move[] {
        return this.legalMoveFilter.getLegalMoves(fromRank, fromFile);
    }

    public canUndo(): boolean {
        return this.history.length > 0;
    }

    public canCastle(colour: Colour, side: "K" | "Q"): boolean { // 'prepares' castling rights
        if (colour === "white") return side === "K" ? this.castlingRights.whiteK : this.castlingRights.whiteQ;
        return side === "K" ? this.castlingRights.blackK : this.castlingRights.blackQ;
    }

    public isSquareAttackedBy(rank: Rank, file: File, byColour: Colour): boolean {
        return this.isSquareAttacked(rank, file, byColour);
    }

    public isInCheck(colour: Colour): boolean {
        const enemy: Colour = colour === "white" ? "black" : "white";

        const kingsPosition = this.findKing(colour);
        if (!kingsPosition) return false;

        return this.isSquareAttacked(kingsPosition.rank, kingsPosition.file, enemy);
    }

    public isCheckmate(colour: Colour): boolean {
        // If not in check, it's not checkmate:
        return this.isInCheck(colour) && !this.legalMoveFilter.hasAnyLegalMoves(colour);
    }

    public isStalemate(colour: Colour): boolean {
        return !this.isInCheck(colour) && !this.legalMoveFilter.hasAnyLegalMoves(colour);
    }

    private isDrawByFiftyMoveRule(): boolean {
        return this.halfMoveClock >= 100; // 100 half moves = 50 full moves
    }

    // In official chess moves, if the same position occurs three times with the same player to move 
    // and all the same possible moves (including same legal possiblities such as castling and en passant rights), 
    // then the game can be claimed as a draw by threefold repetition:
    private isDrawByThreefoldRepetition(): boolean {
        return (this.repetitionCounts.get(this.getPositionKey()) ?? 0) >= 3;
    }

    public isDrawByInsufficientMaterial(): boolean {
        // A minor piece in chess is either a bishop or knight; a major piece is a rook or queen; 
        // pawns are "other" pieces; kings are not classified as either minor or major pieces, OR "other" pieces, 
        // because they cannot checkmate by themselves and are not relevant to insufficient material draws. 
        let whiteMinors = 0; // bishops + knights
        let blackMinors = 0;
        let whiteMajors = 0; // rooks + queens
        let blackMajors = 0;
        let whitePawns = 0; // pawns
        let blackPawns = 0;

        // Track bishop square colours (for the K+B vs K+B same-colour case)
        let whiteBishopSquareColours: number[] = [];
        let blackBishopSquareColours: number[] = [];

        for (let r = 0; r < 8; r++) {
            for (let f = 0; f < 8; f++) {
                const piece = this.getSquare(r as Rank, f as File).piece;
                if (!piece) continue;
                if (piece.type === "king") continue; 

                // pawns
                if (piece.type === "pawn") {
                    if (piece.colour === "white") whitePawns++;
                    else blackPawns++;
                    continue;
                }

                // majors
                if (piece.type === "rook" || piece.type === "queen") {
                    if (piece.colour === "white") whiteMajors++;
                    else blackMajors++;
                    continue;
                }

                // minors
                if (piece.type === "bishop" || piece.type === "knight") {
                    if (piece.colour === "white") whiteMinors++;
                    else blackMinors++;
                    // special handling for bishops
                    // unlike knights, bishops never change square colour during game, 
                    // so we can track the colour of the square they start on to determine if same-colour 
                    // bishop endgames are K+B vs K+B or K+B vs K:
                    if (piece.type === "bishop") {
                        // calculate square colour using rank and file indices (0-7):
                        const squareColour = (r + f) % 2; // 0 for light squares, 1 for dark squares
                        if (piece.colour === "white") whiteBishopSquareColours.push(squareColour);
                        else blackBishopSquareColours.push(squareColour);
                    }
                }
            }
        }

        // Any pawns/rooks/queens => can still lead to checkmate, therefore:
        if (whitePawns > 0  || blackPawns > 0 || whiteMajors > 0 || blackMajors > 0) return false;

            // -------------------------------------------------=
                // Piece	Letter in algebraic move notation (SAN):=
                                                                    
                // King	    K                                       =
                // Queen	Q                                       =
                // Rook	    R                                       =
                // Bishop	B                                       =
                // Knight	N (confusing!)                          =      
                // Pawn	[no letter]                                 =
                // --------------------------------------------------

        //Therefore:

        // // K v K is a draw:
        if (whiteMinors === 0 && blackMinors === 0) return true;

        // // K+N vs K OR K+B vs K:
        if ((whiteMinors === 1 && blackMinors === 0) || (whiteMinors === 0 && blackMinors === 1)) {
            return true;
        }

        // // K+B vs K+B where both sides have exactly one bishop, and both bishops are on same colour squares:
        if (
            whiteMinors === 1 && 
            blackMinors === 1 &&
            whiteBishopSquareColours.length === 1 && 
            blackBishopSquareColours.length === 1 &&
            whiteBishopSquareColours[0] === blackBishopSquareColours[0]
        ) {
            return true;
        }
    

        return false;
    }

    public getGameResult(): GameResult {

        const side = this.getSideToMove();

        // no legal moves => either checkmate or stalemate:
        const hasMoves = this.legalMoveFilter.hasAnyLegalMoves(side);
        if (!hasMoves) {
            if (this.isInCheck(side)) {
                const winner: Colour = side === "white" ? "black" : "white";
                return { status: "checkmate", winner };
            }
            return { status: "draw", reason: "stalemate" };
        }

        if (this.isDrawByFiftyMoveRule()) {
            return { status: "draw", reason: "fiftyMove" };
        }

        if (this.isDrawByThreefoldRepetition()) {
            return { status: "draw", reason: "threefold" };
        }

        if (this.isDrawByInsufficientMaterial()) {
            return { status: "draw", reason: "insufficientMaterial" };
        }

        return { status: "ongoing" };
    }

    // ───────────────────────────────
        // 4. Move generation (piece generators)
    // ───────────────────────────────

    // -------------------------------------------------------------------

    // Code below sets up all 32 pieces on board in initial position
    /**
        * Board orientation:
        * - rank 0 = White back rank
        * - rank 1 = White pawns
        * - rank 6 = Black pawns
        * - rank 7 = Black back rank
        *
        * Ranks increase from White's side towards Black's side.
    */
    
    // Engine-internal: used by LegalMoveFilter. Not for UI use, i.e.
    // public only for internal engine use — not part of the real public API.
    /** @internal */
    public _getPseudoLegalMovesForFiltering(fromRank: Rank, fromFile: File): Move[] {
        return this.getPseudoLegalMoves(fromRank, fromFile);
    }

    private getPseudoLegalMoves(fromRank: Rank, fromFile: File): Move[] { // logic for piece movement
        const square = this.getSquare(fromRank, fromFile);
        const piece = square.piece;
        if (!piece) return [];

        // switch statement for pieces
        switch (piece.type) {
            case "pawn":    return this.pawnMoves(fromRank, fromFile, piece);
            case "rook":    return this.rookMoves(fromRank, fromFile, piece);
            case "knight":  return this.knightMoves(fromRank, fromFile, piece);
            case "bishop":  return this.bishopMoves(fromRank, fromFile, piece);
            case "queen":   return this.queenMoves(fromRank, fromFile, piece);
            case "king":    return this.kingMoves(fromRank, fromFile, piece);
        }
        return [];
    }
    

    // --------------------------------------------------------------------- 

    // The following logic applies to all the following piece generators:
    // // Rank:
        // moving down the board - negative
        // moving up the board - positive
    // // File:
        // moving right - positive
        // moving left - negative

    // r + 1: one rank up (north)
    // r - 1: one rank down (south)
    // f + 1: one file right (east)
    // f - 1: one file left (west)

    // df = delta file - change in file (first number)
    // dr = delta rank - change in rank (second number)

    // ----------------------------------------------------------------------

    // pawn movement

    private pawnMoves(r: Rank, f: File, piece: Piece): Move[] {
        // r: the pawns' current rank (0–7)
        // f: the pawns' current file (0–7)
        const moves: Move[] = []; // creates empty array to store moves pawns will make

        // // 1) normal forward moves ---------------

            // if piece is white, white pawns move "positive" (up / north),
            // otherwise pawn is black and therefore moves "negative" (down / south)
            // (obviously assuming white pieces start at bottom of board and black on top, as conventional)
            // ternary operator can be used because of type definition specifying only black or white:
        const dir = piece.colour === "white" ? 1 : -1; // dir = direction

            // starting position for both sets of pawns:
        const startRank = piece.colour === "white" ? 1 : 6;

            // r for rank:
        const oneStepR = r + dir; // logic for if pawn moves one square up (white) / down (black)

        if (this.inBounds(oneStepR, f) && this.isEmpty(oneStepR, f)) { // checks if move is valid
            this.pushIfOk(moves, r, f, oneStepR, f, piece.colour);
        

        const twoStepR = r + 2 * dir; // // logic for if pawn moves two squares up (white) / down (black)

        if (r === startRank && this.isEmpty(twoStepR, f)) { // checks if move is valid
            this.pushIfOk(moves, r, f, twoStepR, f, piece.colour);
            }
        }

        // // 2) normal diagonal captures ---------------

            // accounts for pawn being able to capture opponent piece north-west / north-east:
        for (const df of [-1, +1]) {
            const capR = r + dir;
            const capF = f + df;
            if (this.isEnemy(capR, capF, piece.colour)) {
            // pushIfOk already checks enemy vs friendly and sets capture:true
                this.pushIfOk(moves, r, f, capR, capF, piece.colour);
            }
        }

        // // 3 ) en passant generation ---------------
        if (this.enPassantTarget) {
            const epRank = this.enPassantTarget.rank;
            const epFile = this.enPassantTarget.file;

            if (epRank === r + dir && Math.abs(epFile - f) === 1) {
                // generate en passant moves only when it's fully legal
                const victimRank = (piece.colour === "white" ? epRank - 1 : epRank + 1) as Rank;
                const victimSq = this.getSquare(victimRank, epFile).piece; 
                // f is pawn's current file; epFile is the en passant target file
                // Math.abs is used instead of writing either diagonal direction for pawn capture
                // (epFile - f === -1 || epFile - f === 1)
                // and instead in short code confirms that the target file is exactly one square away,
                // left OR right (or north-west / north-east)
                // both directions are handled symmetrically
                if (victimSq && victimSq.type === "pawn" && victimSq.colour !== piece.colour) {
                    moves.push({ // moves array is accumulated step by step
                        fromRank: r,
                        fromFile: f,
                        toRank: epRank,
                        toFile: epFile,
                        enPassant: true,
                        isCapture: true,
                    });
                }
            }
        }
        
        return moves;
    }

    // // Back row:

    // rook movement

    private rookMoves(r: Rank, f: File, piece: Piece): Move[] {
        return this.rayMoves(r, f, piece, [
            [+1,0], // up (north)
            [-1,0], // down (south)
            [0,+1], // right (east)
            [0,-1]  // left (west)
        ]);
    }
   
    // knight movement

    private knightMoves(r: Rank, f: File, piece: Piece): Move[] {
        // r: the knights' current rank (0–7)
        // f: the knights' current file (0–7)
        const moves: Move[] = []; // creates empty array to store moves knight will make
        const jumps: Array<[number, number]> = [
        // A knight always moves in a 2 + 1 pattern, with exactly 8 permutations of movement:
            [-2, -1], // two ranks down, one file left
            [-2, +1], // two ranks down, one file right
            [-1, -2], // one rank down, two files left
            [-1, +2], // one rank down, two files right
            [+1, -2], // one rank up, two files left 
            [+1, +2], // one rank up, two files right  
            [+2, -1], // two ranks up, one file left
            [+2, +1]  // two ranks up, one file right
        ];

        for (const [dr, df] of jumps) { // each pair of the above possible moves is:
            this.pushIfOk(moves, r, f, r + dr, f + df, piece.colour);
            //destination rank = r + dr
            //destination file = f + df
        }
        return moves;
    }

    // bishop movement

    private bishopMoves(r: Rank, f: File, piece: Piece): Move[] {
        return this.rayMoves(r, f, piece, [
            [+1, +1], // diagonal north-east
            [+1, -1], // diagonal north-west
            [-1, +1], // diagonal south-east
            [-1, -1]  // diagonal south-west
        ])
    }
    
    // queen movement

    private queenMoves(r: Rank, f: File, piece: Piece): Move[] {
        return this.rayMoves(r, f, piece, [
            [+1,  0], // north
            [-1,  0], // south
            [ 0, +1], // east
            [ 0, -1], // west
            [+1, +1], // diagonal north-east
            [+1, -1], // diagonal north-west
            [-1, +1], // diagonal south-east
            [-1, -1]  // diagonal south-west
        ]);
    }

    // king movement
    
    private kingMoves(r: Rank, f: File, piece: Piece): Move[] {
        // r: the kings' current rank (0–7)
        // f: the kings' current file (0–7)
        const moves: Move[] = []; // creates empty array to store moves king will make
        // // Movement permutations:
        // ( 1,-1): north-west
        // ( 1, 0): north
        // ( 1, 1): north-east
        // ( 0,-1): west
        // ( 0, 0): no move
        // ( 0, 1): east
        // (-1,-1): south-west
        // (-1, 0): south
        // (-1, 1): south-east
        
        // Iterate over all delta-rank (dr) and delta-file (df) combinations
        for (let dr = -1; dr <= 1; dr++) { // -1: one rank down; +1: one rank up
            for (let df = -1; df <= 1; df++) {
                if (dr === 0 && df === 0) continue; // (0,0): no move
                this.pushIfOk(moves, r, f, r + dr, f + df, piece.colour) // computes candidate destination
                // after establishing that it is valid (i.e. not off board grid or if contains friendly piece)
            }
        }

        // -- Castling (pseudo-legal structural checks + "through check/out of check" - checks are done in LegalMoveFilter)
        // Only consider castling from e-file (file 4) on home rank (white: 0, black: 7)
        // (Castling cannot take place if king has "wondered off")
        const homeRank = (piece.colour === "white" ? 0 : 7) as Rank; // identify the king's home rank
        if (r === homeRank && f === (4 as File)) { // checks that king is on e1 (white) or e8 (black)
            // King-side: e -> g, rook h -> f; squares f and g must be empty
            // Also, this is the "historical" rule: even if the king is on e1/e8 and the rook is on h1/h8,
            // castling may still be illegal if the king or rook moved earlier and then moved back:
            if (this.canCastle(piece.colour, "K")) {
            // encodes fixed geometry of king-side castling:
            const fFile = 5 as File; // file f
            const gFile = 6 as File; // file g (king destination) 
            const rookFile = 7 as File; // file h (rook start square)

            // look up actual squares on board
            const fSq = this.getSquare(homeRank, fFile); // fSq: f1 (white) or f8 (black)
            const gSq = this.getSquare(homeRank, gFile); // gSq: g1 or g8
            const rookSq = this.getSquare(homeRank, rookFile); // rookSq: h1 or h8
            
            // very that rook is really a rook of the same colour, on the correct rook square:
            const rookOk = 
                rookSq.piece &&
                rookSq.piece.type === "rook" &&
                rookSq.piece.colour === piece.colour;
            
            // check there are no pieces between king and rook, i.e. inbetween squares are empty
            if (!fSq.piece && !gSq.piece && rookOk) {
                // emit a castling move (pseudo-legal)
                // still has to be 'verified' by LegalMoveFilter() and executed by makeMove()
                moves.push({ fromRank: r, fromFile: f, toRank: homeRank, toFile: gFile, castle: "K" });
                }
            }
        }

            // Queen-side: e -> c, rook a -> d; squares b, c, and d must be empty
            if (this.canCastle(piece.colour, "Q")) {
                const bFile = 1 as File; // b
                const cFile = 2 as File; // c
                const dFile = 3 as File; // d
                const rookFile = 0 as File; // a

                const bSq = this.getSquare(homeRank, bFile);
                const cSq = this.getSquare(homeRank, cFile);
                const dSq = this.getSquare(homeRank, dFile);
                const rookSq = this.getSquare(homeRank, rookFile);

                const rookOk = 
                    rookSq.piece &&
                    rookSq.piece.type === "rook" &&
                    rookSq.piece.colour === piece.colour;

                if (!bSq.piece && !cSq.piece && !dSq.piece && rookOk) {
                    moves.push({ fromRank: r, fromFile: f, toRank: homeRank, toFile: cFile, castle: "Q" });
                } 

            }

        return moves;
    }


    // //Helper function for ray-based sliding logic:
    // pieces that move by repeated steps in a straight line until something stops them
    // (either another piece or the end of the board), with each direction one ray (like a laser beam!)
    // //Pieces:
    // Rook → straight lines
    // Bishop → diagonals
    // Queen → straight lines + diagonals

    // df = delta file - change in file (first number)
    // dr = delta rank - change in rank (second number)
    private rayMoves(r: Rank, f: File, piece: Piece, directions: Array<[number, number]>): Move[] {
        // f: the piece's current file (0–7)
        // r: the piece's current rank (0–7)
        const moves: Move[] = []; // creates empty array to store moves pieces will make

        for (const[dr, df] of directions) { // Loops over each direction the piece can move in
            // directions is an array of (dr, df) direction offsets
            // Initializes the first square one step away from the starting square in the current direction:
            let rr = r + dr; // rr = the "ray cursor" - will keep moving outward until stopped
            let ff = f + df; // ff = ditto

            while(this.inBounds(rr, ff)) { // loop checks if piece can continue moving outward
                const tr = rr as Rank;
                const tf = ff as File;

                const target = this.getSquare(tr, tf).piece; // checks what's on current square

                if (target === null) { // confirms that square is empty, so piece can move here
                    moves.push({ fromRank: r, fromFile: f, toRank: tr, toFile: tf });
                } else {
                    if (target.colour !== piece.colour) { // confirms square is occupied by enemy
                        moves.push({ fromRank: r, fromFile: f, toRank: tr, toFile: tf, isCapture: true });
                    }
                    break; // ray stops either because square is friendly piece, or capture of enemy piece ends movement
                }

                // continue incrementally moving the ray one more square in same direction:
                rr += dr;
                ff += df;
            }
        }

        return moves;
    }

    // ───────────────────────────────
        // 5. Move execution (mutation)
    // ───────────────────────────────

    public makeMove(move: Move): void { // returns void because it mutates board state rather than
            // producing a value
        const fromSquare = this.getSquare(move.fromRank, move.fromFile); // where the piece is moving from
        const toSquare = this.getSquare(move.toRank, move.toFile); // where the piece is moving to

        const movingPiece = fromSquare.piece; // takes piece currently on fromSquare

            // if a piece is not occupying a square
        if (!movingPiece) throw new Error("No piece on source square.");
        // enforces alternating turns
        if (movingPiece.colour !== this.sideToMove) throw new Error("Not your turn.");
    
        // --- (a) Build undo record BEFORE mutating board -----------------------------------------------------
          // Store whatever you already store: castling rights, ep square, halfmove, etc.
          // i.e., snapshot before touching board
        const undo: UndoRecord = { // starts building the undo snapshot that will allow reverting later
            // This needs to happen before the board is touched
            move,
            movedPiece: movingPiece, // the exact piece object that moved
            capturedPiece: null, // stores what was on the destination square before move,
            // if it is not null; otherwise use null
            capturedSquare: null,

            sideToMoveBefore: this.sideToMove, // saves whose turn it was before move
            castlingRightsBefore: { ...this.castlingRights }, // copies castling rights object
            // spread operator is used to make shallow copy so that later mutations don't change saved snapshot
            enPassantTargetBefore: this.enPassantTarget // saves previous en passant target square
                ? { ...this.enPassantTarget } // as above, copies it to avoid shared references
                : null,
            halfmoveClockBefore: this.halfMoveClock, // read section of UndoRecord.ts for this
            fullmoveNumberBefore: this.fullMoveNumber, // saves these two counters
            positionKeyBefore: this.getPositionKey(), // FEN position key before makeMove() is applied
            positionKeyAfter: this.getPositionKey(), // FEN position key after makeMove() is applied

            rookFrom: null, // initial state of rook before it's used
            rookTo: null,
            rookPiece: null,

            promotedTo: null, // initial default state of promotion

        };

        
        // --- b) Capture discovery (no mutation yet except optional EP victim removal): ---------------------------------------
            // Handle captures that are NOT "toSq.piece" (i.e. en passant)
              
            // Compute en-passant victim square if needed:
        let enPassantVictimSquare: { rank: Rank, file: File } | null = null;

        if (move.enPassant) {
            // Destination square is empty; captured pawn is behind it:
            if (toSquare.piece !== null) {
                throw new Error("Invalid en passant: target square is not empty");
            }

            const capRank = // calculates rank of pawn of being captured
                (movingPiece.colour === "white" ? (move.toRank -1) : (move.toRank + 1)) as Rank;
                // as Rank is Typescript cast due to function expecting a Rank type

                // captured pawn is on the same file as the destination square
                // Example: e5 > d6 captures the pawn on d5 (file d, same as destination file d):
            const capFile = move.toFile;
                // Grabs Square object where captured pawn actually sits (e.g. d5):
            const capSquare = this.getSquare(capRank, capFile);

                // sanity check here:
            const victim = capSquare.piece;

            if (!victim || victim.type !=="pawn" || victim.colour === movingPiece.colour) {
                throw new Error("Invalid en passant: no enemy pawn to capture");
            }

            undo.capturedPiece = victim;
                // Stores where captured piece was removed from (not toSquare)
            undo.capturedSquare = { rank: capRank, file: capFile };
            enPassantVictimSquare = { rank: capRank, file: capFile };
        } else {
                // normal capture happens on the destination square (if any)
            undo.capturedPiece = toSquare.piece ?? null;
                // capturedSquare left as null, meaning "restore to toSquare" in undoMove()
                // (restore captured piece back onto the destination square)
        }


        // --- c) --- Validation (promotion + castling) before mutation --------------------------------------------

            // promotion conditions:
        const reachedLastRank = // calculates if move is a pawn promotion
            movingPiece.type === "pawn" && // promotion can only happen if piece is pawn
             // !! converts move.promotion (in types/Move.ts) to strict boolean
            ((movingPiece.colour === "white" && move.toRank === 7) || // white promotes on rank 7 (top)
            (movingPiece.colour === "black" && move.toRank === 0)); // black promotes on rank 0 (bottom)

        if (move.promotion && movingPiece.type !== "pawn") {
            throw new Error("Invalid promotion: only pawns can promote");
        }

        if (move.promotion && !reachedLastRank) {
            throw new Error("Invalid promotion: pawn did not reach last rank");
        }

          // Optional strictness: if a pawn reaches last rank, promotion must be specified
        if (reachedLastRank && !move.promotion) {
            throw new Error("Pawn reached last rank without promotion choice");
            // OR: default instead:
            // move.promotion = "queen";
        } 

            // before rook moves:
        if (move.castle) {
            if (movingPiece.type !== "king") {
                throw new Error("Invalid castling: only king can castle");
        }

        const homeRank = (movingPiece.colour === "white" ? 0 : 7) as Rank;
        const expectedToFile = (move.castle === "K" ? 6 : 2) as File;

        if (move.fromRank !== homeRank || 
            move.fromFile !== (4 as File) ||
            move.toRank !== homeRank || 
            move.toFile !== expectedToFile
        ) {
            throw new Error("Invalid castling: incorrect king coordinates for castle move");    
        }
        
            // Define rook from/to squares:
        if (move.castle === "K") { //king-side castling
            undo.rookFrom = { rank: homeRank, file: 7 as File }; // h-file
            undo.rookTo = { rank: homeRank, file: 5 as File }; // f-file
        } else {
                //queen-side castling ("Q")
            undo.rookFrom = { rank: homeRank, file: 0 as File }; // a-file
            undo.rookTo = { rank: homeRank, file: 3 as File}; // d-file
        }    
        
            // The square that the rook starts on (a1/h1/a8/h8):
            const rookFromSquare = this.getSquare(undo.rookFrom.rank, undo.rookFrom.file);

            // Snapshots which rook is moving:
            const rook = rookFromSquare.piece;
            // if for some reason the square the rook starts on is empty, store null instead of undefined
            // This mirrors what the king is already doing
            if (!rook || rook.type !== "rook" || rook.colour !== movingPiece.colour) {
                throw new Error("Invalid castling: rook missing or wrong colour/type")
            }

            undo.rookPiece = rook;
        }
        // --- d) Mutation (move the main piece - board changes happen now) -----------------------------------------------------

        try {
        
            // Clear EP target by default (only re-set on pawn double step):
        this.enPassantTarget = null;

            // Remove missing piece from origin:
        fromSquare.piece = null;

            // If en passant, remove victim pawn now:
        if (enPassantVictimSquare) {
            const vm = this.getSquare(enPassantVictimSquare.rank, enPassantVictimSquare.file);
            vm.piece = null;
        }

            // Place moving piece (or promoted piece) on destination
        if (reachedLastRank && move.promotion) {
            toSquare.piece = new Piece(move.promotion, movingPiece.colour);
            undo.promotedTo = move.promotion;
        } else {
            toSquare.piece = movingPiece;
        }

            // If castling, move rook (rookPiece already validated above)
        if (move.castle && undo.rookFrom && undo.rookTo) {
            const rookFromSquare = this.getSquare(undo.rookFrom.rank, undo.rookFrom.file);
            const rookToSquare   = this.getSquare(undo.rookTo.rank, undo.rookTo.file);       

            rookFromSquare.piece = null;
            rookToSquare.piece   = undo.rookPiece!;
        }


        // --- e) Update castling rights / EP target / clocks / turn -------------------------------------

        const isA1 = (r: Rank, f: File) => r === 0 && f === 0;
        const isH1 = (r: Rank, f: File) => r === 0 && f === 7;
        const isA8 = (r: Rank, f: File) => r === 7 && f === 0;
        const isH8 = (r: Rank, f: File) => r === 7 && f === 7;

            // If king moved => lose both castling rights for that colour:        
        if (movingPiece.type === "king") {
            this.clearCastlingRights(movingPiece.colour);
        }
            // Rook moved from its starting corner => lose castling rights for that side:
        if (movingPiece.type === "rook") {

                if (isH1(move.fromRank, move.fromFile)) this.clearCastlingSide("white", "K");
                if (isA1(move.fromRank, move.fromFile)) this.clearCastlingSide("white", "Q");
                if (isH8(move.fromRank, move.fromFile)) this.clearCastlingSide("black", "K");
                if (isA8(move.fromRank, move.fromFile)) this.clearCastlingSide("black", "Q");
        }

            // Rook captured on its starting corner => lose castling rights for that side
            // (En passant cannot capture a rook, so capturedSquare will be null here anyway):
        if (undo.capturedPiece?.type === "rook") {
            const capRank = move.toRank;
            const capFile = move.toFile;

            if (isH1(capRank, capFile)) this.clearCastlingSide("white", "K");
            if (isA1(capRank, capFile)) this.clearCastlingSide("white", "Q");
            if (isH8(capRank, capFile)) this.clearCastlingSide("black", "K");
            if (isA8(capRank, capFile)) this.clearCastlingSide("black", "Q");
        }

        if (movingPiece.type === "pawn") { // en passant can only be done with pawns
            const dr = move.toRank - move.fromRank;
            if (dr === 2 || dr === -2) { // dr === 2: white; dr === -2: black
                // If it moved two squares, set en passant target;
                // pawn double-step creates a square 'behind it' that can be captured en passant.
                const midRank = ((move.fromRank + move.toRank) / 2) as Rank; //mid-rank is the rank inbetween from and to
                // that square becomes the en passant target:
                this.enPassantTarget = { rank: midRank, file: move.fromFile };
            }
        }
        

        // --- f) Clocks + turn toggle + push undo -----------------------------------------

            // halfmove clock: resets to 0 on pawn move or capture:
        const isCapture = undo.capturedPiece !== null;
        const isPawnMove = movingPiece.type === "pawn";
        this.halfMoveClock = (isPawnMove || isCapture) ? 0 : this.halfMoveClock + 1;
            // otherwise it increments by 1
            // This is used for the 50-move rule and for FEN.

            // fullmove number is complete and increments only after Black's move:
        if (this.sideToMove === "black") this.fullMoveNumber +=1;
            
            // toggle whose turn it is:
        this.sideToMove = this.sideToMove === "white" ? "black": "white";

            // repition bookkeeping (after state is fully updated):
        const keyAfter = this.getPositionKey();
        undo.positionKeyAfter = keyAfter;
        this.bumpRepitition(keyAfter);
            // record undo - saves the snapshot so undoMove() can pop it and reverse everything
            // commits move to the undo stack:
        this.history.push(undo);
    } catch (err) {
            // Roll back using the undo snapshot (WITHOUT depending on history)
        this.rollBackFromUndoSnapshot(undo);
        throw err;
        }
    }

    // Roll back board + meta state using the UndoRecord.
    // // This must NOT pop history (it's used only for failed makeMove)
    private rollBackFromUndoSnapshot(undo: UndoRecord): void {
        
        const move = undo.move;

        // restore meta-state:
        this.sideToMove = undo.sideToMoveBefore;
        this.castlingRights = { ...undo.castlingRightsBefore };
        this.enPassantTarget = undo.enPassantTargetBefore ? { ...undo.enPassantTargetBefore } : null;
        this.halfMoveClock = undo.halfmoveClockBefore;
        this.fullMoveNumber = undo.fullmoveNumberBefore;

        const fromSquare = this.getSquare(move.fromRank, move.fromFile);
        const toSquare   = this.getSquare(move.toRank, move.toFile);

        // undo rook if it was moved:
        if (undo.rookFrom && undo.rookTo) {
            const rookFromSq = this.getSquare(undo.rookFrom.rank, undo.rookFrom.file);
            const rookToSq   = this.getSquare(undo.rookTo.rank, undo.rookTo.file);
            rookToSq.piece = null;
            rookFromSq.piece = undo.rookPiece ?? null;
        }

        // restore main piece:
        toSquare.piece = null;
        fromSquare.piece = undo.movedPiece;

        // restore captured piece:
        if (undo.capturedPiece) {
            if (undo.capturedSquare) {
                const captSq = this.getSquare(undo.capturedSquare.rank, undo.capturedSquare.file);
                captSq.piece = undo.capturedPiece;
            } else {
                toSquare.piece = undo.capturedPiece;
            }
        }
    }

    public undoMove(): void {
        if (!this.canUndo()) return;

        const undo = this.history.pop()!; // undoes last movement by player
        this.unbumpRepitition(undo.positionKeyAfter); // unbumps repitition count for position we're leaving
        const move = undo.move;

        // restore meta-state first
        this.sideToMove = undo.sideToMoveBefore;
        this.castlingRights = { ...undo.castlingRightsBefore };
        this.enPassantTarget = undo.enPassantTargetBefore ? { ...undo.enPassantTargetBefore } : null;
        this.halfMoveClock = undo.halfmoveClockBefore;
        this.fullMoveNumber = undo.fullmoveNumberBefore;

        // squares involved
        const fromSq = this.getSquare(move.fromRank, move.fromFile);
        const toSq = this.getSquare(move.toRank, move.toFile);

        // // a) Undo castling rook move (if castling has happpened)
        // (Do this before restoring king piece to avoid confusion, though either order works)
        if (undo.rookFrom && undo.rookTo) {
            const rookFromSq = this.getSquare(undo.rookFrom.rank, undo.rookFrom.file);
            const rookToSq = this.getSquare(undo.rookTo.rank, undo.rookTo.file);

            // Move rook back
            rookToSq.piece = null;
            rookFromSq.piece = undo.rookPiece ?? null;

        
        }
        // // b) Undo the main piece move (including promotion)
        // If promotion happened, toSq currently has a promoted piece; we restore the pawn (movedPiece)
        toSq.piece = null;
        fromSq.piece = undo.movedPiece;

        // // c) Restore captured piece (normal capture or en passant victim)
        if (undo.capturedPiece) {
            if (undo.capturedSquare) {
                    // en passant (or any capture where captured square differs from 'to')
                    const captSq = this.getSquare(undo.capturedSquare.rank, undo.capturedSquare.file);
                    captSq.piece = undo.capturedPiece; 
                } else {
                    // normal capture: captured piece is on destination square
                    toSq.piece = undo.capturedPiece;
                }
            }
        }

    // ────────────────────────────────────────────────────────
        // 6. Low-level private helpers (private mechanics)
    // ────────────────────────────────────────────────────────
    
    // -------------------------
        // FEN helpers
    // -------------------------

        // Forsyth-Edwards (FEN) / position key convention:
        // different to albebraic notation which uses uppercase for all pieces and 
        // doesn't have a letter for pawns. We are encoding board state, not move text.
        // Example in FEN of starting chess position:
            // ---------------------------------------------------------=
            // rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1 =
            // ---------------------------------------------------------=

        // Comparisons between algebraic move notation (SAN) and FEN piece representation:
            // ------------------------------------------------------
                // Letter in algebraic move notation (SAN):
            
                // Piece
                                                                    
                // King	    K                                       =
                // Queen	Q                                       =
                // Rook	    R                                       =
                // Bishop	B                                       =
                // Knight	N                                       =      
                // Pawn	[no letter]                                 =
            // ------------------------------------------------------

            // ------------------------------------------------------
            // Piece represtation in board position notation (FEN):

            // // Piece	    White	Black                           =

            //    King	    K	    k                               =
            //    Queen	    Q	    q                               =
            //    Rook	    R	    r                               =
            //    Bishop	B	    b                               =
            //    Knight	N	    n                               =
            //    Pawn	    P	    p                               =
            // ------------------------------------------------------

    
    private squareToAlgebraic(rank: Rank, file: File): string {
        return this.getSquare(rank, file).coord;
    }

    private algebraicToSquare(s: string): {rank: Rank; file: File } {
        if (!/^[a-h][1-8]$/.test(s)) {
            throw new Error(`Invalid square: ${s}`);
        }

        const file = (s.charCodeAt(0) - "a".charCodeAt(0)) as File; // converts file letter to number (0-7)
        const rank = (Number(s[1]) - 1) as Rank; // "1" => 0
        
        return { rank, file };
    }

    private pieceToFenLetter(piece: Piece): string {
        const letter = 
            piece.type === "pawn" ? "p" :
            piece.type === "rook" ? "r" :
            piece.type === "knight" ? "n" :
            piece.type === "bishop" ? "b" :
            piece.type === "queen" ? "q" :
            "k";
    
        return piece.colour === "white" ? letter.toUpperCase() : letter;
    }

        // This converts a FEN letter to a Piece object, which is used 
        // when parsing FEN strings to set up the board position:    
    private fenLetterToPiece(letter: string): Piece {
        const isUpper = letter === letter.toUpperCase();
        const colour: Colour = isUpper ? "white" : "black";
        const l = letter.toLowerCase();

        const type: PieceType =
            l === "p" ? "pawn" :
            l === "r" ? "rook" :
            l === "n" ? "knight" :
            l === "b" ? "bishop" :
            l === "q" ? "queen" :
            l === "k" ? "king" :
            (() => { throw new Error(`Invalid FEN piece: ${letter}`) })();

        return new Piece(type, colour);
    }

    public toFEN(): string {
        // 1) piece placement
        const ranks: String[] = [];
        for (let rank = 7; rank >= 0; rank--) {
            let empties = 0;
            let row = "";
            for (let file = 0; file < 8; file++) {
                const piece = this.getSquare(rank as Rank, file as File).piece;
                if (!piece) {
                    empties++;
                } else {
                    if (empties > 0) {
                        row += String(empties);
                        empties = 0;
                    }
                    row += this.pieceToFenLetter(piece);
                }
            }
            if (empties > 0) row += String(empties);
            ranks.push(row);
        }

        const piecePlacement = ranks.join("/");

        // 2) side to move
        const stm = this.sideToMove === "white" ? "w" : "b";

        // 3) castling
        const castling = 
            (this.castlingRights.whiteK ? "K" : "") +
            (this.castlingRights.whiteQ ? "Q" : "") +
            (this.castlingRights.blackK ? "k" : "") +
            (this.castlingRights.blackQ ? "q" : "") || "-";

        // 4) en passant target
        const ep = this.enPassantTarget
            ? this.getSquare(
                this.enPassantTarget.rank, 
                this.enPassantTarget.file
            ).coord
            : "-";
        
        // 5) clocks
        return `${piecePlacement} ${stm} ${castling} ${ep} ${this.halfMoveClock} ${this.fullMoveNumber}`;
    }

        // ----------------------------------------------
            // Repetition key: first 4 FEN fields only
        // ----------------------------------------------
    
        // This generates a unique string key for the current position, encoding all relevant information
    // and representing the current board position:
    private getPositionKey(): string {
        const fen = this.toFEN().split(" ");
        return fen.slice(0, 4).join(" ");
    }

        // -------------------------
            // Load FEN into board
        // -------------------------

    public loadFEN(fen: string): void {
        const parts = fen.trim().split(/\s+/);
        if (parts.length !== 6) throw new Error(`FEN must have 6 fields, got ${parts.length}`);

        const [piecePlacement, stm, castling, ep, halfMove, fullMove] = parts;

        // Clear board:
        for (let rank = 0; rank < 8; rank++) {
            for (let file = 0; file < 8; file++) {
                this.squares[rank][file].piece = null;
            }
        }
    
        // Place pieces:
        const rows = piecePlacement.split("/");
        if (rows.length !== 8) throw new Error(`FEN placement must have 8 ranks`);

        for (let fenRank = 0; fenRank < 8; fenRank++) {
            const row = rows[fenRank];
            let file = 0;
        
        // fenRank 0 is rank 8 => internal rank 7
            const internalRank = (7 - fenRank) as Rank;

            for (const char of row) {
                if (/[1-8]/.test(char)) {  
                    file += Number(char); // skip empty squares
                } else {
                    if (file >= 7) throw new Error(`FEN row overflow`);
                    this.squares[internalRank][file as File].piece = this.fenLetterToPiece(char);
                    file++;
                }
            }

            if (file !== 8) throw new Error(`FEN row does not sum to 8 files`);
        }

        // Side to move:
        if (stm !== "w" && stm !== "b") throw new Error(`Invalid side to move: ${stm}`);
        this.sideToMove = stm === "w" ? "white" : "black";

        // build string representation of castling rights:
            // ternary operators check each castling right (the board can lie to you if 
            // rook or king moved or were captured!), which are a property of the game's timeline,
            // and add corresponding letter if true, // or empty string if false:

        this.castlingRights = {
            whiteK: castling.includes("K"),
            whiteQ: castling.includes("Q"),
            blackK: castling.includes("k"),
            blackQ: castling.includes("q"),
        };

        if (castling === "-") {
            this.castlingRights.whiteK = false; 
            this.castlingRights.whiteQ = false; 
            this.castlingRights.blackK = false; 
            this.castlingRights.blackQ = false;
        }
        
        // en passant:
        this.enPassantTarget = ep === "-" ? null : this.algebraicToSquare(ep);

        // Clocks:
        const hm = Number(halfMove);
        const fm = Number(fullMove);

        if (!Number.isInteger(hm) || hm < 0) throw new Error(`Invalid halfmove clockL ${halfMove}`);
        if (!Number.isInteger(fm) || fm < 1) throw new Error(`Invalid fullmove clockL ${fullMove}`);
 
        this.halfMoveClock = hm;
        this.fullMoveNumber = fm;

        // Reset history + repetition to match new position:
        this.history = [];
        this.repetitionCounts.clear();
        this.bumpRepitition(this.getPositionKey());

    }

    // Following two methods maintain a counter (positive or negative)
    // of how many times each position has occurred in the game history, 
    // which allows for efficient threefold repetition detection:
    private bumpRepitition(key: string): void { // increases count if position has occured before, 
    // or initializes to 1 if it's the first time we see this position
        this.repetitionCounts.set(
            key, 
            (this.repetitionCounts.get(key) ?? 0) + 1);
    }

    private unbumpRepitition(key: string): void {
        const next = (this.repetitionCounts.get(key) ?? 0) - 1; // decrease count after undoing a move

        if (next <= 0) {
            this.repetitionCounts.delete(key);
        } else {
            this.repetitionCounts.set(key, next);
        }
    }

    private pushIfOk( // add (push) a move to array if destination is valid
        moves: Move[], 
        fromRank: Rank,
        fromFile: File,
        toRank: number,
        toFile: number,
        colour: Piece["colour"]
    ): void {
          // Bounds check first (because toRank/toFile are just numbers here)
        if (toRank < 0 || toRank > 7 || toFile < 0 || toFile > 7) return;

        const tr = toRank as Rank;
        const tf = toFile as File;

        const target = this.getSquare(tr, tf).piece;
        
        if (target === null) {
            moves.push({ fromRank, fromFile, toRank: tr, toFile: tf });
        } else if (target.colour !== colour) { // general capture logic if there is and it's an enemy piece
            moves.push({ fromRank, fromFile, toRank: tr, toFile: tf, isCapture: true });
            }
    }

    private inBounds(r: number, f: number): boolean { // Abbreviations for rank and file
        return r >= 0 && r < 8 && f >= 0 && f < 8; // checks if is in bounds of chessboard
    }

    private isEmpty(r: number, f: number): boolean { // checks if square is empty
        if (!this.inBounds(r, f)) return false;
        return this.getSquare(r as Rank, f as File).piece === null;
    }

    // checks if square is occuped by enemy piece
    private isEnemy(r: number, f: number, colour: Piece["colour"]): boolean {
        if (!this.inBounds(r, f)) return false;
        const p = this.getSquare(r as Rank, f as File).piece;
        return p !== null && p.colour !== colour;
    }

    // locates where King is on board for each colour
    private findKing(colour: Colour): { rank: Rank; file: File } | null {
        for (let rank = 0; rank < 8; rank++) {
            for (let file = 0; file < 8; file++) {
                const sq = this.getSquare(rank as Rank, file as File);
                const p = sq.piece;
                if (p && p.type === "king" && p.colour === colour) {
                    return { rank: rank as Rank, file: file as File}
                }
            }
        }
        
        return null;
    }

    
    private isSquareAttacked(rank: Rank, file: File, byColour: Colour): boolean {
        // 1. Pawn attacks
        if (this.isAttackedByPawn(rank, file, byColour)) return true;

        // 2. Knight attacks
        if (this.isAttackedByKnight(rank, file, byColour)) return true;

        // 3. King attacks (adjacent squares)
        if (this.isAttackedByKing(rank, file, byColour)) return true;

        // 4. Sliding pieces (rook/bishop/queen rays) attack
        if (this.isAttackedBySlidingPieces(rank, file, byColour)) return true;

        return false;   
    }


    // ------------------------------------------------------------------------------ 

    // The following logic applies to all the following isAttackedBy helpers:       =
    // // Rank:                                                                     =
        // moving down the board - negative                                      
        // moving up the board - positive                                           = 
    // // File:                                                                     =
        // moving right - positive                                                  =
        // moving left - negative                                                   =

    // r + 1: one rank up (north)                                                   =
    // r - 1: one rank down (south)                                                 =   
    // f + 1: one file right (east)                                                 
    // f - 1: one file left (west)                                                  =

    // df = delta file - change in file (first number)                              =
    // dr = delta rank - change in rank (second number)                             =   

    // ------------------------------------------------------------------------------

    // checks if any square has been attacked by a pawn
    private isAttackedByPawn(rank: Rank, file: File, byColour: Colour): boolean {
        // r: the pawns' current rank (0–7)
        // f: the pawns' current file (0–7)

        // if piece is white, white pawns move "positive" (up),
        // otherwise pawn is black and therefore moves "negative" (down)
        // (obviously assuming white pieces start at bottom of board and black on top, as conventional)
        // ternary operator can be used because of type definition specifying only black or white:
        const pawnRank = byColour === "white" ? rank -1: rank +1;
        if (pawnRank < 0 || pawnRank > 7) return false; // out of range

        const leftFile = file - 1; // pawn takes opponent piece north-west direction
        if (leftFile >= 0) {
            const p = this.getSquare(pawnRank as Rank, leftFile as File).piece;
            if (p && p.colour === byColour && p.type === "pawn") return true;
        }

        const rightFile = file + 1; // pawn takes opponent piece north-east direction
        if (rightFile <= 7) {
            const p = this.getSquare(pawnRank as Rank, rightFile as File).piece;
            if (p && p.colour === byColour && p.type === "pawn") return true;
        }

        return false;
    }

    // checks if any square has been attacked by a knight
    private isAttackedByKnight(rank: Rank, file: File, byColour: Colour): boolean {
        // r: the knights' current rank (0–7)
        // f: the knights' current file (0–7)
        const deltas: Array<[number, number]> = [
            // A knight always moves in a 2 + 1 pattern, with exactly 8 permutations of movement:
            [-2, -1], // two ranks down, one file left
            [-2, +1], // two ranks down, one file right
            [-1, -2], // one rank down, two files left
            [-1, +2], // one rank down, two files right
            [+1, -2], // one rank up, two files left 
            [+1, +2], // one rank up, two files right  
            [+2, -1], // two ranks up, one file left
            [+2, +1]  // two ranks up, one file right
        ]

        for (const [dr, df] of deltas) { // each pair of the above possible moves is:
            const r = rank + dr;
            const f = file + df;
            //destination rank = r + dr
            //destination file = f + df
            if (r < 0 || r > 7 || f < 0 || f > 7) continue;

            const p = this.getSquare(r as Rank, f as File).piece;

            if (p && p.colour === byColour && p.type === "knight") return true;
        }

        return false;
    }

    // checks if any square has been attacked by a king
    private isAttackedByKing(rank: Rank, file: File, byColour: Colour): boolean {
        // r: the kings' current rank (0–7)
        // f: the kings' current file (0–7)
         // // Movement permutations:
        // ( 1,-1): north-west
        // ( 1, 0): north
        // ( 1, 1): north-east
        // ( 0,-1): west
        // ( 0, 0): no move
        // ( 0, 1): east
        // (-1,-1): south-west
        // (-1, 0): south
        // (-1, 1): south-east

        // Starts an outer loop over delta rank (dr), i.e. vertical movement:
        for (let dr = -1; dr <= 1; dr++) { // -1: one rank down; +1: one rank up
        // Starts an inner nested loop over delta file (df), i.e. horizontal movement:
            for (let df = -1; df <= 1; df++) {
                if (dr === 0 && df === 0) continue; // (0,0): no move

                const r = rank + dr;
                const f = file + df;
                if (r < 0 || r > 7 || f < 0 || f > 7) continue; // out of bounds

                const p = this.getSquare(r as Rank, f as File).piece;
                if (p && p.colour === byColour && p.type === "king") return true;
            }
        }

        return false;
    }

    private isAttackedBySlidingPieces(rank: Rank, file: File, byColour: Colour): boolean {
        // sliding pieces: rooks (straight lines), bishops (diagonals), queens (both)
        const rookDirs: Array<[number, number]> = [
            [+1,  0], // north
            [-1,  0], // south
            [ 0, +1], // east
            [ 0, -1]  // west
        ];

        const bishopDirs: Array<[number, number]> = [
            [+1, +1], // north-east
            [+1, -1], // north-west
            [-1, +1], // south-east
            [-1, -1]  // south-west
        ];

        // looks outward in each rook/queen direction and checks if it can be attacked/controlled by opposition
        // returns true if so
        // creates a Set containing two values:
        if (this.rayAttacked(rank, file, byColour, rookDirs, new Set<PieceType>(["rook", "queen"]))) return true;
        // looks outward in each bishop/queen direction and checks if it can be taken by opposition
        // returns true if so
        // creates a Set containing two values:
        if (this.rayAttacked(rank, file, byColour, bishopDirs, new Set<PieceType>(["bishop", "queen"]))) return true;

        return false;
    }

    // checks if any given square has been attacked by a sliding piece (rook, bishop, queen)
    // along sliding piece directions
    private rayAttacked(
        rank: Rank,
        file: File,
        byColour: Colour,
        dirs: Array<[number, number]>,
        attackerTypes: ReadonlySet<PieceType> // a set of piece types that are allowed to attack:
        // {rook, queen} for straight rays
        // {bishop, queen} for diagonal rays
        // this function doesn't accidentally mutate the set during refactors
    ): boolean {
        // The outer loop — one ray at a time, tracing outwards from the square
        for (const [dr, df] of dirs) {
            // start one square away from target square (pieces don't attack their own square!)
            // atttacks originate from other squares
            let r = rank + dr;
            let f = file + df;

            while (r >= 0 && r <= 7 && f >= 0 && f <= 7) { // checks if out of bounds
                const p = this.getSquare(r as Rank, f as File).piece; // inspect current square

                if (p) {
                    // if piece belongs to attacking colour and its type is allowed on ray,
                // then square is attacked:
                    if (p.colour === byColour && attackerTypes.has(p.type)) return true;

                // OR any piece blocks the ray
                // (sliding pieces can't jump like bishops, for example)
                break; 
                
                }

                // otherwise, continue moving further along the ray
                r += dr;
                f += df;

            }
        }

        return false;
    }

    // clears both castling rights for the given colour
    private clearCastlingRights(colour: Colour): void {
        if (colour === "white") {
            this.castlingRights.whiteK = false;
            this.castlingRights.whiteQ = false;
        } else {
            this.castlingRights.blackK = false;
            this.castlingRights.blackQ = false;
        }
    }

    // disables one castling right for one colour
    private clearCastlingSide(colour: Colour, side: "K" | "Q"): void {
        if (colour === "white") {
            // white can no longer castle king-side:
            if (side === "K") this.castlingRights.whiteK = false;
            // white can no longer castle queen-side:
            else this.castlingRights.whiteQ = false;
        } else {
            // black can no longer castle king-side:
            if (side === "K") this.castlingRights.blackK = false;
            // black can no longer castle queen-side:
            else this.castlingRights.blackQ = false;
        }
    }
 
    private createEmptyBoard(): Square[][] { // private internal helper

        const board: Square[][] = []; //creates empty array that will become
            // full 2D board grid

        for (const rank of RANKS) { //outer loop, builds horizontal rows (ranks)
            const row: Square[] = [];

        for (const file of FILES) { //inner nested loop, builds vertical columns (files)
            row.push(new Square(rank, file, null)); // creates new Square instance
            }

        board.push(row); // add completed row to board
        }

    return board; // returns whole board
    }

}