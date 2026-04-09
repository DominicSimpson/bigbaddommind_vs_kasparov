import { describe, it, expect } from 'vitest';
import { ChessBoard } from '../../src/board/ChessBoard.js';
import { algebraicToCoords, getMove, hasLegalMoveByAlgebraicNotation } from '../move/utils/moveTestUtils.js';
import { createBoard, expectEmpty, expectLegalDestinations, expectPieceAt } from '../board/utils/boardTestUtils.js';

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
    
});
