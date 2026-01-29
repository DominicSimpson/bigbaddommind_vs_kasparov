import type { Move } from "../types/Move.js";
import type { ChessBoard } from "../board/ChessBoard.js";
import type { Rank, File } from "../types/coords.js";

export class LegalMoveFilter {
    public static getLegalMoves(board: ChessBoard, fromRank: Rank, fromFile: File): Move[] {
        const fromSq = board.getSquare(fromRank, fromFile);
        const piece = fromSq.piece;

        if (!piece) return [];
        if (piece.colour !== board.getSideToMove()) return []; // checks which side to move

        const moverColour = piece.colour;

        const pseudo = board.getPseudoLegalMoves(fromRank, fromFile);
        const legal: Move[] = []; // only the subset of moves that passes the king-safety test

        // iterates over pseudo-legal moves, i.e. by movement alone without checking if king is left in check
        for (const move of pseudo) {
            let moved = false;

            // for each attempted move, inspect board and undo move before continuing
            // while legality of move is checked (i.e. if king is in check):
            try {            
                board.makeMove(move); // temporarily apply candidate move to board
                moved = true; // records if makeMove() succeeded and mutated the board

            // After makeMove, sideToMove has flipped, so check to see if player
            // who has just moved has left their own king in check
            // Core legality test in chess; if it's true, move is illegal
                const leavesKingInCheck = board.isKingInCheck(moverColour);
            
                // if false (king is not in check), move is fully legal and can be added to move array
                if (!leavesKingInCheck) legal.push(move);
            } finally {
                if (moved) board.undoMove(); // add to undoMove record of moves
            }
        }

        return legal;
    }
}