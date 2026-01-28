import type { Rank, File } from "./coords.js";

export interface Move {
    fromRank: Rank;
    fromFile: File;
    toRank: Rank;
    toFile: File;

    // question marks denote "optional" - this property may exist
    // but it doesn't have to; forcing these to exist on every move would be wrong
    promotion?: "queen" | "rook" | "bishop" | "knight"; // promotion is when a 
    // pawn manages to reach the other end of the board and is promoted to another piece
    // (usually a queen in my case, as is usual)
    castle?: "K" | "Q"; //castling (either king-side or queen-side)
    enPassant?: boolean; // special pawn capture that can happen only immediately
    // after a pawn makes a two-square advance from its starting rank
    // I can't remember ever doing this move in all my time playing chess, 
    // but it does exist!
      // optional convenience flag (optional)
    isCapture?: true;
}

