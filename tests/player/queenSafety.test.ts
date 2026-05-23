import { describe, expect, it } from "vitest";
import { scoreMoves } from "../../src/engine/minimax.js";
import { MINIMAX_DIFFICULTY_PROFILES } from "../../src/player/MinimaxPlayer.js";
import {
    isOwnQueenAttacked,
    moveKeepsOwnQueenSafe,
    refineComputerMoveForQueenSafety,
} from "../../src/player/queenSafety.js";
import { createBoard } from "../board/utils/boardTestUtils.js";
import { getMove } from "../move/utils/moveTestUtils.js";

describe("queen safety refinement", () => {
    it("still allows the occasional easy-mode queen blunder", () => {
        const board = createBoard("3r3k/3p4/8/8/8/8/8/3QK3 w - - 0 1");
        const hangingQueenCapture = getMove(board, "d1", "d7", { isCapture: true });

        expect(hangingQueenCapture).not.toBeNull();
        expect(hangingQueenCapture).not.toBeUndefined();

        const refinedMove = refineComputerMoveForQueenSafety(
            board,
            "white",
            "easy",
            hangingQueenCapture ?? null,
            () => 0
        );

        expect(refinedMove).toEqual(hangingQueenCapture);
    });

    it("usually reroutes easy mode away from an immediately hangable queen move when safe moves exist", () => {
        const board = createBoard("3r3k/3p4/8/8/8/8/8/3QK3 w - - 0 1");
        const hangingQueenCapture = getMove(board, "d1", "d7", { isCapture: true });

        expect(hangingQueenCapture).not.toBeNull();
        expect(hangingQueenCapture).not.toBeUndefined();

        const refinedMove = refineComputerMoveForQueenSafety(
            board,
            "white",
            "easy",
            hangingQueenCapture ?? null,
            () => 0.99
        );

        expect(refinedMove).not.toBeNull();
        expect(refinedMove).not.toEqual(hangingQueenCapture);
        expect(moveKeepsOwnQueenSafe(board, refinedMove!, "white")).toBe(true);
        expect(isOwnQueenAttacked(board.cloneWithMove(refinedMove!), "white")).toBe(false);
    });

    it("keeps medium mode on the best queen-safe move under the same minimax scoring", () => {
        const board = createBoard("3r3k/3p4/8/8/8/8/8/3QK3 w - - 0 1");
        const hangingQueenCapture = getMove(board, "d1", "d7", { isCapture: true });

        expect(hangingQueenCapture).not.toBeNull();
        expect(hangingQueenCapture).not.toBeUndefined();

        const refinedMove = refineComputerMoveForQueenSafety(
            board,
            "white",
            "medium",
            hangingQueenCapture ?? null,
            () => 0
        );

        const profile = MINIMAX_DIFFICULTY_PROFILES.medium;
        const scoredSafeMoves = scoreMoves(board, profile.depth, "white", {
            orderMoves: profile.orderMoves,
        }).filter(({ move }) => moveKeepsOwnQueenSafe(board, move, "white"));

        expect(refinedMove).not.toBeNull();
        expect(refinedMove).not.toEqual(hangingQueenCapture);
        expect(moveKeepsOwnQueenSafe(board, refinedMove!, "white")).toBe(true);
        expect(scoredSafeMoves.length).toBeGreaterThan(0);

        const bestSafeScore = scoredSafeMoves[0].score;
        const bestSafeMoves = scoredSafeMoves
            .filter(({ score }) => score === bestSafeScore)
            .map(({ move }) => move);

        expect(bestSafeMoves).toContainEqual(refinedMove!);
    });

    it("leaves hard mode untouched", () => {
        const board = createBoard("3r3k/3p4/8/8/8/8/8/3QK3 w - - 0 1");
        const hangingQueenCapture = getMove(board, "d1", "d7", { isCapture: true });

        expect(hangingQueenCapture).not.toBeNull();
        expect(hangingQueenCapture).not.toBeUndefined();
        expect(
            refineComputerMoveForQueenSafety(
                board,
                "white",
                "hard",
                hangingQueenCapture ?? null,
                () => 0
            )
        ).toEqual(hangingQueenCapture);
    });
});
