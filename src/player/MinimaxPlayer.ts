import type { ChessBoard } from "../board/ChessBoard.js";
import { findBestMove } from "../engine/minimax.js";
import type { Move } from "../types/Move.js";
import type { Colour } from "../types/colour.js";

// The MinimaxPlayer class represents a chess player that uses the minimax algorithm to choose its moves. 
// It has a specified search depth that determines how many moves ahead it will evaluate when 
// deciding on the best move to play. The class includes methods for choosing a move and playing a move 
// on the board, ensuring that it only acts for the side that is currently to move:
export class MinimaxPlayer {
    constructor(private readonly depth: number = 2) {
        if (!Number.isInteger(depth) || depth < 1) {
            throw new Error("MinimaxPlayer depth must be a positive integer.");
        }
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
