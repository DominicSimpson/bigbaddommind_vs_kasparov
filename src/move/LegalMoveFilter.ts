import type { Move } from "../types/Move.js";
import type { Colour } from "../types/colour.js";
import type { ChessBoard } from "../board/ChessBoard.js";

export class LegalMoveFilter {
    static filter(
        board: ChessBoard,
        moves: Move[],
        sideToMove: Colour
    ): Move[] {
        const legalMoves: Move[] = [];

        for (const move of moves) {
            board.makeMove(move);

            const kingInCheck = board.isKingInCheck(sideToMove);

            board.undoMove();

            if (!kingInCheck) {
                legalMoves.push(move);
            }
        }

        return legalMoves;
    }
}