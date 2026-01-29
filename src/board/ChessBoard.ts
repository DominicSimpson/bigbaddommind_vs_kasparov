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



export class ChessBoard {

    // ───────────────────────────────
        // 1. Fields / state
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

    
    // ───────────────────────────────
        // 2. Constructor / setup
    // ───────────────────────────────

    constructor() {
        this.squares = this.createEmptyBoard(); //sets internal squares grid
        // to freshly generated empty 8x8 board
        // and calls helper method createEmptyBoard below
        this.setupInitialPosition();
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
        return LegalMoveFilter.getLegalMoves(this, fromRank, fromFile);
    }

    public canUndo(): boolean {
        return this.history.length > 0;
    }

    public isKingInCheck(colour: Colour): boolean {
        const kingPos = this.findKing(colour); // the actual, current square position of each king
        if (!kingPos) {
            return false;
        }

        const attacker: Colour = colour === "white" ? "black": "white";
        return this.isSquareAttacked(kingPos.rank, kingPos.file, attacker);
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
    

    public getPseudoLegalMoves(fromRank: Rank, fromFile: File): Move[] { // logic for piece movement
        const square = this.getSquare(fromRank, fromFile);
        const piece = square.piece;
        if (!piece) return [];

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
        
        // Starts an outer loop over delta rank (dr), i.e. vertical movement:
        for (let dr = -1; dr <= 1; dr++) { // -1: one rank down; +1: one rank up
        // Starts an inner nested loop over delta file (df), i.e. horizontal movement:
            for (let df = -1; df <= 1; df++) {
                if (dr === 0 && df === 0) continue; // (0,0): no move
                this.pushIfOk(moves, r, f, r + dr, f + df, piece.colour) // computes candidate destination
                // after establishing that it is valid (i.e. not off board grid or if contains friendly piece)
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
    private rayMoves(r: Rank, f: File, piece: Piece, directions: Array<[number, number]>): Move[] {
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
        // 5. Move execution (mutating)
    // ───────────────────────────────

    public makeMove(move: Move): void { // returns void because it mutates board state rather than
        // producing a value
        const fromSquare = this.getSquare(move.fromRank, move.fromFile); // where the piece is moving from
        const toSquare = this.getSquare(move.toRank, move.toFile); // where the piece is moving to

        const piece = fromSquare.piece; // takes piece currently on fromSquare

        // if a piece is not occupying a square
        if (!piece) throw new Error("No piece on source square.");
        // enforces alternating turns
        if (piece.colour !== this.sideToMove) throw new Error("Not your turn.");
    
    
    
        //snapshot before touching board
        const undo: UndoRecord = { // starts building the undo snapshot that will allow reverting later
            // This needs to happen before the board is touched
            move,
            movedPiece: piece, // the exact piece object that moved
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

            rookFrom: null, // initial state of rook before it's used
            rookTo: null,
            rookPiece: null,

            promotedTo: null, // initial default state of promotion

        };


        this.enPassantTarget = null; // clear en passant target by default
        // set it again only on pawn double-step

        
        // // a) Capture handling (normal vs en passant) ---------------------------------

        if (move.enPassant) {
            // Destination square is empty; captured pawn is behind it:
            if (toSquare.piece !== null) {
                throw new Error("Invalid en passant: target square is not empty");
            }
            const capRank = // calculates rank of pawn of being captured
                (piece.colour === "white" ? (move.toRank -1) : (move.toRank + 1)) as Rank;
                // as Rank is Typescript cast due to function expecting a Rank type

            // captured pawn is on the same file as the destination square
            // Example: e5 > d6 captures the pawn on d5 (file d, same as destination file d):
            const capFile = move.toFile;
            // Grabs Square object where captured pawn actually sits (e.g. d5):
            const capSquare = this.getSquare(capRank, capFile);

            // sanity check here:
            const victim = capSquare.piece;
            if (!victim || victim.type !=="pawn" || victim.colour === piece.colour) {
                throw new Error("Invalid en passant: no enemy pawn to capture");
            }

            undo.capturedPiece = victim;
            // Stores where captured piece was removed from (not toSquare)
            undo.capturedSquare = { rank: capRank, file: capFile };

            // remove the pawn being captured en passant
            capSquare.piece = null;

        } else {
            // normal capture happens on the destination square (if any)
            undo.capturedPiece = toSquare.piece ?? null;
            // capturedSquare left as null, meaning "restore to toSquare" in undoMove()
            // (restore captured piece back onto the destination square)
        }


        // // b) Move the main piece (including promotion) ---------------------------------

            //move piece + capture
        fromSquare.piece = null; // original square that piece moved from is now unoccupied

        const isPromotion = // calculates if move is a pawn promotion
            piece.type === "pawn" &&
            !!move.promotion && // !! converts move.promotion (in types/Move.ts) to strict boolean
            ((piece.colour === "white" && move.toRank === 7) || // white promotes on rank 7 (top)
                (piece.colour === "black" && move.toRank === 0)); // black promotes on rank 0 (bottom)

        if (isPromotion) {
            const promoted = new Piece(move.promotion!, piece.colour); // promoted piece is converted
            // via new Piece object
            // move.promotion! uses non-null assertion operator
            undo.promotedTo = promoted; // Stores the promoted piece in undo snapshot
            toSquare.piece = promoted; // Puts promoted piece on destination square
        } else {
            toSquare.piece = piece; // piece is not promotion, but now recorded as in new destination square
        }


        // // c) Castling ---------------------------------

        if (move.castle) {
            const homeRank = (piece.colour === "white" ? 0 : 7) as Rank;

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
            // The square that the rook moves to when castling (d1/f1/d8/f8):
            const rookToSquare = this.getSquare(undo.rookTo.rank, undo.rookTo.file);

            // Snapshots which rook is moving:
            // if for some reason the square the rook starts on is empty, store null instead of undefined
            // This mirrors what the king is already doing
            undo.rookPiece = rookFromSquare.piece ?? null;

            // Remove the rook from its original square:
            rookFromSquare.piece = null;
            // Place the rook onto its destination square:
            rookToSquare.piece = undo.rookPiece;

        }

        
        // // d) Set en passant target (pawn double-step) ---------------------------------

        const isA1 = (r: Rank, f: File) => r === 0 && f === 0;
        const isH1 = (r: Rank, f: File) => r === 0 && f === 7;
        const isA8 = (r: Rank, f: File) => r === 7 && f === 0;
        const isH8 = (r: Rank, f: File) => r === 7 && f === 7;

          // If king moved => lose both castling rights for that colour
        
        if (piece.type === "king") {
            if (piece.colour === "white") {
                this.castlingRights.whiteK = false;
                this.castlingRights.whiteQ = false;
            } else {
                this.castlingRights.blackK = false;
                this.castlingRights.blackQ = false;
            }
        }
            // Rook moved from its starting corner => lose castling rights for that side
        if (piece.type === "rook") {
            if (piece.colour === "white") {
                if (isH1(move.fromRank, move.fromFile)) this.castlingRights.whiteK = false;
                if (isA1(move.fromRank, move.fromFile)) this.castlingRights.whiteQ = false;
            } else {
                if (isH8(move.fromRank, move.fromFile)) this.castlingRights.blackK = false;
                if (isA8(move.fromRank, move.fromFile)) this.castlingRights.blackQ = false;
            }
        }

            // Rook captured on its starting corner => lose castling rights for that side
            // (En passant cannot capture a rook, so capturedSquare will be null here anyway.)
        if (undo.capturedPiece?.type === "rook") {
            const r = move.toRank;
            const f = move.toFile;

            if (undo.capturedPiece.colour === "white") {
                if (isH1(r, f)) this.castlingRights.whiteK = false;
                if (isA1(r, f)) this.castlingRights.whiteQ = false;
            } else {
                if (isH8(r, f)) this.castlingRights.blackK = false;
                if (isA8(r, f)) this.castlingRights.blackQ = false;
            }
        }


        // // e) Set en passant target (pawn double-step) ---------------------------------

        if (piece.type === "pawn") { // en passant can only be done with pawns
            const dr = move.toRank - move.fromRank;
            if (dr === 2 || dr === -2) { // dr === 2: white; dr === -2: black
                // If it moved two squares, set en passant target;
                // pawn double-step creates a square 'behind it' that can be captured en passant.
                const midRank = (move.fromRank + move.toRank) / 2; //mid-rank is the rank inbetween from and to
                // that square becomes the en passant target:
                this.enPassantTarget = { rank: midRank as Rank, file: move.fromFile };
            }
        }
        

        // // f) Clocks + turn toggle + push undo -----------------------------------------

            // halfmove clock: resets to 0 on pawn move or capture
        const isCapture = undo.capturedPiece !== null;
        const isPawnMove = piece.type === "pawn";
        this.halfMoveClock = (isPawnMove || isCapture) ? 0 : this.halfMoveClock + 1;
            // otherwise it increments by 1
            // This is used for the 50-move rule and for FEN.

            // fullmove number is complete and increments only after Black's move
        if (this.sideToMove === "black") this.fullMoveNumber +=1;
            
            // toggle whose turn it is
        this.sideToMove = this.sideToMove === "white" ? "black": "white";

            // record undo - saves the snapshot so undoMove() can pop it and reverse everything
            // commits move to the undo stack
        this.history.push(undo);
    }


    public undoMove(): void {
        if (!this.canUndo()) return;

        const undo = this.history.pop()!; // undoes last movement by player
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

    // ───────────────────────────────
        // 6. Low-level private helpers
    // ───────────────────────────────

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


    // --------------------------------------------------------------------- 

    // The following logic applies to all the following isAttackedBy helpers:
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