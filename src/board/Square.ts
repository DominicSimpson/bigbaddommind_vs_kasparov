import { File, Rank } from "../types.js";
import { Piece } from "../pieces/Piece.js";

export class Square { // Square representation
    constructor(
        public file: File, // column A-H (left ↔ right)
        public rank: Rank, // Row 1-8 (bottom ↔ top)
    // Together, file and rank can name a square (e.g. D4)
        public piece: Piece | null = null // the chess piece currently sitting on a given square
    ) {}

    get isOccupied(): boolean { //square returns not null if occupied by a piece
        return this.piece !== null;
    }

    get isLight(): boolean { // 
        return (this.file + this.rank) % 2 === 0;
        // determines if square is light colour (even square) or odd sum (dark square) and
        // renders accordingly
        
    }

}
