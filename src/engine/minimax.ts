import type { ChessBoard } from "../board/ChessBoard.js";
import { evaluatePosition } from "./evaluatePosition.js";
import type { Move } from "../types/Move.js";
import type { Colour } from "../types/colour.js";

// The minimax function implements the minimax algorithm 
// with alpha-beta pruning to evaluate chess positions and determine the 
// best move for a given player. It recursively explores the game tree up 
// to a specified depth.

// Alpha: the best score the maximizing player can already guarantee
// Beta: the best score the minimizing player can already guarantee
export interface MinimaxOptions {
    alpha?: number;
    beta?: number;
}

// The MinimaxResult interface defines the structure of the result 
// returned by the minimax function. It includes the best move found 
// and its associated score:
export interface MinimaxResult {
    move: Move | null;
    score: number;
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

    if (depth <= 0 || legalMoves.length === 0 || board.getGameStatus().status !== "ongoing") {
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

    for (const move of legalMoves) {
        board.makeMove(move);

        const childScore = minimax(board, depth - 1, perspective, { alpha, beta }).score;

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

// The findBestMove function is a helper that calls minimax and 
// extracts the best move from the result:
export function findBestMove(
    board: ChessBoard,
    depth: number,
    perspective: Colour = board.getSideToMove()
): Move | null {
    return minimax(board, depth, perspective).move;
}

