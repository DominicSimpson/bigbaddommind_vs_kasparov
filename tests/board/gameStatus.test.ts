import { describe, expect, it } from 'vitest';
import { ChessBoard } from '../../src/board/ChessBoard.js';
import { createBoard } from './utils/boardTestUtils.js';
import { getMove } from '../move/utils/moveTestUtils.js';

describe('getGameStatus', () => {
    it('reports active for a normal non-checking position', () => {
        const board = new ChessBoard();

        expect(board.getGameStatus()).toEqual({ status: 'active' });
    });

    it('reports check when the side to move is in check but has legal moves', () => {
        const board = createBoard('4k3/8/8/8/8/8/4R3/4K3 b - - 0 1');

        expect(board.getGameStatus()).toEqual({ status: 'check', sideInCheck: 'black' });
    });

    it('reports checkmate when the side to move is checkmated', () => {
        const board = createBoard('7k/6Q1/6K1/8/8/8/8/8 b - - 0 1');

        expect(board.getGameStatus()).toEqual({ status: 'checkmate', winner: 'white' });
    });

    it('reports stalemate', () => {
        const board = createBoard('7k/5Q2/7K/8/8/8/8/8 b - - 0 1');

        expect(board.getGameStatus()).toEqual({ status: 'stalemate' });
    });

    it('reports draw by repetition', () => {
        const board = createBoard('1n2k3/8/8/8/8/8/8/RN2K3 w - - 0 1');

        const moves: Array<[string, string]> = [
            ['b1', 'c3'],
            ['b8', 'c6'],
            ['c3', 'b1'],
            ['c6', 'b8'],
            ['b1', 'c3'],
            ['b8', 'c6'],
            ['c3', 'b1'],
            ['c6', 'b8'],
        ];

        for (const [from, to] of moves) {
            const move = getMove(board, from, to);
            if (!move) throw new Error(`Expected move ${from} -> ${to} to exist`);
            board.makeMove(move);
        }

        expect(board.getGameStatus()).toEqual({ status: 'drawByRepetition' });
    });

    it('reports draw by the 50-move rule', () => {
        const board = createBoard('4k3/8/8/8/8/8/8/4K2R w - - 100 1');

        expect(board.getGameStatus()).toEqual({ status: 'drawByFiftyMoveRule' });
    });

    it('reports draw by insufficient material', () => {
        const board = createBoard('8/8/8/8/8/4k3/8/4K3 w - - 0 1');

        expect(board.getGameStatus()).toEqual({ status: 'drawByInsufficientMaterial' });
    });
});
