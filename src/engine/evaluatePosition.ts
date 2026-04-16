import type { ChessBoard } from "../board/ChessBoard.js";
import { FILES, RANKS } from "../types/coords.js";
import type { Colour } from "../types/colour.js";
import type { PieceType } from "../pieces/Piece.js";
import { isDrawGameResult } from "../types/GameResult.js";

// The CHECKMATE_SCORE is a large positive value that represents a winning position for the perspective player.
// It means checkmate is treated as overwhelmingly more important than ordinary material gains or losses:
const CHECKMATE_SCORE = 100000;
// These values are based on common chess heuristics and can be adjusted for better performance.
// For example, pawns are often valued at 1 point, knights and bishops around 3 points, rooks 
// at 5 points, and queens at 9 points. These values are not official rules of chess. They're conventional 
// approximations people use because they're fast, intuitive, and good enough as a first evaluation layer.
// These values do not capture everything. A side can be materially ahead but still worse because of:
// - king danger
// - trapped pieces
// - poor pawn structure
// - checkmate threats
// - lack of mobility
// That's why material values are usually the starting point, not the whole evaluation.
const PIECE_VALUES: Record<PieceType, number> = {
    pawn: 100,
    knight: 320,
    bishop: 330,
    rook: 500,
    queen: 900,
    king: 0,
};
// The evaluatePosition function assesses the current state of the chess board and returns 
// a score from the perspective of the specified colour:
export function evaluatePosition(
    board: ChessBoard,
    perspective: Colour = board.getSideToMove()
): number {
    const gameStatus = board.getGameStatus();

    if (gameStatus.status === "checkmate") {
        return gameStatus.winner === perspective ? CHECKMATE_SCORE : -CHECKMATE_SCORE;
    }

    if (isDrawGameResult(gameStatus)) {
        return 0;
    }

    let whiteScore = 0;
    let blackScore = 0;

    for (const rank of RANKS) {
        for (const file of FILES) {
            const piece = board.getSquare(rank, file).piece;
            if (!piece) continue;

            const value = PIECE_VALUES[piece.type];
            if (piece.colour === "white") whiteScore += value;
            else blackScore += value;
        }
    }

    return perspective === "white"
        ? whiteScore - blackScore
        : blackScore - whiteScore;
}

export { CHECKMATE_SCORE, PIECE_VALUES };
