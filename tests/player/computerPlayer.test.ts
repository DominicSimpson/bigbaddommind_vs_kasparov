import { describe, expect, it } from "vitest";
import { ChessBoard } from "../../src/board/ChessBoard.js";
import { ComputerPlayer, createComputerPlayer } from "../../src/player/ComputerPlayer.js";
import { findBestMove } from "../../src/engine/minimax.js";
import { createBoard, expectBoardUnchanged } from "../board/utils/boardTestUtils.js";

describe("ComputerPlayer", () => {
    it("defaults to medium difficulty", () => {
        const player = new ComputerPlayer();

        expect(player.difficulty).toBe("medium");
    });

    it("creates an easy player that behaves like a random opponent", () => {
        const board = new ChessBoard();
        const player = new ComputerPlayer("easy", { randomFn: () => 0 });

        const move = player.chooseMove(board);

        expect(move).not.toBeNull();
        expect(move).toEqual(board.getAllLegalMoves()[0]);
        expectBoardUnchanged(board, () => {
            player.chooseMove(board);
        });
    });

    it("creates a medium player that matches shallow minimax", () => {
        const board = createBoard("4k3/8/8/8/8/8/3q4/3RK3 w - - 0 1");
        const player = createComputerPlayer("medium");

        expect(player.chooseMove(board)).toEqual(findBestMove(board, 2, "white"));
    });

    it("creates a hard player that matches deeper minimax with move ordering", () => {
        const board = createBoard("4k3/8/8/8/8/8/3q4/3RK3 w - - 0 1");
        const player = createComputerPlayer("hard");

        expect(player.chooseMove(board)).toEqual(findBestMove(board, 4, "white", {
            orderMoves: true,
        }));
    });

    it("plays a legal move on the board", () => {
        const board = createBoard("4k3/8/8/8/8/8/4P3/4K3 w - - 0 1");
        const player = new ComputerPlayer("easy", { randomFn: () => 0 });

        const move = player.playMove(board);

        expect(move).not.toBeNull();
        expect(board.getSquare(move!.fromRank, move!.fromFile).piece).toBeNull();
        expect(board.getSquare(move!.toRank, move!.toFile).piece?.colour).toBe("white");
        expect(board.getSideToMove()).toBe("black");
    });

    it("returns null when there are no legal moves", () => {
        const board = createBoard("7k/6Q1/6K1/8/8/8/8/8 b - - 0 1");
        const player = createComputerPlayer("hard");

        expect(player.chooseMove(board)).toBeNull();
        expect(player.playMove(board)).toBeNull();
    });
});
