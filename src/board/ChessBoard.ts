import { Square } from "./Square.js";
import { FILES, RANKS } from "../types/coords.js";
import type { File, Rank } from "../types/coords.js";
import { Piece, PieceType } from "../pieces/Piece.js";
import type { Move } from "../types/Move.js";


export class ChessBoard {
    private squares: Square[][]; //declares private property called squares
    //Type: 2D array of Square objects (8 rows x 8 columns)
    //private so that code outside the class cannot do board.squares
    constructor() {
        this.squares = this.createEmptyBoard(); //sets internal squares grid
        // to freshly generated empty 8x8 board
        // and calls helper method createEmptyBoard below
        this.setupInitialPosition();
    }

    private placePiece(rank: Rank, file: File, piece: Piece): void {
        this.squares[rank][file].piece = piece; // Places piece on square
    }

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
    private setupInitialPosition(): void { 

        const backRank: PieceType[] = [ // the row with the major pieces (not pawns!)
            "rook", // file index: 0
            "knight", // 1
            "bishop", // 2
            "queen", // 3
            "king", // 4
            "bishop", // 5
            "knight", // 6
            "rook" // 7
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
    

    public getSquare(rank: Rank, file: File): Square {
        return this.squares[rank][file] // rank first, then file, as is normal
        // public method callable outside the class that returns Square
        // safe public way to access one square
    }

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

    private pushIfOk( // add a move to array if destination is valid
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
        } else if (target.colour !== colour) { // general capture logic
            moves.push({ fromRank, fromFile, toRank: tr, toFile: tf, capture: true });
            }
        }

    //------------------------------------------------------------------------------------------------

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
                        moves.push({ fromRank: r, fromFile: f, toRank: tr, toFile: tf, capture: true });
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


        // accounts for pawn being able to capture opponent piece diagonally left or right up
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

    // bishop movement

    private bishopMoves(r: Rank, f: File, piece: Piece): Move[] {
        return this.rayMoves(r, f, piece, [
            [+1, +1], // diagonal north-east
            [+1, -1], // diagonal north-west
            [-1, +1], // diagonal south-east
            [-1, -1]  // diagonal south-west
        ])
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


    //---------------------------------------------------------------------------------


    public movePiece(move: Move): void {
        const fromSquare = this.getSquare(move.fromRank, move.fromFile);
        const toSquare = this.getSquare(move.toRank, move.toFile);

        if (!fromSquare.piece) throw new Error("No piece on source square.");
        // if a piece is not occupying a square

        toSquare.piece = fromSquare.piece; // piece is now recorded as in new square
        fromSquare.piece = null; // original square that piece moved from is now unoccupied
    }

    private createEmptyBoard(): Square[][] { // private internal helper

        const board: Square[][] = []; //creates empty array that will become
            // full 2D board grid

        for (const rank of RANKS) { //outer loop, builds horizontal rows (ranks)
            const row: Square[] = [];

        for (const file of FILES) { //inner nested loop, builds vertical columns (files)
            row.push(new Square(file, rank, null)); // creates new Square instance
    }

        board.push(row); // add completed row to board
        }

    return board; // returns whole board
    }
}


