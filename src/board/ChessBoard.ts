import { Square } from "./Square.js";
import { FILES, RANKS } from "../types/coords.js";
import type { File, Rank } from "../types/coords.js";
import { Piece } from "../pieces/Piece.js";
import type { PieceType } from "../pieces/Piece.js";
import type { Move, PromotionPiece } from "../types/Move.js";
import type { Colour } from "../types/colour.js";
import type { CastlingRights } from "../types/CastlingRights.js";
import type { UndoRecord } from "../types/UndoRecord.js";
import { LegalMoveFilter } from "../move/LegalMoveFilter.js";
import type { GameResult } from "../types/GameResult.js";
import type { Delta } from "../types/delta.js";
import { 
    KING_DIRS, 
    KNIGHT_DIRS, 
    ROOK_DIRS,
    BISHOP_DIRS, 
    QUEEN_DIRS, 
    ROOK_ATTACKERS, 
    BISHOP_ATTACKERS,
    QUEEN_ATTACKERS
 } from "../constants/directions.js";


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
        this.bumpRepetition(this.getPositionKey());

        this.legalMoveFilter = new LegalMoveFilter(this); // initialises legal move filter with reference to this board
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
        const square = this.squareAt(rank, file);
        return new Square(square.rank, square.file, this.clonePiece(square.piece));
    }

    public getPieceAt(rank: Rank, file: File): Piece | null {
        return this.clonePiece(this.squareAt(rank, file).piece);
    }

    public getSideToMove(): Colour {
        return this.sideToMove;
    }

    public getAllLegalMoves(): Move[];
    public getAllLegalMoves(colour: Colour): Move[];
    public getAllLegalMoves(colour = this.sideToMove): Move[] {
        return this.legalMoveFilter.getAllLegalMoves(colour);
    }

    public getLegalMoves(): Move[];
    public getLegalMoves(fromRank: Rank, fromFile: File): Move[];
    public getLegalMoves(fromRank?: Rank, fromFile?: File): Move[] {
        if (fromRank === undefined || fromFile === undefined) {
            return this.getAllLegalMoves();
        }

        return this.legalMoveFilter.getLegalMoves(fromRank, fromFile);
    }

    public canUndo(): boolean {
        return this.history.length > 0;
    }

    public clone(): ChessBoard {
        const clonedBoard = new ChessBoard();

        clonedBoard.squares = this.squares.map(row =>
            row.map(square => new Square(
                square.rank,
                square.file,
                this.clonePiece(square.piece)
            ))
        );

        clonedBoard.sideToMove = this.sideToMove;
        clonedBoard.castlingRights = { ...this.castlingRights };
        clonedBoard.enPassantTarget = this.enPassantTarget ? { ...this.enPassantTarget } : null;
        clonedBoard.halfMoveClock = this.halfMoveClock;
        clonedBoard.fullMoveNumber = this.fullMoveNumber;
        clonedBoard.history = this.history.map(record => this.cloneUndoRecord(record));
        clonedBoard.repetitionCounts = new Map(this.repetitionCounts);

        return clonedBoard;
    }

    public cloneWithMove(move: Move, skipLegalityCheck = false): ChessBoard {
        const clonedBoard = this.clone();
        clonedBoard.makeMove(this.cloneMove(move), skipLegalityCheck);
        return clonedBoard;
    }

    public clearHistory(): void {
        this.history = [];
        this.repetitionCounts.clear();
        this.bumpRepetition(this.getPositionKey());
    }

    public canCastle(colour: Colour, side: "K" | "Q"): boolean { // 'prepares' castling rights
        if (colour === "white") return side === "K" ? this.castlingRights.whiteK : this.castlingRights.whiteQ;
        return side === "K" ? this.castlingRights.blackK : this.castlingRights.blackQ;
    }

    public isSquareAttackedBy(rank: Rank, file: File, byColour: Colour): boolean {
        return this.isSquareAttacked(this.squares, rank, file, byColour);
    }

    public isInCheck(colour: Colour): boolean {
        const enemy: Colour = colour === "white" ? "black" : "white";

        const kingsPosition = this.findKing(colour);
        if (!kingsPosition) return false;

        return this.isSquareAttacked(this.squares, kingsPosition.rank, kingsPosition.file, enemy);
    }

    public isCheckmate(colour: Colour): boolean {
        // Only the side whose turn it is can be checkmated:
        if (colour !== this.sideToMove) return false;
        // Checkmate = in check + no legal moves to get out of check
        return this.isInCheck(colour) && !this.legalMoveFilter.hasAnyLegalMoves(colour);
    }

    public isStalemate(colour: Colour): boolean {
        // Only the side whose turn it is can be stalemated:
        if (colour !== this.sideToMove) return false;
        // Stalemate = not in check + no legal moves:
        return !this.isInCheck(colour) && !this.legalMoveFilter.hasAnyLegalMoves(colour);
    }

    private squareAt(rank: Rank, file: File): Square {
        return this.squares[rank][file];
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

        type BishopInfo = {
            colour: Colour;
            squareColour: 0 | 1; // 0 for light squares, 1 for dark squares
        }

        let whiteKnights = 0;
        let blackKnights = 0;
        const whiteBishops: BishopInfo[] = [];
        const blackBishops: BishopInfo[] = [];

        // // Any pawn, rook, or queen means mate is still possible in principle,
        // so the position is not insufficient material.
        for (let rank = 0; rank < 8; rank++) {
            for (let file = 0; file < 8; file++) {
                const piece = this.squareAt(rank as Rank, file as File).piece;
                if (!piece) continue;
                if (piece.type === "king") continue; 

                if (piece.type === "pawn" ||
                    piece.type === "rook" ||
                    piece.type === "queen" 
                ) {
                    return false;
                }

                // minors
                if (piece.type === "knight") {
                    if (piece.colour === "white") whiteKnights++;
                    else blackKnights++;
                } 
                    // special handling for bishops
                    // unlike knights, bishops never change square colour during game, 
                    // so we can track the colour of the square they start on to determine if same-colour 
                    // bishop endgames are K+B vs K+B or K+B vs K:
                    if (piece.type === "bishop") {
                        const squareColour = (rank + file) % 2 as 0 | 1; // 0 for light squares, 1 for dark squares
                        const info: BishopInfo = {
                            colour: piece.colour,
                            squareColour,
                        };

                        if (piece.colour === "white") whiteBishops.push(info);
                        else blackBishops.push(info);
                    
                }
            }
        }

        const whiteMinorCount = whiteKnights + whiteBishops.length;
        const blackMinorCount = blackKnights + blackBishops.length;
        const totalMinorCount = whiteMinorCount + blackMinorCount;

            // -------------------------------------------------=
                // Piece	Letter in algebraic move notation (SAN):=
                                                                    
                // King	    K                                       =
                // Queen	Q                                       =
                // Rook	    R                                       =
                // Bishop	B                                       =
                // Knight	N (confusing!)                          =      
                // Pawn	[no letter]                                 =
                // --------------------------------------------------

        
        // // Not draw permutations:

        // K+NN vs K
        // K+B+N vs K
        // Any position with a pawn, rook, or queen
        // Any position where one side has enough material in principle to mate
        
        // // Draw permutations:

        // K vs K
        if (totalMinorCount === 0) return true;

        // K + single minor vs K (K+N vs K or K+B vs K):
        if (totalMinorCount === 1) return true;
        

        // // K + minor vs K + minor - with only one minor on each side, and no pawns/rooks/queens,
        // checkmate is impossible:
        // - K+N vs K+N
        // - K+B vs K+N
        // - K+B vs K+B
        if (whiteMinorCount === 1 && blackMinorCount === 1) return true;

        // K+Bs vs K+Bs where all bishops on the board live on the same square colour 
        // (i.e. all on light squares or all on dark squares):
        if (
            whiteKnights === 0 && 
            blackKnights === 0 &&
            whiteBishops.length + blackBishops.length > 0
        ) {
            const allBishops = [...whiteBishops, ...blackBishops];
            const firstSquareColour = allBishops[0].squareColour;

            const allSameSquareColour = allBishops.every(
                bishop => bishop.squareColour === firstSquareColour
            );

            if (allSameSquareColour) return true;
        }

        return false;
    }

    public getGameStatus(): GameResult {

        const side = this.getSideToMove();
        const inCheck = this.isInCheck(side);

        // no legal moves => either checkmate or stalemate:
        const hasMoves = this.legalMoveFilter.hasAnyLegalMoves(side);
        if (!hasMoves) {
            if (inCheck) {
                const winner: Colour = side === "white" ? "black" : "white";
                return { status: "checkmate", winner };
            }
            return { status: "stalemate" };
        }

        if (this.isDrawByFiftyMoveRule()) {
            return { status: "drawByFiftyMoveRule" };
        }

        if (this.isDrawByThreefoldRepetition()) {
            return { status: "drawByRepetition" };
        }

        if (this.isDrawByInsufficientMaterial()) {
            return { status: "drawByInsufficientMaterial" };
        }

        if (inCheck) {
            return { status: "check", sideInCheck: side };
        }

        return { status: "active" };
    }

    public getGameResult(): GameResult {
        return this.getGameStatus();
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
    public generatePseudoLegalMovesForFiltering(fromRank: Rank, fromFile: File): Move[] {
        return this.getPseudoLegalMoves(fromRank, fromFile);
    }

    private getPseudoLegalMoves(fromRank: Rank, fromFile: File): Move[] { // logic for piece movement
        const square = this.squareAt(fromRank, fromFile);
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
            
            // the default case should never happen because piece.type is 
            // strictly typed to only allow the above values;
            default: {
                // this is a type safety check: if we ever get here, it means there's a 
                // bug in our code where piece.type is not one of the expected values
                const _exhaustive: never = piece.type;
                return [];
            }
        }
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
    
    // dr = delta rank - change in rank (first number)
    // df = delta file - change in file (second number)

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

        const promotionRank = (piece.colour === "white" ? 7 : 0) as Rank; // rank on which pawn promotes

            // normal forward moves:
        const oneStepR = r + dir; // logic for if pawn moves one square up (white) / down (black)
            // forward moves:
        if (this.inBounds(oneStepR, f) && this.isEmpty(oneStepR, f)) { // checks if move is valid
            if (oneStepR === promotionRank) {
                this.pushPromotionMoves(moves, r, f, oneStepR as Rank, f, false);
            } else {
                this.pushIfOk(moves, r, f, oneStepR, f, piece.colour);

                const twoStepR = r + 2 * dir; // // logic for if pawn moves two squares up (white) / down (black)
                
                if (r === startRank && this.isEmpty(twoStepR, f)) { // checks if move is valid
                    this.pushIfOk(moves, r, f, twoStepR, f, piece.colour);
                }   
            }        
        }

        // // 2) normal diagonal captures ---------------

            // accounts for pawn being able to capture opponent piece north-west / north-east:
        for (const df of [-1, +1]) {
            const capR = r + dir;
            const capF = f + df;

            if (!this.inBounds(capR, capF)) continue; // checks that target square is on board
            if (!this.isEnemy(capR, capF, piece.colour)) continue; // checks that there is an enemy piece to capture

            if (capR === promotionRank) {
                this.pushPromotionMoves(moves, r, f, capR as Rank, capF as File, true);
            } else {
                // pushIfOk already checks enemy vs friendly and sets capture:true
                this.pushIfOk(moves, r, f, capR, capF, piece.colour);
            }
        }

        // // 3 ) en passant generation ---------------
        if (this.enPassantTarget) {
            const epRank = this.enPassantTarget.rank;
            const epFile = this.enPassantTarget.file;
            // en passant capture is only possible if the en passant target 
            // square is exactly one rank ahead of the pawn (in the direction it moves)
            if (epRank === r + dir && Math.abs(epFile - f) === 1) {
                // generate en passant moves only when it's fully legal
                const victimRank = (piece.colour === "white" ? epRank - 1 : epRank + 1) as Rank;
                const victimSq = this.squareAt(victimRank, epFile).piece; 
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
        return this.rayMoves(r, f, piece, ROOK_DIRS);
    }
   
    // knight movement

    private knightMoves(r: Rank, f: File, piece: Piece): Move[] {
        // r: the knights' current rank (0–7)
        // f: the knights' current file (0–7)
        const moves: Move[] = []; // creates empty array to store moves knight will make

        for (const [dr, df] of KNIGHT_DIRS) {
            this.pushIfOk(moves, r, f, r + dr, f + df, piece.colour);
            //destination rank = r + dr
            //destination file = f + df
        }
        return moves;
    }

    // bishop movement

    private bishopMoves(r: Rank, f: File, piece: Piece): Move[] {
        return this.rayMoves(r, f, piece, BISHOP_DIRS);
    }
    
    // queen movement

    private queenMoves(r: Rank, f: File, piece: Piece): Move[] {
        return this.rayMoves(r, f, piece, QUEEN_DIRS);
    }


    // king movement
    
    private kingMoves(r: Rank, f: File, piece: Piece): Move[] {
        // r: the kings' current rank (0–7)
        // f: the kings' current file (0–7)
        const moves: Move[] = []; // creates empty array to store moves king will make

        
        // Iterate over all delta-rank (dr) and delta-file (df) combinations
        // Normal king steps
        for (const [dr, df] of KING_DIRS) { // -1: one rank down; +1: one rank up
            this.pushIfOk(moves, r, f, r + dr, f + df, piece.colour) // computes candidate destination
            // after establishing that it is valid (i.e. not off board grid or if contains friendly piece)
        }

        // -- Castling (pseudo-legal structural checks + "through check/out of check" - checks are done in LegalMoveFilter)
        // Only consider castling from e-file (file 4) on home rank (white: 0, black: 7)
        // (Castling cannot take place if king has "wondered off", so to speak, from its original square, 
        // even if it later returns to that square.)
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
            const fSq = this.squareAt(homeRank, fFile); // fSq: f1 (white) or f8 (black)
            const gSq = this.squareAt(homeRank, gFile); // gSq: g1 or g8
            const rookSq = this.squareAt(homeRank, rookFile); // rookSq: h1 or h8
            
            // very that rook is really a rook of the same colour, on the correct rook square:
            const rookOk = 
                rookSq.piece !== null &&
                rookSq.piece.type === "rook" &&
                rookSq.piece.colour === piece.colour;
            
            // check there are no pieces between king and rook, i.e. inbetween squares are empty
            if (fSq.piece === null && gSq.piece === null && rookOk) {
                // emit a castling move (pseudo-legal)
                // still has to be 'verified' by LegalMoveFilter() and executed by makeMove()
                moves.push({ 
                    fromRank: r, 
                    fromFile: f, 
                    toRank: homeRank, 
                    toFile: gFile, 
                    castle: "K" });
                }
            }
        

            // Queen-side: e -> c, rook a -> d; squares b, c, and d must be empty
            if (this.canCastle(piece.colour, "Q")) {
                const bFile = 1 as File; // b
                const cFile = 2 as File; // c
                const dFile = 3 as File; // d
                const rookFile = 0 as File; // a

                const bSq = this.squareAt(homeRank, bFile);
                const cSq = this.squareAt(homeRank, cFile);
                const dSq = this.squareAt(homeRank, dFile);
                const rookSq = this.squareAt(homeRank, rookFile);

                const rookOk = 
                    rookSq.piece !== null &&
                    rookSq.piece.type === "rook" &&
                    rookSq.piece.colour === piece.colour;

                if (bSq.piece === null && cSq.piece === null && dSq.piece === null && rookOk) {
                    moves.push({ 
                        fromRank: r, 
                        fromFile: f, 
                        toRank: homeRank, 
                        toFile: cFile, 
                        castle: "Q" 
                    });
                } 
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

    // dr = delta rank - change in rank (first number)
    // df = delta file - change in file (second number)
    private rayMoves(r: Rank, f: File, piece: Piece, directions: readonly Delta[]): Move[] {
        // r: the piece's current rank (0–7)
        // f: the piece's current file (0–7)
        const moves: Move[] = []; // creates empty array to store moves pieces will make

        for (const[dr, df] of directions) { // Loops over each direction the piece can move in
            // directions is an array of (dr, df) direction offsets
            // Initializes the first square one step away from the starting square in the current direction:
            let rr = r + dr; // rr = the "ray cursor" - will keep moving outward until stopped
            let ff = f + df; // ff = ditto

            while(this.inBounds(rr, ff)) { // loop checks if piece can continue moving outward
                const tr = rr as Rank;
                const tf = ff as File;

                const target = this.squareAt(tr, tf).piece; // checks what's on current square

                if (target === null) { // confirms that square is empty, so piece can move here
                    moves.push({ fromRank: r, fromFile: f, toRank: tr, toFile: tf });
                } else {
                    if (target.colour !== piece.colour && target.type !== "king") { // confirms square is occupied by enemy
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

    public makeMove(move: Move, skipLegalityCheck = false): void { // returns void because it mutates board state rather than
            // producing a value
        const fromSquare = this.squareAt(move.fromRank, move.fromFile); // where the piece is moving from
        const toSquare = this.squareAt(move.toRank, move.toFile); // where the piece is moving to
        
        const movingPiece = fromSquare.piece; // takes piece currently on fromSquare

            // if a piece is not occupying a square
        if (!movingPiece) throw new Error("No piece on source square.");
        // enforces alternating turns
        if (!skipLegalityCheck && movingPiece.colour !== this.sideToMove) throw new Error("Not your turn.");

        const reachedLastRank =
            movingPiece.type === "pawn" &&
            ((movingPiece.colour === "white" && move.toRank === 7) ||
            (movingPiece.colour === "black" && move.toRank === 0));

        if (move.promotion && movingPiece.type !== "pawn") {
            throw new Error("Invalid promotion: only pawns can promote");
        }

        if (move.promotion && !reachedLastRank) {
            throw new Error("Invalid promotion: pawn did not reach last rank");
        }

        if (reachedLastRank && !move.promotion) {
            throw new Error("Pawn reached last rank without promotion choice");
        }
        
        if (!skipLegalityCheck) {
            const legalMoves = this.getLegalMoves(move.fromRank, move.fromFile); // generates legal moves for piece on fromSquare
            const matchedMove = legalMoves.find(candidate => this.matchesMoveRequest(candidate, move));
            if (!matchedMove) throw new Error("Illegal move.");
            // Canonicalise the move from the legal-move list so callers do not need
            // to provide engine-internal convenience flags such as castle/enPassant/isCapture.
            move = matchedMove;
        }
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
            positionKeyAfter: "", // FEN position key after makeMove() is applied

            rookFrom: null, // initial state of rook before it's used
            rookTo: null,
            rookPiece: null,

            promotedTo: null, // initial default state of promotion

        };

        
        // --- b) Capture discovery (no mutation yet except optional EP victim removal): ---------------------------------------
            // Handle captures that are NOT "toSq.piece" (i.e. en passant)
              
            // Compute en-passant victim square if needed:
        let enPassantVictimSquare: { rank: Rank, file: File } | null = null;
        // En passant capture is a special case because the captured piece is not on the destination square of the move:
        if (move.enPassant) {
            if (!this.enPassantTarget ||
                move.toRank !== this.enPassantTarget.rank ||
                move.toFile !== this.enPassantTarget.file
            ) {
                throw new Error("Invalid en passant: destination is not the current en passant target");
            }
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
            const capSquare = this.squareAt(capRank, capFile);

                // sanity check here:
            const victim = capSquare.piece;
            // victim must be an enemy pawn, otherwise move is invalid (e.g. if victim is
            // friendly piece, or if victim square is empty, or if victim is an enemy piece that is not a pawn)
            if (!victim || victim.type !=="pawn" || victim.colour === movingPiece.colour) {
                throw new Error("Invalid en passant: no enemy pawn to capture");
            }

            undo.capturedPiece = victim;
                // Stores where captured piece was removed from (not toSquare)
            undo.capturedSquare = { rank: capRank, file: capFile };
            enPassantVictimSquare = { rank: capRank, file: capFile };
        } else {
            if (toSquare.piece && toSquare.piece.colour === movingPiece.colour) {
                throw new Error("Invalid move: cannot capture your own piece");
            }
                // normal capture happens on the destination square (if any)
            undo.capturedPiece = toSquare.piece ?? null;
                // capturedSquare left as null, meaning "restore to toSquare" in undoMove()
                // (restore captured piece back onto the destination square)
        }


        // --- c) --- Validation (promotion + castling) before mutation --------------------------------------------

            // before rook moves:
        if (move.castle) {
            if (!this.canCastle(movingPiece.colour, move.castle)) {
                throw new Error("Invalid castling: castling rights not available");
            }

        if (movingPiece.type !== "king") {
            throw new Error("Invalid castling: only king can castle");
        }
        // Castling move must have correct from/to squares for the king:
        const homeRank = (movingPiece.colour === "white" ? 0 : 7) as Rank;
        const expectedToFile = (move.castle === "K" ? 6 : 2) as File;
        // checks that king is moving from e1/e8 to g1/g8 (king-side) or c1/c8 (queen-side):
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
            const rookFromSquare = this.squareAt(undo.rookFrom.rank, undo.rookFrom.file);

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
                const vm = this.squareAt(enPassantVictimSquare.rank, enPassantVictimSquare.file);
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
                const rookFromSquare = this.squareAt(undo.rookFrom.rank, undo.rookFrom.file);
                const rookToSquare   = this.squareAt(undo.rookTo.rank, undo.rookTo.file);       
                // sanity check before mutating rook squares:
                if (!undo.rookPiece) {
                    throw new Error("Invalid castling: rook snapshot missing");
                }

                rookFromSquare.piece = null;
                rookToSquare.piece   = undo.rookPiece;
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
            if (undo.sideToMoveBefore === "black") this.fullMoveNumber +=1;
            
            // toggle whose turn it is:
            this.sideToMove = this.sideToMove === "white" ? "black": "white";

            // repetition bookkeeping (after state is fully updated):
            const keyAfter = this.getPositionKey();
            undo.positionKeyAfter = keyAfter;
            this.bumpRepetition(keyAfter);
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

        const fromSquare = this.squareAt(move.fromRank, move.fromFile);
        const toSquare   = this.squareAt(move.toRank, move.toFile);

        // undo rook if it was moved:
        if (undo.rookFrom && undo.rookTo) {
            const rookFromSq = this.squareAt(undo.rookFrom.rank, undo.rookFrom.file);
            const rookToSq   = this.squareAt(undo.rookTo.rank, undo.rookTo.file);
            rookToSq.piece = null;
            rookFromSq.piece = undo.rookPiece ?? null;
        }

        // restore main piece:
        toSquare.piece = null;
        fromSquare.piece = undo.movedPiece;

        // restore captured piece:
        if (undo.capturedPiece) {
            if (undo.capturedSquare) {
                const captSq = this.squareAt(undo.capturedSquare.rank, undo.capturedSquare.file);
                captSq.piece = undo.capturedPiece;
            } else {
                toSquare.piece = undo.capturedPiece;
            }
        }
    }

    public undoMove(): void {
        if (!this.canUndo()) return;

        const undo = this.history.pop()!; // undoes last movement by player
        this.unbumpRepetition(undo.positionKeyAfter); // unbumps repetition count for position we're leaving
        const move = undo.move;

        // restore meta-state first
        this.sideToMove = undo.sideToMoveBefore;
        this.castlingRights = { ...undo.castlingRightsBefore };
        this.enPassantTarget = undo.enPassantTargetBefore ? { ...undo.enPassantTargetBefore } : null;
        this.halfMoveClock = undo.halfmoveClockBefore;
        this.fullMoveNumber = undo.fullmoveNumberBefore;

        // squares involved
        const fromSq = this.squareAt(move.fromRank, move.fromFile);
        const toSq = this.squareAt(move.toRank, move.toFile);

        // // a) Undo castling rook move (if castling has happpened)
        // (Do this before restoring king piece to avoid confusion, though either order works)
        if (undo.rookFrom && undo.rookTo) {
            const rookFromSq = this.squareAt(undo.rookFrom.rank, undo.rookFrom.file);
            const rookToSq = this.squareAt(undo.rookTo.rank, undo.rookTo.file);

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
                    const captSq = this.squareAt(undo.capturedSquare.rank, undo.capturedSquare.file);
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
        return this.squareAt(rank, file).coord;
    }

    // for parsing FEN input:
    private algebraicToSquare(s: string): {rank: Rank; file: File } {
        // RegEx validates that the input string is in correct algebraic format (e.g. "e4")
        if (!/^[a-h][1-8]$/.test(s)) {
            throw new Error(`Invalid square: ${s}`);
        }

        const file = (s.charCodeAt(0) - "a".charCodeAt(0)) as File; // converts file letter to number (0-7)
        const rank = (Number(s[1]) - 1) as Rank; // "1" => 0
        
        return { rank, file };
    }

    // This converts a Piece object to a FEN letter, which is used when 
    // generating FEN strings to represent the board position:
    private pieceToFenLetter(piece: Piece): string {
        const letter = 
            piece.type === "pawn" ? "p" :
            piece.type === "rook" ? "r" :
            piece.type === "knight" ? "n" :
            piece.type === "bishop" ? "b" :
            piece.type === "queen" ? "q" :
            "k";
        // Uppercase for white, lowercase for black:
        return piece.colour === "white" ? letter.toUpperCase() : letter;
    }

        // Converts a FEN letter to a Piece object, which is used 
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
        // Generates a FEN string representing the current board position, 
        // which can be used for saving, sharing, or position comparison:
    public toFEN(): string {
        // 1) piece placement:
        const ranks: string[] = [];
        // FEN starts from rank 8 (top) to rank 1 (bottom), which corresponds to internal ranks 7 to 0:
        for (let rank = 7; rank >= 0; rank--) {
            // For each rank, build a string that represents the pieces and empty squares:
            let empties = 0;
            // row string will accumulate the FEN characters for this rank:
            let row = "";
            // Loop through files a to h (0 to 7):
            for (let file = 0; file < 8; file++) {
                const piece = this.squareAt(rank as Rank, file as File).piece;
                // If there's no piece, increment empties count; if there is a piece, 
                // add the count of empties (if any) followed by the piece letter:
                if (!piece) {
                    empties++;
                } else {
                    if (empties > 0) {
                        row += String(empties);
                        empties = 0;
                    }
                    // Add the FEN letter for the piece:
                    row += this.pieceToFenLetter(piece);
                }
            }
            // After processing all files in the rank, if there are trailing empties, 
            // add that count to the row:
            if (empties > 0) row += String(empties);
            ranks.push(row);
        }
        // Join the ranks with "/" to form the piece placement part of the FEN:
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
            ? this.squareToAlgebraic(
                this.enPassantTarget.rank, 
                this.enPassantTarget.file
            )
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
        // FEN string consists of 6 fields separated by spaces:
        const parts = fen.trim().split(/\s+/);
        // Validate that we have exactly 6 fields:
        if (parts.length !== 6) 
            throw new Error(`FEN must have 6 fields, got ${parts.length}`);
        // Destructure the fields for clarity:
        const [piecePlacement, stm, castling, ep, halfMove, fullMove] = parts;
        // Build a temporary board
        const newSquares = this.createEmptyBoard();
        // Parse piece placement:
        const rows = piecePlacement.split("/");
        // FEN ranks go from 8 (top) to 1 (bottom), which corresponds to internal ranks 7 to 0:
        if (rows.length !== 8) throw new Error("FEN placement must have 8 ranks");
        // Loop over each FEN rank and fill the corresponding internal rank on the board:
        for (let fenRank = 0; fenRank < 8; fenRank++) {
            // fenRank goes from 0 to 7, where 0 is the top rank (rank 8 in FEN) 
            // and 7 is the bottom rank (rank 1 in FEN):
            const row = rows[fenRank];
            // File goes from 0 to 7 (a to h).
            // Initialise file:
            let file = 0;
            // internalRank is the rank index in our board array that corresponds to the current FEN rank:
            const internalRank = (7 - fenRank) as Rank;
            // Loop through each character in the FEN rank string:
            for (const char of row) {
                // If it's a digit, it represents that many empty squares, so we increment the file by that number:
                if (/[1-8]/.test(char)) {  
                    file += Number(char); // skip empty squares
                    if (file > 8) throw new Error("FEN row overflow"); // too many squares in this rank
                } else {
                    if (file >= 8) throw new Error("FEN row overflow"); 
                    // Otherwise, it should be a piece letter. We convert it to a Piece object and place it on the board:
                    newSquares[internalRank][file as File].piece = 
                        this.fenLetterToPiece(char);

                    file++;
                }
            }
            // After processing the row, file should be exactly 8 (0-7) if FEN is correct:
            if (file !== 8) throw new Error("FEN row does not sum to 8 files");
        }
        // At this point, we've parsed the piece placement into newSquares. 
        // Now we can validate the position and set the board state:
        for (let file = 0; file < 8; file++) {
            const rank1 = newSquares[0][file].piece;
            const rank8 = newSquares[7][file].piece;
            // FEN cannot have pawns on the first or eighth rank:
            if (rank1?.type === "pawn" || rank8?.type === "pawn") {
                throw new Error("FEN cannot contain a pawn on the first or eighth rank");
            }
        }

        let whiteKingSquare: { rank: Rank; file: File } | null = null;
        let blackKingSquare: { rank: Rank; file: File } | null = null;
        // Count kings and validate that there is exactly one of each colour:
        for (let rank = 0; rank < 8; rank++) {
            for (let file = 0; file < 8; file++) {
                // Check each square for a king and count them:
                const piece = newSquares[rank][file].piece;
                // If there's no piece, continue to next square:
                if (!piece) continue;

                if (piece.type === "king") {
                    if (piece.colour === "white") {
                        if (whiteKingSquare) {
                            throw new Error("FEN must contain exactly one white king and one black king");
                        } 
                        whiteKingSquare = { rank: rank as Rank, file: file as File };
                    } else {
                        if (blackKingSquare) {                             
                            throw new Error("FEN must contain exactly one white king and one black king");
                        }
                        blackKingSquare = { rank: rank as Rank, file: file as File };
                    }
                }
            }
        }

        // Side to move:
        if (stm !== "w" && stm !== "b") throw new Error(`Invalid side to move: ${stm}`);
        
        // Validate castling field with RegEx (must be combination of KQkq or "-"):
        if (!/^(?:K?Q?k?q?|-)$/.test(castling)) {
            throw new Error(`Invalid castling field: ${castling}`);
        }

        const nextSideToMove: Colour = stm === "w" ? "white" : "black";

        // Set castling rights based on presence of letters in the castling field:
        const nextCastlingRights: CastlingRights = {
            whiteK: castling.includes("K"),
            whiteQ: castling.includes("Q"),
            blackK: castling.includes("k"),
            blackQ: castling.includes("q"),
        };

        // Cross-check castling rights against actual board state;
        // // king and rook(s) must be in correct position for castling rights to be valid

        // // white king-side castling right (K) requires white king on e1 and rook on h1
        // // white queen-side castling right (Q) requires white king on e1 and rook on a1
        const e1 = newSquares[0][4].piece;
        const h1 = newSquares[0][7].piece;
        const a1 = newSquares[0][0].piece;

        // // black king-side castling right (k) requires black king on e8 and rook on h8
        // // black queen-side castling right (q) requires black king on e8 and rook on a8
        const e8 = newSquares[7][4].piece;
        const h8 = newSquares[7][7].piece;
        const a8 = newSquares[7][0].piece;

        // white king-side:
        if (nextCastlingRights.whiteK) {
            if (!e1 || e1.type !== "king" || e1.colour !== "white") {
                throw new Error("Invalid FEN: white king-side castling correct but king not on e1");
            }
            if (!h1 || h1.type !== "rook" || h1.colour !== "white") {
                throw new Error("Invalid FEN: white king-side castling correct but rook not on h1");
            }
        }
        // white queen-side:
        if (nextCastlingRights.whiteQ) {
            if (!e1 || e1.type !== "king" || e1.colour !== "white") {
                throw new Error("Invalid FEN: white queen-side castling correct but king not on e1");
            }
            if (!a1 || a1.type !== "rook" || a1.colour !== "white") {
                throw new Error("Invalid FEN: white queen-side castling correct but rook not on a1");
            }
        }

        // black king-side:
        if (nextCastlingRights.blackK) {
            if (!e8 || e8.type !== "king" || e8.colour !== "black") {
                throw new Error("Invalid FEN: black king-side castling correct but king not on e8");
            }
            if (!h8 || h8.type !== "rook" || h8.colour !== "black") {
                throw new Error("Invalid FEN: black king-side castling correct but rook not on h8");
            }
        }
        // black queen-side:
        if (nextCastlingRights.blackQ) {
            if (!e8 || e8.type !== "king" || e8.colour !== "black") {
                throw new Error("Invalid FEN: black queen-side castling correct but king not on e8");
            }
            if (!a8 || a8.type !== "rook" || a8.colour !== "black") {
                throw new Error("Invalid FEN: black queen-side castling correct but rook not on a8");
            }
        }

        // // En passant:
        let nextEnPassantTarget: { rank: Rank; file: File } | null = null;
        // This validates + normalises en-passant field, in so doing 
        // improving threefold repitition (part of "same position" definition:
        // same side to move + same castling rights + same en-passant capture availability).
        if (ep === "-") {
            nextEnPassantTarget = null;
        } else {
            const sq = this.algebraicToSquare(ep);

            // FEN en passant target must be on rank 3 or 6 (internal ranks 2 or 5)
            if (sq.rank !== 2 && sq.rank !== 5) {
                throw new Error(`Invalid en passant square in FEN: ${ep}`);
            }

            // Normalise EP: only keep it if an EP capture is auctually plausible.
            // Side to move is the side that could capture en passant; the EP 
            // target square is the square behind the pawn that just double-stepped:
            const capturer: Colour = nextSideToMove; 
            const victim: Colour = capturer === "white" ? "black" : "white";
            // The pawn that would be captured sits one rank behind the EP target square 
            // in the direction of the victim (relative to capturer's movement):
            const victimRank = (
                capturer === "white" ? sq.rank - 1 : sq.rank + 1
            ) as Rank;

            let plausible = false;

            // There must be a victim pawn on (victimRank, sq.file):
            if (this.inBounds(victimRank, sq.file)) {
                const v = newSquares[victimRank][sq.file].piece;
                // If there is a piece here, it must be a pawn of the victim's colour for EP to be plausible:
                if (v && v.type === "pawn" && v.colour === victim) {
                    // A capturer pawn of the correct colour must be in position to capture en passant
                    // i.e. on one of the adjacent files on the capturer's current rank:
                    for (const df of [-1, 1]) {
                        const fromFile = (sq.file + df);
                        const fromRank = victimRank; // capturer pawn is on same rank as / beside victim pawn
                        
                        if (!this.inBounds(fromRank, fromFile)) continue;
                        // Check if there's a capturer pawn of the correct colour on this square:
                        const p = newSquares[fromRank as Rank][fromFile as File].piece;
                        // If there is a piece here, it must be a pawn of the capturer's colour for EP to be plausible:
                        if (p && p.type === "pawn" && p.colour === capturer) {
                            plausible = true;
                            break;
                        }    
                    }
                }
            }
            // only set it if it's actually plausible, otherwise ignore EP target in FEN:
            nextEnPassantTarget = plausible ? sq : null;
        }

        // Clocks:
        const hm = Number(halfMove);
        const fm = Number(fullMove);
        // FEN requires these to be integers, and fullmove must be at least 1:
        if (!Number.isInteger(hm) || hm < 0) throw new Error(`Invalid halfmove clock: ${halfMove}`);
        if (!Number.isInteger(fm) || fm < 1) throw new Error(`Invalid fullmove clock: ${fullMove}`);

        // Validate that there is exactly one white king and one black king:
        if (!whiteKingSquare || !blackKingSquare) {
            throw new Error("FEN must contain exactly one white king and one black king");
        }
        
        if (this.areKingsAdjacent(whiteKingSquare, blackKingSquare)) {
            throw new Error("Invalid FEN: kings cannot be adjacent");
        }

        const whiteInCheck = this.isSquareAttacked(
            newSquares, 
            whiteKingSquare.rank, 
            whiteKingSquare.file, 
            "black"
        );

        const blackInCheck = this.isSquareAttacked(
            newSquares, 
            blackKingSquare.rank, 
            blackKingSquare.file, 
            "white"
        ); 
        
        if (whiteInCheck && blackInCheck) {
            throw new Error("Invalid FEN: both kings are in check");
        }

        if (nextSideToMove === "white" && blackInCheck) {
            throw new Error("Invalid FEN: black cannot be in check when it is white to move");
        }

        if (nextSideToMove === "black" && whiteInCheck) {
            throw new Error("Invalid FEN: white cannot be in check when it is black to move");
        }
        
        this.squares = newSquares;
        this.sideToMove = nextSideToMove;
        this.castlingRights = nextCastlingRights;
        this.enPassantTarget = nextEnPassantTarget;
        this.halfMoveClock = hm;
        this.fullMoveNumber = fm;

        // Reset history + repetition to match new position:
        this.clearHistory();

    }

    // Following two methods maintain a counter (positive or negative)
    // of how many times each position has occurred in the game history, 
    // which allows for efficient threefold repetition detection:
    private bumpRepetition(key: string): void { // increases count if position has occured before, 
    // or initializes to 1 if it's the first time we see this position
        this.repetitionCounts.set(
            key, 
            (this.repetitionCounts.get(key) ?? 0) + 1);
    }
    // decreases count for leaving position, and deletes it if count reaches 0 (never seen again in history):
    private unbumpRepetition(key: string): void {
        const next = (this.repetitionCounts.get(key) ?? 0) - 1; // decrease count after undoing a move
        // if count reaches 0, delete key from the map to 
        // save memory and indicate that this position is no longer in the history at all:
        if (next <= 0) {
            this.repetitionCounts.delete(key);
        } else {
            this.repetitionCounts.set(key, next);
        }
    }

    // -------------------------

        // Other helpers

    // -------------------------

    // Helper that can read from any supplied board, then thread that board through the attack functions:
    private getSquareFrom(
        squares: Square[][], 
        rank: Rank, 
        file: File
    ): Square {
        return squares[rank][file];
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
        // If in bounds, safely cast to Rank/File types:
        const tr = toRank as Rank;
        const tf = toFile as File;

        const target = this.squareAt(tr, tf).piece;
        
        if (target === null) {
            moves.push({ fromRank, fromFile, toRank: tr, toFile: tf });
        } else if (target.colour !== colour && target.type !== "king") { // general capture logic if there is and it's an enemy piece
            moves.push({ fromRank, fromFile, toRank: tr, toFile: tf, isCapture: true });
            }
    }

    private inBounds(r: number, f: number): boolean { // Abbreviations for rank and file
        return r >= 0 && r < 8 && f >= 0 && f < 8; // checks if is in bounds of chessboard
    }

    private isEmpty(r: number, f: number): boolean { // checks if square is empty
        if (!this.inBounds(r, f)) return false;
        return this.squareAt(r as Rank, f as File).piece === null;
    }

    // checks if square is occuped by enemy piece
    private isEnemy(r: number, f: number, colour: Piece["colour"]): boolean {
        if (!this.inBounds(r, f)) return false;
        const p = this.squareAt(r as Rank, f as File).piece;
        return p !== null && p.colour !== colour;
    }

    // -------------------------

        // Find the King

    // -------------------------


    // Finds the King on whatever board is provided, not necessarily the current game board:
    private findKingOnBoard(
        squares: Square[][], 
        colour: Colour
    ): { rank: Rank; file: File } | null {  
        for (let rank = 0; rank < 8; rank++) {
            for (let file = 0; file < 8; file++) {
                const piece = squares[rank][file].piece;
                if (piece !== null && piece?.type === "king" && piece.colour === colour) {
                    return { rank: rank as Rank, file: file as File };
                }
            }
        }
      
        return null;
    }

    // Locates where King is on real game board for each colour:
    private findKing(colour: Colour): { rank: Rank; file: File } | null {
        return this.findKingOnBoard(this.squares, colour);    
    }

    // // Checks if kings are adjacent (i.e. on squares next to each other, including diagonally), 
    // which is illegal in chess and therefore indicates an invalid position:
    private areKingsAdjacent(
        whiteKing: { rank: Rank; file: File },
        blackKing: { rank: Rank; file: File }
    ): boolean {
        return (
            Math.abs(whiteKing.rank - blackKing.rank) <= 1 &&
            Math.abs(whiteKing.file - blackKing.file) <= 1
        );
    }

    private sameMove(a: Move, b: Move): boolean {
        // // Two moves are considered the same if they have the same from/to squares, 
        // promotion piece (if any), castling type (if any), and capture/en passant flags. 
        // This is used for move repetition detection, where we want to know if the same move 
        // has been played before, regardless of the position it was played in:
        return (
            a.fromRank === b.fromRank &&
            a.fromFile === b.fromFile &&
            a.toRank === b.toRank &&
            a.toFile === b.toFile &&
            a.promotion === b.promotion &&
            a.castle === b.castle &&
            !!a.isCapture === !!b.isCapture &&
            !!a.enPassant === !!b.enPassant
        );
    }

    private matchesMoveRequest(candidate: Move, requested: Move): boolean {
        return (
            candidate.fromRank === requested.fromRank &&
            candidate.fromFile === requested.fromFile &&
            candidate.toRank === requested.toRank &&
            candidate.toFile === requested.toFile &&
            candidate.promotion === requested.promotion
        );
    }

    private clonePiece(piece: Piece | null): Piece | null {
        return piece ? new Piece(piece.type, piece.colour) : null;
    }

    private cloneMove(move: Move): Move {
        return { ...move };
    }

    private cloneUndoRecord(record: UndoRecord): UndoRecord {
        return {
            move: this.cloneMove(record.move),
            movedPiece: new Piece(record.movedPiece.type, record.movedPiece.colour),
            capturedPiece: this.clonePiece(record.capturedPiece),
            capturedSquare: record.capturedSquare ? { ...record.capturedSquare } : null,
            sideToMoveBefore: record.sideToMoveBefore,
            castlingRightsBefore: { ...record.castlingRightsBefore },
            enPassantTargetBefore: record.enPassantTargetBefore ? { ...record.enPassantTargetBefore } : null,
            halfmoveClockBefore: record.halfmoveClockBefore,
            fullmoveNumberBefore: record.fullmoveNumberBefore,
            positionKeyBefore: record.positionKeyBefore,
            positionKeyAfter: record.positionKeyAfter,
            rookFrom: record.rookFrom ? { ...record.rookFrom } : null,
            rookTo: record.rookTo ? { ...record.rookTo } : null,
            rookPiece: this.clonePiece(record.rookPiece),
            promotedTo: record.promotedTo,
        };
    }


    // ------------------------------------------------------------------------------

        // Is attacked by... 

    // ------------------------------------------------------------------------------ 
    
    private isSquareAttacked(
        squares: Square[][], 
        rank: Rank, 
        file: File, 
        byColour: Colour
    ): boolean {
        // 1. Pawn attacks
        if (this.isAttackedByPawn(squares, rank, file, byColour)) return true;

        // 2. Knight attacks
        if (this.isAttackedByKnight(squares, rank, file, byColour)) return true;

        // 3. King attacks (adjacent squares)
        if (this.isAttackedByKing(squares, rank, file, byColour)) return true;

        // 4. Sliding pieces (rook/bishop/queen rays) attack
        if (this.isAttackedBySlidingPieces(squares, rank, file, byColour)) return true;

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

    // dr = delta rank - change in rank (first number)                              =   
    // df = delta file - change in file (second number)                             =

    // ------------------------------------------------------------------------------

    // checks if any square has been attacked by a pawn
    private isAttackedByPawn(
        squares: Square[][], 
        rank: Rank, 
        file: File, 
        byColour: Colour
    ): boolean {
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
            const p = this.getSquareFrom(squares, pawnRank as Rank, leftFile as File).piece;
            if (p !== null && p.colour === byColour && p.type === "pawn") return true;
        }

        const rightFile = file + 1; // pawn takes opponent piece north-east direction
        if (rightFile <= 7) {
            const p = this.getSquareFrom(squares, pawnRank as Rank, rightFile as File).piece;
            if (p !== null && p.colour === byColour && p.type === "pawn") return true;
        }

        return false;
    }

    // checks if any square has been attacked by a knight
    private isAttackedByKnight(
        squares: Square[][], 
        rank: Rank, 
        file: File, 
        byColour: Colour
    ): boolean {
        // r: the knights' current rank (0–7)
        // f: the knights' current file (0–7)

        for (const [dr, df] of KNIGHT_DIRS) { 
            const r = rank + dr;
            const f = file + df;
            //destination rank = r + dr
            //destination file = f + df
            if (r < 0 || r > 7 || f < 0 || f > 7) continue;

            const p = this.getSquareFrom(squares, r as Rank, f as File).piece;

            if (p !== null && p.colour === byColour && p.type === "knight") return true;
        }

        return false;
    }

    // checks if any square has been attacked by a king
    private isAttackedByKing(
        squares: Square[][], 
        rank: Rank, 
        file: File, 
        byColour: Colour
    ): boolean {
        // r: the kings' current rank (0–7)
        // f: the kings' current file (0–7)

        for (const [dr, df] of KING_DIRS) { // -1: one rank down; +1: one rank up
 
            const r = rank + dr;
            const f = file + df;
            
            if (!this.inBounds(r, f)) continue; // checks if out of bounds

            const p = this.getSquareFrom(squares, r as Rank, f as File).piece;
            if (p !== null && p.colour === byColour && p.type === "king") return true;
        
        }
        
        return false;
    }

    private isAttackedBySlidingPieces(
        squares: Square[][], 
        rank: Rank, 
        file: File, 
        byColour: Colour
    ): boolean {
        // sliding pieces: rooks (straight lines), bishops (diagonals), queens (both)

        // looks outward in each rook/queen direction and checks if it can be attacked/controlled by opposition
        // returns true if so
        // creates a Set containing two values:
        if (this.rayAttacked(
            squares, 
            rank, 
            file, 
            byColour, 
            ROOK_DIRS,
            ROOK_ATTACKERS, 
        )) return true;
        // looks outward in each bishop/queen direction and checks if it can be taken by opposition
        // returns true if so
        // creates a Set containing two values:
        if (this.rayAttacked(
            squares, 
            rank, 
            file, 
            byColour, 
            BISHOP_DIRS,
            BISHOP_ATTACKERS, 
        )) return true;
        // looks outward in each queen direction and checks if it can be taken by opposition
        // returns true if so
        // creates a Set containing two values:
        if (this.rayAttacked(
            squares, 
            rank, 
            file, 
            byColour, 
            QUEEN_DIRS,
            QUEEN_ATTACKERS,
        )) return true;

        return false;
    }

    // checks if any given square has been attacked by a sliding piece (rook, bishop, queen)
    // along sliding piece directions
    private rayAttacked(
        squares: Square[][],
        rank: Rank,
        file: File,
        byColour: Colour,
        dirs: readonly Delta[],
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

            while (this.inBounds(r, f)) { // checks if out of bounds
                const p = squares[r][f].piece; // inspect current square

                if (p !== null) {
                    // if piece belongs to attacking colour and its type is allowed on ray,
                // then square is attacked:
                    if (p.colour === byColour && attackerTypes.has(p.type)) {
                        return true;
                    }
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

     // -------------------------

        // Promotion helpers

    //  -------------------------
    
    private pushPromotionMoves(
        moves: Move[],
        fromRank: Rank,
        fromFile: File,
        toRank: Rank,
        toFile: File,
        isCapture: boolean
    ): void {
        const promotionPieces: PromotionPiece[] = [
            "queen", 
            "rook", 
            "bishop", 
            "knight"
        ];

        for (const promotion of promotionPieces) {
            moves.push({
                fromRank,
                fromFile,
                toRank,
                toFile,
                promotion,
                ...(isCapture ? { isCapture: true } : {}) // only include isCapture flag if it's a capture move
            })
        }
    }

    // -------------------------

        // Castling helpers

    // -------------------------

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

 
    // -------------------------

        // Create empty board

    //  -------------------------
 
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
