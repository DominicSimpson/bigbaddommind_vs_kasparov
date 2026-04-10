import { describe, it, expect } from 'vitest';
import { getMove } from '../move/utils/moveTestUtils.js';
import { createBoard, expectEmpty, expectPieceAt } from '../board/utils/boardTestUtils.js';
import type { Move } from '../../src/types/Move.js';

describe('makeMove', () => {   

    describe('basic movement', () => {
        // white pawns:
        it('moves a pawn from e2 to e3', () => {
            const board = createBoard('4k3/8/8/8/8/8/4P3/4K3 w - - 0 1');

            const move = getMove(board, 'e2', 'e3');
            if (!move) throw new Error('Expected move e2 -> e3 to exist');
            board.makeMove(move);
            
            expectEmpty(board, 'e2');
            expectPieceAt(board, 'e3', 'pawn', 'white');

        });
        // great early electronic album by Manuel Göttsching, btw:
        it('moves a pawn from e2 to e4', () => {
            const board = createBoard('4k3/8/8/8/8/8/4P3/4K3 w - - 0 1');

            const move = getMove(board, 'e2', 'e4');
            if (!move) throw new Error('Expected move e2 -> e4 to exist');

            board.makeMove(move);
            
            expectEmpty(board, 'e2');
            expectPieceAt(board, 'e4', 'pawn', 'white');
        });

        // black pawns:
        it('moves a pawn from e7 to e6', () => {
            const board = createBoard('4k3/4p3/8/8/8/8/8/4K3 b - - 0 1');

            const move = getMove(board, 'e7', 'e6');
            if (!move) throw new Error('Expected move e7 -> e6 to exist');

            board.makeMove(move);
            
            expectEmpty(board, 'e7');
            expectPieceAt(board, 'e6', 'pawn', 'black');

        });
        it('moves a pawn from e7 to e5', () => {
            const board = createBoard('4k3/4p3/8/8/8/8/8/4K3 b - - 0 1');

            const move = getMove(board, 'e7', 'e5');
            if (!move) throw new Error('Expected move e7 -> e5 to exist');

            board.makeMove(move);
            
            expectEmpty(board, 'e7');
            expectPieceAt(board, 'e5', 'pawn', 'black');

        });
    });

    describe('turn and game-state updates', () => {
        it('switches the side to move after a white move', () => {
            const board = createBoard('4k3/8/8/8/8/8/4P3/4K3 w - - 0 1');
            const move = getMove(board, 'e2', 'e3');
            if (!move) throw new Error('Expected move e2 -> e3 to exist');

            board.makeMove(move);

            expect(board.getSideToMove()).toBe('black');
        });

        it('switches the side to move after a black move', () => {
            const board = createBoard('4k3/4p3/8/8/8/8/8/4K3 b - - 0 1');
            const move = getMove(board, 'e7', 'e6');
            if (!move) throw new Error('Expected move e7 -> e6 to exist');

            board.makeMove(move);

            expect(board.getSideToMove()).toBe('white');
        });

        it('sets the en passant target after a white double pawn push', () => {
            const board = createBoard('4k3/8/8/8/8/8/4P3/4K3 w - - 0 1');
            const move = getMove(board, 'e2', 'e4');
            if (!move) throw new Error('Expected move e2 -> e4 to exist');

            board.makeMove(move);

            expect(board.toFEN()).toBe('4k3/8/8/8/4P3/8/8/4K3 b - e3 0 1');
        });

        it('sets the en passant target after a black double pawn push', () => {
            const board = createBoard('4k3/4p3/8/8/8/8/8/4K3 b - - 0 1');
            const move = getMove(board, 'e7', 'e5');
            if (!move) throw new Error('Expected move e7 -> e5 to exist');

            board.makeMove(move);

            expect(board.toFEN()).toBe('4k3/8/8/4p3/8/8/8/4K3 w - e6 0 2');
        });

        it('increments the halfmove clock after a quiet non-pawn move', () => {
            const board = createBoard('4k3/8/8/8/8/8/8/4K1N1 w - - 7 1');
            const move = getMove(board, 'g1', 'f3');
            if (!move) throw new Error('Expected move g1 -> f3 to exist');

            board.makeMove(move);

            expect(board.toFEN()).toBe('4k3/8/8/8/8/5N2/8/4K3 b - - 8 1');
        });

        it('resets the halfmove clock after a capture', () => {
            const board = createBoard('4k3/8/8/3p4/4P3/8/8/4K3 w - - 7 1');
            const move = getMove(board, 'e4', 'd5');
            if (!move) throw new Error('Expected move e4 -> d5 to exist');

            board.makeMove(move);

            expect(board.toFEN()).toBe('4k3/8/8/3P4/8/8/8/4K3 b - - 0 1');
        });

        it('increments the fullmove number after a black move', () => {
            const board = createBoard('4k3/4p3/8/8/8/8/8/4K3 b - - 0 1');
            const move = getMove(board, 'e7', 'e6');
            if (!move) throw new Error('Expected move e7 -> e6 to exist');

            board.makeMove(move);

            expect(board.toFEN()).toBe('4k3/8/4p3/8/8/8/8/4K3 w - - 0 2');
        });
    });

    describe('captures', () => {
        it('lets a white pawn capture diagonally', () => {
            const board = createBoard('4k3/8/8/3p4/4P3/8/8/4K3 w - - 0 1');
            const move = getMove(board, 'e4', 'd5');
            if (!move) throw new Error('Expected move e4 -> d5 to exist');

            board.makeMove(move);

            expectEmpty(board, 'e4');
            expectPieceAt(board, 'd5', 'pawn', 'white');
            expect(board.toFEN()).toBe('4k3/8/8/3P4/8/8/8/4K3 b - - 0 1');
        });

        it('lets a black pawn capture diagonally', () => {
            const board = createBoard('4k3/8/8/8/3p4/4P3/8/4K3 b - - 0 1');
            const move = getMove(board, 'd4', 'e3');
            if (!move) throw new Error('Expected move d4 -> e3 to exist');

            board.makeMove(move);

            expectEmpty(board, 'd4');
            expectPieceAt(board, 'e3', 'pawn', 'black');
            expect(board.toFEN()).toBe('4k3/8/8/8/8/4p3/8/4K3 w - - 0 2');
        });
    });

    describe('promotion validation', () => {
        it('throws if a pawn reaches the last rank without a promotion choice', () => {
            const board = createBoard('5k2/2P5/8/8/8/8/8/4K3 w - - 0 1');

            const move: Move = {
                fromRank: 6,
                fromFile: 2,
                toRank: 7,
                toFile: 2,
            };

            expect(() => board.makeMove(move, true)).toThrow(
                'Pawn reached last rank without promotion choice'
            );
        });

        it('throws if a non-pawn move includes a promotion choice', () => {
            const board = createBoard('4k3/8/8/8/8/8/8/4K2N w - - 0 1');

            const move: Move = {
                fromRank: 0,
                fromFile: 7,
                toRank: 2,
                toFile: 6,
                promotion: 'queen',
            };

            expect(() => board.makeMove(move, true)).toThrow(
                'Invalid promotion: only pawns can promote'
            );
        });

        it('throws if a pawn promotion is declared before the last rank', () => {
            const board = createBoard('4k3/8/8/8/8/8/4P3/4K3 w - - 0 1');

            const move: Move = {
                fromRank: 1,
                fromFile: 4,
                toRank: 2,
                toFile: 4,
                promotion: 'queen',
            };

            expect(() => board.makeMove(move, true)).toThrow(
                'Invalid promotion: pawn did not reach last rank'
            );
        });
    });

    describe('validation', () => {
        it('throws if there is no piece on the source square', () => {
            const board = createBoard('4k3/8/8/8/8/8/8/4K3 w - - 0 1');

            const move: Move = {
                fromRank: 1,
                fromFile: 4,
                toRank: 2,
                toFile: 4,
            };

            expect(() => board.makeMove(move)).toThrow('No piece on source square.');
        });

        it('throws if the wrong side tries to move', () => {
            const board = createBoard('4k3/4p3/8/8/8/8/8/4K3 w - - 0 1');

            const move: Move = {
                fromRank: 6,
                fromFile: 4,
                toRank: 5,
                toFile: 4,
            };

            expect(() => board.makeMove(move)).toThrow('Not your turn.');
        });

        it('throws if the move is illegal for the piece', () => {
            const board = createBoard('4k3/8/8/8/8/8/4P3/4K3 w - - 0 1');

            const move: Move = {
                fromRank: 1,
                fromFile: 4,
                toRank: 4,
                toFile: 4,
            };

            expect(() => board.makeMove(move)).toThrow('Illegal move.');
        });
    });
    
});
