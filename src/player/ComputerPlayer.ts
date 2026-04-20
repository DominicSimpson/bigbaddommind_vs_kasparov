import type { ChessBoard } from "../board/ChessBoard.js";
import type { Move } from "../types/Move.js";
import type { Colour } from "../types/colour.js";
import { MinimaxPlayer } from "./MinimaxPlayer.js";
import { RandomMovePlayer } from "./RandomMovePlayer.js";

export type ComputerDifficulty = "easy" | "medium" | "hard";

interface PlayerLike {
    chooseMove(board: ChessBoard, colour?: Colour): Move | null;
    playMove(board: ChessBoard, colour?: Colour): Move | null;
}

export interface ComputerPlayerOptions {
    randomFn?: () => number;
}

export class ComputerPlayer {
    public readonly difficulty: ComputerDifficulty;

    private readonly player: PlayerLike;

    constructor(difficulty: ComputerDifficulty = "medium", options: ComputerPlayerOptions = {}) {
        this.difficulty = difficulty;
        this.player = this.createPlayer(difficulty, options);
    }

    public chooseMove(board: ChessBoard, colour: Colour = board.getSideToMove()): Move | null {
        return this.player.chooseMove(board, colour);
    }

    public playMove(board: ChessBoard, colour: Colour = board.getSideToMove()): Move | null {
        return this.player.playMove(board, colour);
    }

    private createPlayer(
        difficulty: ComputerDifficulty,
        options: ComputerPlayerOptions
    ): PlayerLike {
        switch (difficulty) {
            case "easy":
                return new RandomMovePlayer(options.randomFn);
            case "medium":
                return new MinimaxPlayer("medium");
            case "hard":
                return new MinimaxPlayer("hard");
            default: {
                const exhaustiveCheck: never = difficulty;
                throw new Error(`Unsupported computer difficulty: ${exhaustiveCheck}`);
            }
        }
    }
}

export function createComputerPlayer(
    difficulty: ComputerDifficulty = "medium",
    options: ComputerPlayerOptions = {}
): ComputerPlayer {
    return new ComputerPlayer(difficulty, options);
}
