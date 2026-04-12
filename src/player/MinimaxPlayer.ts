import type { ChessBoard } from "../board/ChessBoard.js";
import { findBestMove } from "../engine/minimax.js";
import type { Move } from "../types/Move.js";
import type { Colour } from "../types/colour.js";

export const MINIMAX_DIFFICULTY_DEPTHS = {
    easy: 1,
    medium: 2,
    hard: 3,
} as const;

export type MinimaxDifficulty = keyof typeof MINIMAX_DIFFICULTY_DEPTHS;

function isMinimaxDifficulty(value: unknown): value is MinimaxDifficulty {
    return typeof value === "string" && value in MINIMAX_DIFFICULTY_DEPTHS;
}

function resolveDepth(setting: MinimaxDifficulty | number): number {
    if (isMinimaxDifficulty(setting)) {
        return MINIMAX_DIFFICULTY_DEPTHS[setting];
    }

    if (!Number.isInteger(setting) || setting < 1) {
        throw new Error(
            'MinimaxPlayer difficulty must be "easy", "medium", or "hard", or a positive integer depth.'
        );
    }

    return setting;
}

// The MinimaxPlayer class represents a chess player that uses the minimax algorithm to choose its moves. 
// It has a specified search depth that determines how many moves ahead it will evaluate when 
// deciding on the best move to play. The class includes methods for choosing a move and playing a move 
// on the board, ensuring that it only acts for the side that is currently to move:
export class MinimaxPlayer {
    private readonly depth: number;

    public readonly difficulty: MinimaxDifficulty | null;

    constructor(difficultyOrDepth: MinimaxDifficulty | number = "medium") {
        this.difficulty = isMinimaxDifficulty(difficultyOrDepth) ? difficultyOrDepth : null;
        this.depth = resolveDepth(difficultyOrDepth);
    }

    public getSearchDepth(): number {
        return this.depth;
    }

    // The chooseMove method evaluates the current board position and returns the best move for the specified colour:
    public chooseMove(board: ChessBoard, colour: Colour = board.getSideToMove()): Move | null {
        if (colour !== board.getSideToMove()) {
            throw new Error("MinimaxPlayer can only choose for the side to move.");
        }

        return findBestMove(board, this.depth, colour);
    }

    // The playMove method uses chooseMove to select a move and then makes that move on the board. 
    // It also checks to ensure that the player is only trying to play for the side that is currently to move:
    public playMove(board: ChessBoard, colour: Colour = board.getSideToMove()): Move | null {
        if (colour !== board.getSideToMove()) {
            throw new Error("MinimaxPlayer can only play for the side to move.");
        }

        const move = this.chooseMove(board, colour);
        if (!move) return null;

        board.makeMove(move);
        return move;
    }
}
