import type { Colour } from "./colour.js";

// Union of object shapes representing the three possible game states:
export type GameResult = 
    | { status: "ongoing" }
    | { status: "checkmate"; winner: Colour }
    | { status: "draw"; reason: "stalemate" | "threefold" | "fiftyMove" | "insufficientMaterial" }