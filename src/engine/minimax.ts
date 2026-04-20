import type { ChessBoard } from "../board/ChessBoard.js";
import { evaluatePosition } from "./evaluatePosition.js";
import { PIECE_VALUES } from "./evaluatePosition.js";
import type { Move } from "../types/Move.js";
import type { Colour } from "../types/colour.js";
import type { PieceType } from "../pieces/Piece.js";
import { isTerminalGameResult } from "../types/GameResult.js";

// The minimax function implements the minimax algorithm 
// with alpha-beta pruning to evaluate chess positions and determine the 
// best move for a given player. It recursively explores the game tree up 
// to a specified depth.

// Alpha: the best score the maximizing player can already guarantee
// Beta: the best score the minimizing player can already guarantee
export interface MinimaxOptions {
    alpha?: number;
    beta?: number;
    orderMoves?: boolean;
}

// The MinimaxResult interface defines the structure of the result 
// returned by the minimax function. It includes the best move found 
// and its associated score:
export interface MinimaxResult {
    move: Move | null;
    score: number;
}

export interface ScoredMove {
    move: Move;
    score: number;
}

const PROMOTION_BONUS: Record<PieceType, number> = {
    pawn: 0,
    knight: 320,
    bishop: 330,
    rook: 500,
    queen: 900,
    king: 0,
};

// // Assesses which legal moves looks promising before the full minimax search explores them:
// // The actual position score still comes from evaluatePosition() at the minimax 
// leaf nodes, not from this heuristic.

// // The heuristic favours:
// Captures, especially winning a valuable piece with a cheaper piece
// Promotions, with queen promotion getting the biggest bonus
// Castling, with a small bonus
// Centralising moves, by rewarding moves toward the center squares
function scoreMoveHeuristically(board: ChessBoard, move: Move): number {
    const movingPiece = board.getSquare(move.fromRank, move.fromFile).piece;
    const targetPiece = board.getSquare(move.toRank, move.toFile).piece;

    const captureValue = targetPiece
        ? PIECE_VALUES[targetPiece.type] - (movingPiece ? PIECE_VALUES[movingPiece.type] / 10 : 0)
        : 0;
    const promotionBonus = move.promotion ? PROMOTION_BONUS[move.promotion] : 0;
    const castleBonus = move.castle ? 50 : 0;
    const centralisationBonus =
        (3.5 - Math.abs(3.5 - move.toRank)) + (3.5 - Math.abs(3.5 - move.toFile));

    return captureValue + promotionBonus + castleBonus + centralisationBonus;
}

function getOrderedMoves(
    board: ChessBoard,
    legalMoves: Move[],
    orderMoves: boolean
): Move[] {
    if (!orderMoves) return legalMoves;

    return [...legalMoves].sort(
        (a, b) => scoreMoveHeuristically(board, b) - scoreMoveHeuristically(board, a)
    );
}

// The findBestMove function is a helper that calls minimax and 
// extracts the best move from the result:
export function minimax(
    board: ChessBoard,
    depth: number,
    perspective: Colour = board.getSideToMove(),
    options: MinimaxOptions = {}
): MinimaxResult {
    const legalMoves = board.getAllLegalMoves();

    if (depth <= 0 || legalMoves.length === 0 || isTerminalGameResult(board.getGameStatus())) {
        return {
            move: null,
            score: evaluatePosition(board, perspective),
        };
    }

    // The maximizingPlayer variable determines whether the current player is 
    // the one for whom we are trying to find the best move (the perspective 
    // player):
    const maximizingPlayer = board.getSideToMove() === perspective;
    let bestMove: Move | null = null;
    let bestScore = maximizingPlayer ? -Infinity : Infinity;
    // If we're maximizing, begin with the worst possible low value:
    // -Infinity for negative infinity

    // If we're minimizing, begin with the worst possible high value:
    // Infinity for positive infinity

    // Infinity > 999999999 // true
    // typeof Infinity // "number"
    let alpha = options.alpha ?? -Infinity;
    let beta = options.beta ?? Infinity;

    const orderedMoves = getOrderedMoves(board, legalMoves, options.orderMoves ?? false);

    for (const move of orderedMoves) {
        board.makeMove(move);

        const childScore = minimax(board, depth - 1, perspective, {
            alpha,
            beta,
            orderMoves: options.orderMoves,
        }).score;

        board.undoMove();

        if (maximizingPlayer) {
            if (childScore > bestScore) {
                bestScore = childScore;
                bestMove = move;
            }

            alpha = Math.max(alpha, bestScore);
        } else {
            if (childScore < bestScore) {
                bestScore = childScore;
                bestMove = move;
            }

            beta = Math.min(beta, bestScore);
        }

        if (beta <= alpha) break;
    }

    return {
        move: bestMove,
        score: bestScore,
    };
}

export function scoreMoves(
    board: ChessBoard,
    depth: number,
    perspective: Colour = board.getSideToMove(),
    options: MinimaxOptions = {}
): ScoredMove[] {
    const legalMoves = board.getAllLegalMoves();
    if (legalMoves.length === 0 || isTerminalGameResult(board.getGameStatus())) {
        return [];
    }

    const maximizingPlayer = board.getSideToMove() === perspective;
    const orderedMoves = getOrderedMoves(board, legalMoves, options.orderMoves ?? false);
    const scoredMoves: ScoredMove[] = [];
    let alpha = options.alpha ?? -Infinity;
    let beta = options.beta ?? Infinity;

    for (const move of orderedMoves) {
        board.makeMove(move);

        const score = minimax(board, depth - 1, perspective, {
            alpha,
            beta,
            orderMoves: options.orderMoves,
        }).score;

        board.undoMove();
        scoredMoves.push({ move, score });

        if (maximizingPlayer) {
            alpha = Math.max(alpha, score);
        } else {
            beta = Math.min(beta, score);
        }
    }

    scoredMoves.sort((a, b) => maximizingPlayer ? b.score - a.score : a.score - b.score);
    return scoredMoves;
}

// The findBestMove function is a helper that calls minimax and 
// extracts the best move from the result:
export function findBestMove(
    board: ChessBoard,
    depth: number,
    perspective: Colour = board.getSideToMove(),
    options: MinimaxOptions = {}
): Move | null {
    return scoreMoves(board, depth, perspective, options)[0]?.move ?? null;
}
