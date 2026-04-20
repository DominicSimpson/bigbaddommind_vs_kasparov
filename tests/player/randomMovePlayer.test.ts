import { describe, it, expect } from 'vitest';
import { RandomMovePlayer } from '../../src/player/RandomMovePlayer.js';
import { createBoard } from '../board/utils/boardTestUtils.js';
import { ChessBoard } from '../../src/board/ChessBoard.js';

describe('RandomMovePlayer', () => {
    it('chooses a legal move for the current side to move', () => {
        const board = new ChessBoard();
        const player = new RandomMovePlayer(() => 0);

        const move = player.chooseMove(board);

        expect(move).not.toBeNull();
        expect(board.getAllLegalMoves().some(candidate =>
            candidate.fromRank === move!.fromRank &&
            candidate.fromFile === move!.fromFile &&
            candidate.toRank === move!.toRank &&
            candidate.toFile === move!.toFile &&
            candidate.promotion === move!.promotion
        )).toBe(true);
    });

    it('plays a legal move on the board and returns it', () => {
        const board = createBoard('4k3/8/8/8/8/8/4P3/4K3 w - - 0 1');
        const player = new RandomMovePlayer(() => 0);

        const move = player.playMove(board);

        expect(move).not.toBeNull();
        expect(board.getSquare(move!.fromRank, move!.fromFile).piece).toBeNull();
        expect(board.getSquare(move!.toRank, move!.toFile).piece?.colour).toBe('white');
        expect(board.getSideToMove()).toBe('black');
    });

    it('returns null when the requested side has no legal moves', () => {
        const board = createBoard('7k/6Q1/6K1/8/8/8/8/8 b - - 0 1');
        const player = new RandomMovePlayer(() => 0);

        expect(player.chooseMove(board)).toBeNull();
        expect(player.playMove(board)).toBeNull();
    });

    it('throws if asked to choose or play for a side that is not to move', () => {
        const board = new ChessBoard();
        const player = new RandomMovePlayer(() => 0);

        expect(() => player.chooseMove(board, 'black')).toThrow(
            'RandomMovePlayer can only choose for the side to move.'
        );
        expect(() => player.playMove(board, 'black')).toThrow(
            'RandomMovePlayer can only play for the side to move.'
        );
    });
});
