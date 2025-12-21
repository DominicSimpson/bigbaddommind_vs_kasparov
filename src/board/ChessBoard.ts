import { Square } from "./Square.js";
import { FILES, RANKS } from "./coords.js";
import type { File, Rank } from "../types.js"
import { Piece, PieceType } from "../pieces/Piece.js";


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

    private setupInitialPosition(): void {

        const bankRank: PieceType[] = [ // the row with the major pieces (not pawns!)
            "rook", // file index: 0
            "knight", // 1
            "bishop", // 2
            "queen", // 3
            "king", // 4
            "bishop", // 5
            "knight", // 6
            "rook" // 7
        ];

        for (let file = 0; file < 8; file++) {
            this.squares[1][file].piece = new Piece("pawn", "white"); // create all white pawns via loop
            this.squares[6][file].piece = new Piece("pawn", "black"); // create all black pawns via loop

            this.squares[0][file].piece = new Piece(bankRank[file], "white"); // white bank rank pieces
            this.squares[7][file].piece = new Piece(bankRank[file], "black"); // white bank rank pieces
        }
    }

    public getSquare(rank: Rank, file: File): Square {
        return this.squares[rank][file]
        // public method callable outside the class that returns Square
        // safe public way to access one square
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

    return board; // returns finished row
    }
}


