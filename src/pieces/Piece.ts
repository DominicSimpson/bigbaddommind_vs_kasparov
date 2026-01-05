import { Colour } from "../types/colour.js";

// schema:
export type PieceType = 
    | "pawn"
    | "rook"
    | "knight"
    | "bishop"
    | "queen"
    | "king"

export class Piece {
    constructor(
        public readonly type: PieceType, //make pieces and piece colours immutable with readonly
        public readonly colour: Colour
    ) {}
}
