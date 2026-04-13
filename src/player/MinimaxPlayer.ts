import type { ChessBoard } from "../board/ChessBoard.js";
import { findBestMove, scoreMoves } from "../engine/minimax.js";
import type { Move } from "../types/Move.js";
import type { Colour } from "../types/colour.js";

export const MINIMAX_DIFFICULTY_PROFILES = {
    easy: {
        depth: 1,
        orderMoves: false,
        mistakeChance: 0.35,
        mistakeCandidateCount: 3,
    },
    medium: {
        depth: 2,
        orderMoves: false,
        mistakeChance: 0,
        mistakeCandidateCount: 1,
    },
    hard: {
        depth: 4,
        orderMoves: true,
        mistakeChance: 0,
        mistakeCandidateCount: 1,
    },
} as const;

export const MINIMAX_DIFFICULTY_ALIASES = {
    beginner: "easy",
    intermediate: "medium",
    advanced: "hard",
} as const;

export const MINIMAX_DIFFICULTY_DEPTHS = {
    easy: MINIMAX_DIFFICULTY_PROFILES.easy.depth,
    medium: MINIMAX_DIFFICULTY_PROFILES.medium.depth,
    hard: MINIMAX_DIFFICULTY_PROFILES.hard.depth,
} as const;

export type CanonicalMinimaxDifficulty = keyof typeof MINIMAX_DIFFICULTY_PROFILES;
export type MinimaxDifficultyAlias = keyof typeof MINIMAX_DIFFICULTY_ALIASES;
export type MinimaxDifficulty = CanonicalMinimaxDifficulty | MinimaxDifficultyAlias;

interface MinimaxPlayerOptions {
    randomFn?: () => number;
}

function isMinimaxDifficulty(value: unknown): value is MinimaxDifficulty {
    return typeof value === "string" && (
        value in MINIMAX_DIFFICULTY_PROFILES ||
        value in MINIMAX_DIFFICULTY_ALIASES
    );
}

function toCanonicalDifficulty(difficulty: MinimaxDifficulty): CanonicalMinimaxDifficulty {
    if (difficulty in MINIMAX_DIFFICULTY_PROFILES) {
        return difficulty as CanonicalMinimaxDifficulty;
    }

    return MINIMAX_DIFFICULTY_ALIASES[difficulty as MinimaxDifficultyAlias];
}

function resolveDifficulty(setting: MinimaxDifficulty | number): CanonicalMinimaxDifficulty | null {
    if (isMinimaxDifficulty(setting)) {
        return toCanonicalDifficulty(setting);
    }

    return null;
}

function resolveDepth(setting: MinimaxDifficulty | number): number {
    const difficulty = resolveDifficulty(setting);
    if (difficulty) {
        return MINIMAX_DIFFICULTY_PROFILES[difficulty].depth;
    }

    if (!Number.isInteger(setting) || setting < 1) {
        throw new Error(
            'MinimaxPlayer difficulty must be "easy", "medium", "hard", "beginner", "intermediate", or "advanced", or a positive integer depth.'
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

    private readonly randomFn: () => number;

    public readonly difficulty: CanonicalMinimaxDifficulty | null;

    constructor(
        difficultyOrDepth: MinimaxDifficulty | number = "medium",
        options: MinimaxPlayerOptions = {}
    ) {
        this.difficulty = resolveDifficulty(difficultyOrDepth);
        this.depth = resolveDepth(difficultyOrDepth);
        this.randomFn = options.randomFn ?? Math.random;
    }

    public getSearchDepth(): number {
        return this.depth;
    }

    private chooseDifficultyMove(board: ChessBoard, colour: Colour): Move | null {
        if (!this.difficulty) {
            return findBestMove(board, this.depth, colour);
        }

        const profile = MINIMAX_DIFFICULTY_PROFILES[this.difficulty];
        const scoredMoves = scoreMoves(board, profile.depth, colour, {
            orderMoves: profile.orderMoves,
        });

        if (scoredMoves.length === 0) return null;

        const shouldBlunder =
            profile.mistakeChance > 0 && this.randomFn() < profile.mistakeChance;
        const candidateCount = shouldBlunder
            ? Math.min(profile.mistakeCandidateCount, scoredMoves.length)
            : 1;
        const candidateIndex = Math.min(
            Math.floor(this.randomFn() * candidateCount),
            candidateCount - 1
        );

        return scoredMoves[candidateIndex].move;
    }

    // The chooseMove method evaluates the current board position and returns the best move for the specified colour:
    public chooseMove(board: ChessBoard, colour: Colour = board.getSideToMove()): Move | null {
        if (colour !== board.getSideToMove()) {
            throw new Error("MinimaxPlayer can only choose for the side to move.");
        }

        return this.chooseDifficultyMove(board, colour);
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
