import { describe, it, expect } from 'vitest';
import { ChessBoard } from '../../src/board/ChessBoard.js';
import { getMove } from '../move/utils/moveTestUtils.js';

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

    it('clones the board into an independent copy that preserves undo state', () => {
        const board = new ChessBoard();
        const firstMove = getMove(board, 'e2', 'e4');
        if (!firstMove) throw new Error('Expected move e2 -> e4 to exist');
        board.makeMove(firstMove);

        const clone = board.clone();

        expect(clone).not.toBe(board);
        expect(clone.toFEN()).toBe(board.toFEN());
        expect(clone.canUndo()).toBe(true);

        clone.undoMove();

        expect(clone.toFEN()).toBe('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');
        expect(board.toFEN()).toBe('rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1');
        expect(board.canUndo()).toBe(true);
        expect(clone.canUndo()).toBe(false);
    });
});
