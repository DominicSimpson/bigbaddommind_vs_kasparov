import { describe, expect, it } from 'vitest';
import { ChessBoard } from '../../src/board/ChessBoard.js';
import {
    MINIMAX_DIFFICULTY_DEPTHS,
    MinimaxPlayer,
} from '../../src/player/MinimaxPlayer.js';
import { createBoard, expectBoardUnchanged } from '../board/utils/boardTestUtils.js';

describe('MinimaxPlayer', () => {
    it('maps named difficulty levels to search depths', () => {
        for (const [difficulty, expectedDepth] of Object.entries(MINIMAX_DIFFICULTY_DEPTHS)) {
            const player = new MinimaxPlayer(difficulty as keyof typeof MINIMAX_DIFFICULTY_DEPTHS);

            expect(player.difficulty).toBe(difficulty);
            expect(player.getSearchDepth()).toBe(expectedDepth);
        }
    });

    it('defaults to medium difficulty', () => {
        const player = new MinimaxPlayer();

        expect(player.difficulty).toBe('medium');
        expect(player.getSearchDepth()).toBe(MINIMAX_DIFFICULTY_DEPTHS.medium);
    });

    it('still supports explicit numeric depths', () => {
        const player = new MinimaxPlayer(4);

        expect(player.difficulty).toBeNull();
        expect(player.getSearchDepth()).toBe(4);
    });

    it('rejects invalid difficulty settings', () => {
        expect(() => new MinimaxPlayer(0)).toThrow(
            'MinimaxPlayer difficulty must be "easy", "medium", or "hard", or a positive integer depth.'
        );
        expect(() => new MinimaxPlayer('expert' as never)).toThrow(
            'MinimaxPlayer difficulty must be "easy", "medium", or "hard", or a positive integer depth.'
        );
    });

    it('chooses a legal move for the current side to move', () => {
        const board = new ChessBoard();
        const player = new MinimaxPlayer('easy');

        const move = player.chooseMove(board);

        expect(move).not.toBeNull();
        expect(board.getAllLegalMoves()).toContainEqual(move!);
        expectBoardUnchanged(board, () => {
            player.chooseMove(board);
        });
    });

    it('plays a legal move on the board and returns it', () => {
        const board = createBoard('4k3/8/8/8/8/8/4P3/4K3 w - - 0 1');
        const player = new MinimaxPlayer('easy');

        const move = player.playMove(board);

        expect(move).not.toBeNull();
        expect(board.getSquare(move!.fromRank, move!.fromFile).piece).toBeNull();
        expect(board.getSquare(move!.toRank, move!.toFile).piece?.colour).toBe('white');
        expect(board.getSideToMove()).toBe('black');
    });

    it('returns null when there are no legal moves', () => {
        const board = createBoard('7k/6Q1/6K1/8/8/8/8/8 b - - 0 1');
        const player = new MinimaxPlayer('medium');

        expect(player.chooseMove(board)).toBeNull();
        expect(player.playMove(board)).toBeNull();
    });

    it('throws if asked to choose or play for a side that is not to move', () => {
        const board = new ChessBoard();
        const player = new MinimaxPlayer('hard');

        expect(() => player.chooseMove(board, 'black')).toThrow(
            'MinimaxPlayer can only choose for the side to move.'
        );
        expect(() => player.playMove(board, 'black')).toThrow(
            'MinimaxPlayer can only play for the side to move.'
        );
    });
});
