import { describe, it, expect } from 'vitest';
import { ChessBoard } from '../../src/board/ChessBoard';
import { algebraicToCoords, getMove, hasLegalMoveByAlgebraicNotation } from '../move/utils/moveTestUtils';
import { createBoard, expectEmpty, expectPieceAt } from '../board/utils/boardTestUtils';
 
describe('back-rank pieces', () => {

        describe('from the starting position', () => {
            // white:
            it('rook on a1 has no legal moves', () => {
                // full FEN string is necessary to set the side to move, which affects move generation:
                const board = createBoard('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'); 

                const { rank, file } = algebraicToCoords('a1');
                const moves = board.getLegalMoves(rank, file);

                expect(moves).toHaveLength(0);

            });

            it('knight on b1 has legal moves', () => {

                const board = createBoard('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');

                const { rank, file } = algebraicToCoords('b1');
                const moves = board.getLegalMoves(rank, file);

                expect(moves).toHaveLength(2);
                expect(hasLegalMoveByAlgebraicNotation(board, 'b1', 'a3')).toBe(true);
                expect(hasLegalMoveByAlgebraicNotation(board, 'b1', 'c3')).toBe(true);

            });
            
            it('bishop on c1 has no legal moves', () => {

                const board = createBoard('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');
                const { rank, file } = algebraicToCoords('c1');
                const moves = board.getLegalMoves(rank, file);

                expect(moves).toHaveLength(0);

            });

            it('queen on d1 has no legal moves', () => {

                const board = createBoard('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');

                const { rank, file } = algebraicToCoords('d1');
                const moves = board.getLegalMoves(rank, file);

                expect(moves).toHaveLength(0);

            });

            it('king on e1 has no legal moves', () => {

                const board = createBoard('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');  

                const { rank, file } = algebraicToCoords('e1');
                const moves = board.getLegalMoves(rank, file);

                expect(moves).toHaveLength(0);
            });



            // black:
            it('rook on a8 has no legal moves', () => {

                const board = createBoard('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR b KQkq - 0 1');

                const { rank, file } = algebraicToCoords('a8');
                const moves = board.getLegalMoves(rank, file);

                expect(moves).toHaveLength(0);

            });
            
            it('knight on b8 has legal moves', () => {

                const board = createBoard('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR b KQkq - 0 1');

                const { rank, file } = algebraicToCoords('b8');
                const moves = board.getLegalMoves(rank, file);

                expect(moves).toHaveLength(2);
                expect(hasLegalMoveByAlgebraicNotation(board, 'b8', 'a6')).toBe(true);
                expect(hasLegalMoveByAlgebraicNotation(board, 'b8', 'c6')).toBe(true);

            });
            
            it('bishop on c8 has no legal moves', () => {

                const board = createBoard('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR b KQkq - 0 1');

                const { rank, file } = algebraicToCoords('c8');
                const moves = board.getLegalMoves(rank, file);

                expect(moves).toHaveLength(0);

            });

            it('queen on d8 has no legal moves', () => {

                const board = createBoard('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR b KQkq - 0 1');

                const { rank, file } = algebraicToCoords('d8');
                const moves = board.getLegalMoves(rank, file);

                expect(moves).toHaveLength(0);

            });

            it('king on e8 has no legal moves', () => {

                const board = createBoard('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR b KQkq - 0 1');  

                const { rank, file } = algebraicToCoords('e8');
                const moves = board.getLegalMoves(rank, file);

                expect(moves).toHaveLength(0);
            });

    });

}); 