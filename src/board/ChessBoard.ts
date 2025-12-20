import { Square } from "./Square.js";
import { FILES, RANKS } from "./coords.js";
import type { File, Rank } from "../types.js"

export class ChessBoard {
    private squares: Square[][]; //declares private property called squares
    //Type: 2D array of Square objects (8 rows x 8 columns)
    //private so that code outside the class cannot do board.squares

    constructor() {
        this.squares = this.createEmptyBoard(); //sets internal squares grid
        // to freshly generated empty 8x8 board
        // and calls helper method createEmptyBoard below
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


