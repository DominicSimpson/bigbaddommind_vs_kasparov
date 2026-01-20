import { Square } from "./Square.js";
import { FILES, RANKS } from "../types/coords.js";
import type { File, Rank } from "../types/coords.js";
import { Piece, PieceType } from "../pieces/Piece.js";
import type { Move } from "../types/Move.js";
import type { Colour } from "../types/colour.js";
import type { CastlingRights } from "../types/CastlingRights.js";
import type { UndoRecord } from "../types/UndoRecord.js";



export class ChessBoard {

    // ───────────────────────────────
        // 1. Fields / state
    // ───────────────────────────────
    private squares: Square[][]; //declares private property called squares
    //Type: 2D array of Square objects (8 rows x 8 columns)
    //private so that code outside the class cannot do board.squares
    private history: UndoRecord[] = []; // see notes in UndoRecord.ts
    private undoStack: UndoRecord[] = [];


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

    public canUndo(): boolean {
        return this.history.length > 0;
    }

    public isKingInCheck(colour: Colour): boolean {
        const kingPos = this.findKing(colour); // the actual, current square position of each king
        if (!kingPos) {
            return false;
        }

        const attacker: Colour = colour === "white" ? "black": "white";
        return this.isSquareAttacked(kingsPos.rank, kingsPos.file, attacker);
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

        // if piece is white, white pawns move "positive" (up),
        // otherwise pawn is black and therefore moves "negative" (down)
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


        // accounts for pawn being able to capture opponent piece diagonally left / right up
        for (const df of [-1, +1]) {
            const capR = r + dir;
            const capF = f + df;
            if (this.isEnemy(capR, capF, piece.colour)) {
            // pushIfOk already checks enemy vs friendly and sets capture:true
                this.pushIfOk(moves, r, f, capR, capF, piece.colour);
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

    
        //snapshot before changes - UndoRecord
        const undo: UndoRecord = { // starts building the undo snapshot that will allow reverting later
            // This needs to happen before the board is touched
            move,
            movedPiece: piece, // the exact piece object that moved
            capturedPiece: toSquare.piece ?? null, // stores what was on the destination square before move,
            // if it is not null; otherwise use null
            sideToMoveBefore: this.sideToMove, // saves whose turn it was before move
            castlingRightsBefore: { ...this.castlingRights }, // copies castling rights object
            // spread operator is used to make shallow copy so that later mutations don't change saved snapshot
            enPassantTargetBefore: this.enPassantTarget // saves previous en passant target square
                ? { ...this.enPassantTarget } // as above, copies it to avoid shared references
                : null,
            halfmoveClockBefore: this.halfMoveClock, // read section of UndoRecord.ts for this
            fullmoveNumberBefore: this.fullMoveNumber // saves these two counters
        };

        this.enPassantTarget = null; // clear en passant target by default

        //move piece + capture
        fromSquare.piece = null; // original square that piece moved from is now unoccupied
        toSquare.piece = piece; // piece is now recorded as in new destination square

        //special move handling (promotion, castling, en passsant)
        if (piece.type === "pawn") { // en passant can only be done with pawns
            const dr = move.toRank - move.fromRank;
            if (dr === 2 || dr === -2) { // dr === 2: white; dr === -2: black
                // If it moved two squares, set en passant target;
                // pawn double-step creates a square 'behind it' that can be captured en passant.
                const midRank = (move.fromRank + move.toRank) / 2; //mid-rank is the rank inbetween from and to
                // that square becomes the en passant target:
                this.enPassantTarget = { rank: midRank as Rank, file: move.fromFile };
            }
        
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

        };
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