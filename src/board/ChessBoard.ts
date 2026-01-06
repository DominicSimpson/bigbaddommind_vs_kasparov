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
            this.placePiece(0, file, new Piece(backRank[file], "white")); // create white back rank pieces
            this.placePiece(7, file, new Piece(backRank[file], "black")); // create black back rank pieces
            }
        }
    

    public getSquare(rank: Rank, file: File): Square {
        return this.squares[rank][file] // rank first, then file, as is normal
        // public method callable outside the class that returns Square
        // safe public way to access one square
    }

    public getPseudoLegalMoves(fromRank: Rank, fromFile: File): Move[] {
        const square = this.getSquare(fromRank, fromFile);
        const piece = square.piece;
        if (!piece) return [];

        switch (piece.type) {
            case "pawn":    return []; // this.pawnMoves(fromRank, fromFile, piece);    
            case "knight":  return this.knightMoves(fromRank, fromFile, piece);
            case "bishop":  return [];
            case "rook":    return [];
            case "queen":   return [];
            case "king":    return [];
        }
    }

    private inBounds(r: number, f: number): boolean { // Abbreviations for rank and file
        return r >= 0 && r < 8 && f >= 0 && f < 8;
    }

    private isEmpty(r: number, f: number): boolean {
        if (!this.inBounds(r, f)) return false;
        return this.getSquare(r as Rank, f as File).piece === null;
    }

    private isEnemy(r: number, f: number, colour: Piece["colour"]): boolean {
        if (!this.inBounds(r, f)) return false;
        const p = this.getSquare(r as Rank, f as File).piece;
        return p !== null && p.colour !== colour;
    }

    private pushIfOk(
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
        } else if (target.colour !== colour) {
            moves.push({ fromRank, fromFile, toRank: tr, toFile: tf, capture: true });
            }
        }
    
    private knightMoves(r: Rank, f: File, piece: Piece): Move[] {
        // r: the knight's current rank (0–7)
        // f: the knight's current file (0–7)
        // piece: the actual Piece object (so we know its colour)
        const moves: Move[] = []; // creates empty array to store moves knight will make
        const jumps: Array<[number, number]> = [
        // A knight always moves in a 2 + 1 pattern, with exactly 8 permutations of movement, 
        // defined here, with the following logic:
        // Rank:
        // moving down the board - negative
        // moving up the board - positive
        // File:
        // moving right - positive
        // moving left - negative
            [-2, -1], [-2, +1], // two ranks down, one file left / two ranks down, one file right
            [-1, -2], [-1, +2],  // one rank down, two files left / one rank down, two files right
            [+1, -2], [+1, +2], // one rank up, two files left / one rank up, two files right  
            [+2, -1], [+2, +1] // two ranks up, one file left / two ranks up, one file right
        ];

        for (const [dr, df] of jumps) { // each pair of the above possible moves is:
            // dr = dela rank - change in rank (first number)
            // df = delta file - change in file (second number)
            this.pushIfOk(moves, r, f, r + dr, f + df, piece.colour);
            //destination rank = r + dr
            //destination file = f + df
        }
        return moves;
    }


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
            row.push(new Square(rank, file, null)); // creates new Square instance
    }

        board.push(row); // add completed row to board
        }

    return board; // returns whole board
    }
}


