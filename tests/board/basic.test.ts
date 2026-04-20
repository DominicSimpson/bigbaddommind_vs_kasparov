import { describe, it, expect } from 'vitest';
import { ChessBoard } from '../../src/board/ChessBoard.js';
import { getMove } from '../move/utils/moveTestUtils.js';
import { Piece } from '../../src/pieces/Piece.js';

describe('ChessBoard basic functionality', () => {

    it('initialises the standard starting position', () => {
        const board = new ChessBoard();
        // kings and queens:
        expect(board.getSideToMove()).toBe('white');
        expect(board.canCastle('white', 'K')).toBe(true);
        expect(board.canCastle('white', 'Q')).toBe(true);
        expect(board.canCastle('black', 'K')).toBe(true);
        expect(board.canCastle('black', 'Q')).toBe(true);
        expect(board.canUndo()).toBe(false);
        expect(board.getMoveHistory()).toEqual([]);
        expect(board.toFEN()).toBe('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');
        // white:
        expect(board.getSquare(0, 4).piece?.type).toBe('king');
        expect(board.getSquare(0, 4).piece?.colour).toBe('white');
        expect(board.getSquare(0, 0).piece?.type).toBe('rook');
        expect(board.getSquare(0, 0).piece?.colour).toBe('white');
        expect(board.getSquare(1, 3).piece?.type).toBe('pawn');
        expect(board.getSquare(1, 3).piece?.colour).toBe('white');
        // black:
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
        expect(clone.getMoveHistory()).toEqual(board.getMoveHistory());

        clone.undoMove();

        expect(clone.toFEN()).toBe('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');
        expect(board.toFEN()).toBe('rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1');
        expect(board.canUndo()).toBe(true);
        expect(clone.canUndo()).toBe(false);
    });

    it('records move history entries with move, capture, promotion and resulting position key', () => {
        const board = new ChessBoard();
        board.loadFEN('1r2k3/P7/8/8/8/8/8/4K3 w - - 0 1');

        const move = getMove(board, 'a7', 'b8', { promotion: 'queen' });
        if (!move) throw new Error('Expected promotion capture a7 -> b8=queen to exist');

        board.makeMove(move);

        expect(board.getMoveHistory()).toEqual([
            {
                move,
                movedPiece: new Piece('pawn', 'white'),
                capturedPiece: new Piece('rook', 'black'),
                promotionPiece: 'queen',
                positionKey: '1Q2k3/8/8/8/8/8/8/4K3 b - -',
            },
        ]);
    });

    it('returns detached move history snapshots', () => {
        const board = new ChessBoard();
        const move = getMove(board, 'e2', 'e4');
        if (!move) throw new Error('Expected move e2 -> e4 to exist');

        board.makeMove(move);

        const history = board.getMoveHistory();
        history[0].move.toFile = 0;
        history[0].movedPiece = new Piece('queen', 'black');
        history[0].capturedPiece = new Piece('bishop', 'white');

        expect(board.getMoveHistory()).toEqual([
            {
                move,
                movedPiece: new Piece('pawn', 'white'),
                capturedPiece: null,
                promotionPiece: null,
                positionKey: 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3',
            },
        ]);
    });

    it('creates a hypothetical position on a clone without mutating the original board', () => {
        const board = new ChessBoard();
        const move = getMove(board, 'e2', 'e4');
        if (!move) throw new Error('Expected move e2 -> e4 to exist');

        const branch = board.cloneWithMove(move);

        expect(board.toFEN()).toBe('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');
        expect(branch.toFEN()).toBe('rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1');
        expect(board.canUndo()).toBe(false);
        expect(branch.canUndo()).toBe(true);
    });

    it('lets a cloned hypothetical line continue independently and undo back to its source position', () => {
        const board = new ChessBoard();
        const firstMove = getMove(board, 'e2', 'e4');
        if (!firstMove) throw new Error('Expected move e2 -> e4 to exist');
        const branch = board.cloneWithMove(firstMove);
        const branchedStart = branch.toFEN();

        const reply = getMove(branch, 'e7', 'e5');
        if (!reply) throw new Error('Expected move e7 -> e5 to exist on the cloned board');
        branch.makeMove(reply);
        branch.undoMove();

        expect(branch.toFEN()).toBe(branchedStart);
        expect(board.toFEN()).toBe('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');
    });

    it('returns detached square snapshots from the public API', () => {
        const board = new ChessBoard();
        const square = board.getSquare(0, 4);

        square.piece = new Piece('queen', 'black');

        expect(board.getSquare(0, 4).piece?.type).toBe('king');
        expect(board.getSquare(0, 4).piece?.colour).toBe('white');
    });
});
