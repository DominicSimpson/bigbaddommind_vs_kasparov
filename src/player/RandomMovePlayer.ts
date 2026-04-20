import type { ChessBoard } from "../board/ChessBoard.js";
import type { Move } from "../types/Move.js";
import type { Colour } from "../types/colour.js";

// A simple player that selects a random legal move from the current position and plays it on the board:
export class RandomMovePlayer {
    constructor(private readonly randomFn: () => number = Math.random) {}

    public chooseMove(board: ChessBoard, colour: Colour = board.getSideToMove()): Move | null {
        if (colour !== board.getSideToMove()) {
            throw new Error("RandomMovePlayer can only choose for the side to move.");
        }

        const legalMoves = board.getAllLegalMoves(colour);
        if (legalMoves.length === 0) return null;

        const index = Math.floor(this.randomFn() * legalMoves.length);
        return legalMoves[Math.min(index, legalMoves.length - 1)];
    }

    public playMove(board: ChessBoard, colour: Colour = board.getSideToMove()): Move | null {
        if (colour !== board.getSideToMove()) {
            throw new Error("RandomMovePlayer can only play for the side to move.");
        }

        const move = this.chooseMove(board, colour);
        if (!move) return null;

        board.makeMove(move);
        return move;
    }
}
