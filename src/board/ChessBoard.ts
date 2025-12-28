import { Square } from "./Square.js";
import { FILES, RANKS } from "./coords.js";
import type { File, Rank } from "../types.js"
import { Piece, PieceType } from "../pieces/Piece.js";

export interface Move {
    fromRank: Rank;
    fromFile: File;
    toRank: Rank;
    toFile: File;
}

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
            return this.squares[rank][file]
        // public method callable outside the class that returns Square
        // safe public way to access one square
        }

        public movePiece(move: Move): void {
            const fromSquare = this.getSquare(move.fromRank, move.fromFile);
            const toSquare = this.getSquare(move.toRank, move.toFile);

            if (!fromSquare.piece) throw new Error("No piece on source square.");

            toSquare.piece = fromSquare.piece;
            fromSquare.piece = null;
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


