import type { Move } from "../types/Move.js";
import type { ChessBoard } from "../board/ChessBoard.js";
import type { Rank, File } from "../types/coords.js";

export class LegalMoveFilter {
    public static getLegalMoves(board: ChessBoard, fromRank: Rank, fromFile: File): Move[] {
        const fromSq = board.getSquare(fromRank, fromFile);
        const piece = fromSq.piece;

        if (!piece) return [];
        if (piece.colour !== board.getSideToMove()) return [];

        const moverColour = piece.colour;

        const pseudo = board.getPseudoLegalMoves(fromRank, fromFile);
        const legal: Move[] = [];

        for (const move of pseudo) {
            let moved = false;

            try {            
                board.makeMove(move);
                moved = true;

            // After makeMove, sideToMove has flipped, so check the mover's colour
                const leavesKingInCheck = board.isKingInCheck(moverColour);
            
                if (!leavesKingInCheck) legal.push(move);
            } finally {
                if (moved) board.undoMove();
            }
        }

        return legal;
    }
}