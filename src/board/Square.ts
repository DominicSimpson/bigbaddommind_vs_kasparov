import { File, Rank } from "../types.js";
import { Piece } from "../pieces/Piece.js";

export class Square { // Square representation
    constructor(
        public file: File, // columns 0-7 internally (maps to a-h for display) (left ↔ right)
        public rank: Rank, // rows 0-7 internally (maps to rows 1-8 for display) (bottom ↔ top)
    // Together, file and rank can name a square (e.g. D4)
        public piece: Piece | null = null // the chess piece currently sitting on a given square
    ) {}

    get isOccupied(): boolean { //square returns not null if occupied by a piece
        return this.piece !== null;
    }

    get isLight(): boolean { // 
        return (this.file + this.rank) % 2 === 1;
        // determines if square is light or dark square and
        // renders accordingly; a1 is dark (as is customary with real boards), b1 light, etc.   
    }

    get coord(): string {
        return `${"abcdefgh"[this.file]}${this.rank + 1}`;
        // Converts internal zero-indexed (file, rank) coordinates (0, 7)   
        // into standard algebraic notation (a1–h8)
        // e.g. (file=0, rank=0) = a1
    }

}
