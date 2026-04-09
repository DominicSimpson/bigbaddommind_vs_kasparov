import { describe, it, expect } from 'vitest';
import { ChessBoard } from '../../src/board/ChessBoard.js';

describe('ChessBoard basic functionality', () => {

    it('initialises the standard starting position', () => {
        const board = new ChessBoard();

        expect(board.getSideToMove()).toBe('white');
        expect(board.canCastle('white', 'K')).toBe(true);
        expect(board.canCastle('white', 'Q')).toBe(true);
        expect(board.canCastle('black', 'K')).toBe(true);
        expect(board.canCastle('black', 'Q')).toBe(true);
        expect(board.canUndo()).toBe(false);
        expect(board.toFEN()).toBe('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');

        expect(board.getSquare(0, 4).piece?.type).toBe('king');
        expect(board.getSquare(0, 4).piece?.colour).toBe('white');
        expect(board.getSquare(0, 0).piece?.type).toBe('rook');
        expect(board.getSquare(0, 0).piece?.colour).toBe('white');
        expect(board.getSquare(1, 3).piece?.type).toBe('pawn');
        expect(board.getSquare(1, 3).piece?.colour).toBe('white');

        expect(board.getSquare(7, 4).piece?.type).toBe('king');
        expect(board.getSquare(7, 4).piece?.colour).toBe('black');
        expect(board.getSquare(7, 3).piece?.type).toBe('queen');
        expect(board.getSquare(7, 3).piece?.colour).toBe('black');
        expect(board.getSquare(6, 6).piece?.type).toBe('pawn');
        expect(board.getSquare(6, 6).piece?.colour).toBe('black');

        expect(board.getSquare(2, 4).piece).toBeNull();
        expect(board.getSquare(5, 4).piece).toBeNull();
    });
});
