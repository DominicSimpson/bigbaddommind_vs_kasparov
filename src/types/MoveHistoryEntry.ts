import type { Piece } from "../pieces/Piece.js";
import type { Move, PromotionPiece } from "./Move.js";

export interface MoveHistoryEntry {
    move: Move;
    movedPiece: Piece;
    capturedPiece: Piece | null;
    promotionPiece: PromotionPiece | null;
    positionKey: string;
}
