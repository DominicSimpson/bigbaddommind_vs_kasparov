import type { ChessBoard } from "../board/ChessBoard.js";
import { findBestMove, scoreMoves } from "../engine/minimax.js";
import type { Move } from "../types/Move.js";
import type { Colour } from "../types/colour.js";

// Game difficulty levels:
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

// //The MinimaxPlayer class represents a chess player that uses the minimax algorithm 
// to choose its moves. Before the function below was introduced, the computer would always 
// have the same moves in the same positions, making it predictable and less challenging. 
// For example, its opening move would always be a2-a4 (if white) or a7-a5 (if black). 
// This is because legal moves were generated in fixed board order from a-file upward 
// based on the logic in src/move/LegalMoveFilter.ts. On the starting position, that meant 
// the engine saw the a-pawn's moves before most others. Second, the minimax player was taking 
// the first top-scoring move it found, with no tie-break randomness. Since several opening moves 
// evaluated equally, it kept choosing the same one. The pawn generator also listed the one-step 
// move before the two-step move in ChessBoard.ts, so fixed ordering had a big influence early on.
// By introducing a random element to move selection, the MinimaxPlayer can 
// occasionally make suboptimal moves, creating a more varied and engaging playing experience for human opponents.
// This randomness simulates human-like imperfections and makes the computer's play less deterministic, 
// enhancing the overall enjoyment of the game:
function pickRandomMove(moves: Move[], randomFn: () => number): Move | null {
    if (moves.length === 0) return null;

    const index = Math.min(
        Math.floor(randomFn() * moves.length),
        moves.length - 1
    );

    return moves[index];
}
// The isMinimaxDifficulty function checks if a given value is a valid 
// MinimaxDifficulty, which can be either a canonical difficulty (easy, medium, or hard) 
// or an alias:
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
// The resolveDifficulty function takes a MinimaxDifficulty or a number 
// and returns the corresponding canonical difficulty level if it's a valid 
// MinimaxDifficulty, or null if it's a number (indicating a custom depth) 
// or an invalid string:
function resolveDifficulty(setting: MinimaxDifficulty | number): CanonicalMinimaxDifficulty | null {
    if (isMinimaxDifficulty(setting)) {
        return toCanonicalDifficulty(setting);
    }

    return null;
}
// The resolveDepth function takes a MinimaxDifficulty or a number and 
// returns the corresponding search depth:
function resolveDepth(setting: MinimaxDifficulty | number): number {
    if (isMinimaxDifficulty(setting)) {
        return MINIMAX_DIFFICULTY_PROFILES[toCanonicalDifficulty(setting)].depth;
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

    // // If easy level decides to blunder, it randomly picks from the top few candidate moves.
    // If medium or hard levels find several moves with the same best score, it now randomly 
    // picks one of those equal-best moves instead of always taking the first (see comments
    // above about fixed move ordering in the engine and how that made the computer's play 
    // predictable, so randomness was introduced):
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

        if (shouldBlunder) {
            const candidateCount = Math.min(profile.mistakeCandidateCount, scoredMoves.length);
            return pickRandomMove(
                scoredMoves.slice(0, candidateCount).map(({ move }) => move),
                this.randomFn
            );
        }

        const bestScore = scoredMoves[0].score;
        const bestMoves = scoredMoves
            .filter(({ score }) => score === bestScore)
            .map(({ move }) => move);

        return pickRandomMove(bestMoves, this.randomFn);
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
