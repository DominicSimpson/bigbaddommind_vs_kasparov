import type { Colour } from "./colour.js";

// Union of object shapes representing the possible game states:
export type GameResult = 
    | { status: "active" }
    | { status: "check"; sideInCheck: Colour }
    | { status: "checkmate"; winner: Colour }
    | { status: "stalemate" }
    | { status: "drawByRepetition" }
    | { status: "drawByFiftyMoveRule" }
    | { status: "drawByInsufficientMaterial" };

export function isTerminalGameResult(result: GameResult): boolean {
    return result.status !== "active" && result.status !== "check";
}

export function isDrawGameResult(result: GameResult): boolean {
    return (
        result.status === "stalemate" ||
        result.status === "drawByRepetition" ||
        result.status === "drawByFiftyMoveRule" ||
        result.status === "drawByInsufficientMaterial"
    );
}
