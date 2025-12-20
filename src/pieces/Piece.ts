import { Colour } from "../types.js";

export type PieceType = 
    | "pawn"
    | "rook"
    | "knight"
    | "bishop"
    | "queen"
    | "king"

export class Piece {
    constructor(
        public type: PieceType,
        public colour: Colour
    ) {}
}
