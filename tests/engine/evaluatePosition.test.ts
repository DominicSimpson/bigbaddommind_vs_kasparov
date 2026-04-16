import { describe, expect, it } from 'vitest';
import { evaluatePosition, CHECKMATE_SCORE } from '../../src/engine/evaluatePosition.js';
import { ChessBoard } from '../../src/board/ChessBoard.js';
import { createBoard } from '../board/utils/boardTestUtils.js';

describe('evaluatePosition', () => {
    it('evaluates the starting position as equal', () => {
        const board = new ChessBoard();

        expect(evaluatePosition(board, 'white')).toBe(0);
        expect(evaluatePosition(board, 'black')).toBe(0);
    });

    it('returns a positive score for the side with extra material', () => {
        const board = createBoard('4k3/8/8/8/8/8/8/Q3K3 w - - 0 1');

        expect(evaluatePosition(board, 'white')).toBe(900);
        expect(evaluatePosition(board, 'black')).toBe(-900);
    });

    it('scores mirrored material advantage with opposite signs', () => {
        const board = createBoard('q3k3/8/8/8/8/8/8/4K3 w - - 0 1');

        expect(evaluatePosition(board, 'white')).toBe(-900);
        expect(evaluatePosition(board, 'black')).toBe(900);
    });

    it('returns a large positive or negative score for checkmate', () => {
        const board = createBoard('7k/6Q1/6K1/8/8/8/8/8 b - - 0 1');

        expect(evaluatePosition(board, 'white')).toBe(CHECKMATE_SCORE);
        expect(evaluatePosition(board, 'black')).toBe(-CHECKMATE_SCORE);
    });

    it('returns zero for drawn positions', () => {
        const board = createBoard('7k/5Q2/7K/8/8/8/8/8 b - - 0 1');

        expect(board.getGameStatus()).toEqual({ status: 'stalemate' });
        expect(evaluatePosition(board, 'white')).toBe(0);
        expect(evaluatePosition(board, 'black')).toBe(0);
    });

    it('defaults to the side to move when no perspective is provided', () => {
        const board = createBoard('4k3/8/8/8/8/8/8/Q3K3 b - - 0 1');

        expect(board.getSideToMove()).toBe('black');
        expect(evaluatePosition(board)).toBe(-900);
    });
});
