import { describe, it, expect } from 'vitest';
import { ChessBoard } from '../../src/board/ChessBoard.js';
import { getMove } from '../move/utils/moveTestUtils.js';
import { createBoard, expectEmpty, expectPieceAt } from '../board/utils/boardTestUtils.js';
import type { Move } from '../../src/types/Move.js';

describe('makeMove', () => {   

    describe('board-level flow', () => {
        it('returns the full starting-position move list when called without a square', () => {
            const board = new ChessBoard();
            const moves = board.getLegalMoves();

            const moveList = moves
                .map(move => {
                    const from = board.getSquare(move.fromRank, move.fromFile).coord;
                    const to = board.getSquare(move.toRank, move.toFile).coord;
                    return `${from}-${to}`;
                })
                .sort();

            expect(moves).toHaveLength(20);
            expect(moveList).toEqual([
                'a2-a3',
                'a2-a4',
                'b1-a3',
                'b1-c3',
                'b2-b3',
                'b2-b4',
                'c2-c3',
                'c2-c4',
                'd2-d3',
                'd2-d4',
                'e2-e3',
                'e2-e4',
                'f2-f3',
                'f2-f4',
                'g1-f3',
                'g1-h3',
                'g2-g3',
                'g2-g4',
                'h2-h3',
                'h2-h4',
            ]);
        });

        it('returns the full starting-position move list via getAllLegalMoves()', () => {
            const board = new ChessBoard();

            expect(board.getAllLegalMoves()).toHaveLength(20);
            expect(board.getAllLegalMoves('white')).toHaveLength(20);
            expect(board.getAllLegalMoves('black')).toHaveLength(20);
        });

        it('returns legal moves for a requested side even when it is not that side to move', () => {
            const board = createBoard('4k3/8/8/8/8/8/4P3/4K2R b - - 0 1');

            expect(board.getAllLegalMoves('black')).toHaveLength(5);
            expect(board.getAllLegalMoves('white')).toHaveLength(15);
            expect(board.getLegalMoves()).toHaveLength(5);
        });

        it('updates game status after a legal move is applied', () => {
            const board = createBoard('7k/5Q2/6K1/8/8/8/8/8 w - - 0 1');
            const move = getMove(board, 'f7', 'g7');
            if (!move) throw new Error('Expected move f7 -> g7 to exist');

            expect(board.getGameStatus()).toEqual({ status: 'ongoing' });

            board.makeMove(move);
            
            expect(board.getGameStatus()).toEqual({ status: 'checkmate', winner: 'white' });
        });
    });

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

        it('accepts a legal capture without requiring the isCapture flag', () => {
            const board = createBoard('4k3/8/8/3p4/4P3/8/8/4K3 w - - 0 1');

            board.makeMove({
                fromRank: 3,
                fromFile: 4,
                toRank: 4,
                toFile: 3,
            });

            expectEmpty(board, 'e4');
            expectPieceAt(board, 'd5', 'pawn', 'white');
            expect(board.toFEN()).toBe('4k3/8/8/3P4/8/8/8/4K3 b - - 0 1');
        });
    });

    describe('special-move flag inference', () => {
        it('accepts castling without requiring the castle flag', () => {
            const board = createBoard('4k2r/8/8/8/8/8/8/R3K2R w KQk - 0 1');

            board.makeMove({
                fromRank: 0,
                fromFile: 4,
                toRank: 0,
                toFile: 6,
            });

            expectEmpty(board, 'e1');
            expectEmpty(board, 'h1');
            expectPieceAt(board, 'g1', 'king', 'white');
            expectPieceAt(board, 'f1', 'rook', 'white');
            expect(board.toFEN()).toBe('4k2r/8/8/8/8/8/8/R4RK1 b k - 1 1');
        });

        it('accepts en passant without requiring the enPassant flag', () => {
            const board = createBoard('4k3/8/8/3pP3/8/8/8/4K3 w - d6 0 1');

            board.makeMove({
                fromRank: 4,
                fromFile: 4,
                toRank: 5,
                toFile: 3,
            });

            expectEmpty(board, 'e5');
            expectEmpty(board, 'd5');
            expectPieceAt(board, 'd6', 'pawn', 'white');
            expect(board.toFEN()).toBe('4k3/8/3P4/8/8/8/8/4K3 b - - 0 1');
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
