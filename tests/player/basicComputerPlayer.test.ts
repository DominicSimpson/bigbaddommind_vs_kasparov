import { describe, expect, it } from "vitest";
import { ChessBoard } from "../../src/board/ChessBoard.js";
import { BasicComputerPlayer } from "../../src/player/BasicComputerPlayer.js";
import { createBoard } from "../board/utils/boardTestUtils.js";
import { getMove } from "../move/utils/moveTestUtils.js";

describe("BasicComputerPlayer", () => {
    it("chooses a legal move for the current side to move", () => {
        const board = new ChessBoard();
        const player = new BasicComputerPlayer({ randomFn: () => 0 });

        const move = player.chooseMove(board);

        expect(move).not.toBeNull();
        expect(board.getAllLegalMoves()).toContainEqual(move!);
    });

    it("prefers captures over quiet moves", () => {
        const board = createBoard("7k/3r4/8/8/8/8/8/3QK3 w - - 0 1");
        const player = new BasicComputerPlayer({ randomFn: () => 0 });

        const move = player.chooseMove(board);
        const capture = getMove(board, "d1", "d7", { isCapture: true });

        expect(capture).not.toBeNull();
        expect(move).toEqual(capture);
    });

    it("prefers checking moves when no capture is available", () => {
        const board = createBoard("6k1/8/8/8/8/8/4Q3/4K3 w - - 0 1");
        const player = new BasicComputerPlayer({ randomFn: () => 0 });

        const move = player.chooseMove(board);

        expect(move).not.toBeNull();

        const afterMove = board.cloneWithMove(move!);
        expect(afterMove.isInCheck("black")).toBe(true);
    });

    it("avoids hanging major pieces for small gains when a safe move exists", () => {
        const board = createBoard("3r3k/3p4/8/8/8/8/8/3QK3 w - - 0 1");
        const player = new BasicComputerPlayer({ randomFn: () => 0 });

        const move = player.chooseMove(board);
        const hangingCapture = getMove(board, "d1", "d7", { isCapture: true });

        expect(hangingCapture).not.toBeNull();
        expect(move).not.toEqual(hangingCapture);
    });

    it("plays a move on the board and returns it", () => {
        const board = createBoard("4k3/8/8/8/8/8/4P3/4K3 w - - 0 1");
        const player = new BasicComputerPlayer({ randomFn: () => 0 });

        const move = player.playMove(board);

        expect(move).not.toBeNull();
        expect(board.getSquare(move!.fromRank, move!.fromFile).piece).toBeNull();
        expect(board.getSquare(move!.toRank, move!.toFile).piece?.colour).toBe("white");
        expect(board.getSideToMove()).toBe("black");
    });

    it("returns null when the requested side has no legal moves", () => {
        const board = createBoard("7k/6Q1/6K1/8/8/8/8/8 b - - 0 1");
        const player = new BasicComputerPlayer({ randomFn: () => 0 });

        expect(player.chooseMove(board)).toBeNull();
        expect(player.playMove(board)).toBeNull();
    });

    it("throws if asked to play for a side that is not to move", () => {
        const board = new ChessBoard();
        const player = new BasicComputerPlayer({ randomFn: () => 0 });

        expect(() => player.chooseMove(board, "black")).toThrow(
            "BasicComputerPlayer can only choose for the side to move."
        );
        expect(() => player.playMove(board, "black")).toThrow(
            "BasicComputerPlayer can only play for the side to move."
        );
    });
});
