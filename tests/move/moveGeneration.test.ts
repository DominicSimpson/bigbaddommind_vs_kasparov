import { describe, it, expect } from 'vitest';
import { algebraicToCoords, getMove, hasLegalMoveByAlgebraicNotation } from '../move/utils/moveTestUtils';
import { createBoard, expectEmpty, expectLegalDestinations, expectPieceAt } from '../board/utils/boardTestUtils';
 
describe('back-rank pieces', () => {

    describe('from the starting position, with pawns in place', () => {

        describe('white pieces', () => {

            it('rook on a1 has no legal moves', () => {
            // full FEN string is necessary to set the side to move, which affects move generation:
                const board = createBoard('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'); 

                expectLegalDestinations(board, 0, 0, [])

            });

            it('knight on b1 has two legal moves', () => {

                const board = createBoard('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');

                const { rank, file } = algebraicToCoords('b1');
                const moves = board.getLegalMoves(rank, file);

                expect(moves).toHaveLength(2);
                expect(hasLegalMoveByAlgebraicNotation(board, 'b1', 'a3')).toBe(true);
                expect(hasLegalMoveByAlgebraicNotation(board, 'b1', 'c3')).toBe(true);
            });
            
            it('bishop on c1 has no legal moves', () => {

                const board = createBoard('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');

                expectLegalDestinations(board, 0, 2, [])

            });

            it('queen on d1 has no legal moves', () => {

                const board = createBoard('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');

                expectLegalDestinations(board, 0, 3, [])

            });

            it('king on e1 has no legal moves', () => {

                const board = createBoard('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');  

                expectLegalDestinations(board, 0, 4, [])

            });

        })

        describe('black pieces', () => {

            it('rook on a8 has no legal moves', () => {

                const board = createBoard('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR b KQkq - 0 1');

                expectLegalDestinations(board, 7, 0, [])

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

                expectLegalDestinations(board, 7, 2, [])

            });

            it('queen on d8 has no legal moves', () => {

                const board = createBoard('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR b KQkq - 0 1');

                expectLegalDestinations(board, 7, 3, [])

            });

            it('king on e8 has no legal moves', () => {

                const board = createBoard('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR b KQkq - 0 1');  

                expectLegalDestinations(board, 7, 4, [])
            
            });

        });

    });

    
    describe('when unobstructed', () => {

        describe('white pieces', () => {
           
            it('rook on a1 moves horizontally and vertically', () => {
    
                const board = createBoard('4k3/8/8/8/8/8/8/R3K3 w - - 0 1');
        
                expectLegalDestinations(board, 0, 0, 
                    [   
                    'a2','a3','a4','a5','a6','a7','a8',
                    'b1','c1','d1'
                    ]
                );
            });
    
            it('bishop on c1 moves diagonally', () => {
    
                const board = createBoard('4k3/8/8/8/8/8/8/2B1K3 w - - 0 1');
        
                const move = getMove(board, 'c1', 'g5');
                if (!move) throw new Error('Expected move c1 -> g5 to exist');
                board.makeMove(move);
                    
                expectEmpty(board, 'c1');
                expectPieceAt(board, 'g5', 'bishop', 'white');
        
            });
 
            it('queen on d1 combines rook and bishop movement', () => {
    
                const board = createBoard('4k3/8/8/8/8/8/8/3QK3 w - - 0 1');
        
                expectLegalDestinations(board, 0, 3, 
                    [   
                    'd2','d3','d4','d5','d6','d7','d8',
                    'a1','b1','c1',
                    'c2','b3','a4',
                    'e2','f3','g4','h5'
                    ]
                );
            });

            it('king on e1 moves one square in any direction', () => {

                const board = createBoard('4k3/8/8/8/8/8/8/4K3 w - - 0 1');

                expectLegalDestinations(board, 0, 4,
                [
                    'd2','e2','f2',
                    'd1','f1',
                ]
                );
            });

        });

        describe('black pieces', () => {

            it('rook on a8 moves horizontally and vertically', () => {
    
                const board = createBoard('r3k3/8/8/8/8/8/8/4K3 b - - 0 1');
        
                expectLegalDestinations(board, 7, 0, 
                    [   
                    'a7','a6','a5','a4','a3','a2','a1',
                    'b8','c8','d8'
                    ]
                );
            });

            it('bishop on c8 moves diagonally', () => {
    
                const board = createBoard('2b1k3/8/8/8/8/8/8/4K3 b - - 0 1');
    
                const move = getMove(board, 'c8', 'f5');
                if (!move) throw new Error('Expected move c8 -> f5 to exist');
                board.makeMove(move);
                
                expectEmpty(board, 'c8');
                expectPieceAt(board, 'f5', 'bishop', 'black');
    
            });

            it('queen on d8 combines rook and bishop movement', () => {
    
                const board = createBoard('3qk3/8/8/8/8/8/8/4K3 b - - 0 1');
    
                expectLegalDestinations(board, 7, 3, 
                    [   
                    'd7','d6','d5','d4','d3','d2','d1',
                    'a8','b8','c8',
                    'c7','b6','a5',
                    'e7','f6','g5','h4'
                    ]
                );
            });

            it('king on e8 moves one square in any direction', () => {

                const board = createBoard('4k3/8/8/8/8/8/8/4K3 b - - 0 1');

                expectLegalDestinations(board, 7, 4,
                    [
                    'd7','e7','f7',
                    'd8','f8',
                    ]
                );
            });
        });
    });


    describe('pieces cannot move through or onto a friendly piece', () => {

        describe('white pieces', () => {

            it('rook', () => {
                const board = createBoard('4k3/8/8/8/8/8/P7/R3K3 w - - 0 1');

                expectLegalDestinations(board, 0, 0, [
                'b1', 'c1', 'd1',
                ]);

                expect(hasLegalMoveByAlgebraicNotation(board, 'a1', 'a2')).toBe(false);
                expect(hasLegalMoveByAlgebraicNotation(board, 'a1', 'a3')).toBe(false);
                });


            it('knight', () => {
                const board = createBoard('4k3/8/8/8/8/8/3P4/1N2K3 w - - 0 1');

                expect(hasLegalMoveByAlgebraicNotation(board, 'b1', 'e2')).toBe(false);
            });

            it('bishop', () => {
                const board = createBoard('4k3/8/8/8/8/4P3/8/2B1K3 w - - 0 1');

                expect(hasLegalMoveByAlgebraicNotation(board, 'c1', 'd2')).toBe(true);
                expect(hasLegalMoveByAlgebraicNotation(board, 'c1', 'e3')).toBe(false); // occupied by friendly pawn
                expect(hasLegalMoveByAlgebraicNotation(board, 'c1', 'f4')).toBe(false); // beyond blocker
            });

            it('queen', () => {
                const board = createBoard('4k3/8/8/8/8/5P2/3P4/3QK3 w - - 0 1');

                // Friendly pawn on f3 blocks diagonal from d1
                expect(hasLegalMoveByAlgebraicNotation(board, 'd1', 'e2')).toBe(true);
                expect(hasLegalMoveByAlgebraicNotation(board, 'd1', 'f3')).toBe(false); // occupied
                expect(hasLegalMoveByAlgebraicNotation(board, 'd1', 'g4')).toBe(false); // beyond blocker

                // Friendly pawn on d2 blocks vertical movement
                expect(hasLegalMoveByAlgebraicNotation(board, 'd1', 'd2')).toBe(false);
            });

            it('king', () => {
                const board = createBoard('4k3/8/8/8/8/8/4P3/4K3 w - - 0 1');

                expect(hasLegalMoveByAlgebraicNotation(board, 'e1', 'e2')).toBe(false);
                expect(hasLegalMoveByAlgebraicNotation(board, 'e1', 'd1')).toBe(true);
                expect(hasLegalMoveByAlgebraicNotation(board, 'e1', 'f1')).toBe(true);
            });

        });

        describe('black pieces', () => {

            it('rook', () => {
                const board = createBoard('r3k3/p7/8/8/8/8/8/4K3 b - - 0 1');

                expectLegalDestinations(board, 7, 0, [
                'b8', 'c8', 'd8',
                // not a8 because occupied by piece itself
                ]);

                expect(hasLegalMoveByAlgebraicNotation(board, 'a8', 'a7')).toBe(false);
                expect(hasLegalMoveByAlgebraicNotation(board, 'a8', 'a6')).toBe(false);
                });


            it('knight', () => {
                const board = createBoard('1n2k3/3p4/8/8/8/8/8/4K3 b - - 0 1');

                expect(hasLegalMoveByAlgebraicNotation(board, 'b8', 'e7')).toBe(false);
            });

            it('bishop', () => {
                const board = createBoard('2b1k3/8/4p3/8/8/8/8/4K3 b - - 0 1');

                expect(hasLegalMoveByAlgebraicNotation(board, 'c8', 'd7')).toBe(true);
                expect(hasLegalMoveByAlgebraicNotation(board, 'c8', 'e6')).toBe(false); // occupied by friendly pawn
                expect(hasLegalMoveByAlgebraicNotation(board, 'c8', 'f5')).toBe(false); // beyond blocker
            });

            it('queen', () => {
                const board = createBoard('3qk3/3p4/5p2/8/8/8/8/4K3 b - - 0 1');

                // Friendly pawn on f6 blocks diagonal from d8
                expect(hasLegalMoveByAlgebraicNotation(board, 'd8', 'e7')).toBe(true);
                expect(hasLegalMoveByAlgebraicNotation(board, 'd8', 'f6')).toBe(false); // occupied
                expect(hasLegalMoveByAlgebraicNotation(board, 'd8', 'g5')).toBe(false); // beyond blocker

                // Friendly pawn on d7 blocks vertical movement
                expect(hasLegalMoveByAlgebraicNotation(board, 'd8', 'd7')).toBe(false);
            });

            it('king', () => {

                const board = createBoard('4k3/4p3/8/8/8/8/8/4K3 b - - 0 1');

                expect(hasLegalMoveByAlgebraicNotation(board, 'e8', 'e7')).toBe(false);
                expect(hasLegalMoveByAlgebraicNotation(board, 'e8', 'd8')).toBe(true);
                expect(hasLegalMoveByAlgebraicNotation(board, 'e8', 'f8')).toBe(true);
            });

        });

    });


    describe('pieces can capture an enemy piece but cannot move beyond it', () => {

        describe('white pieces', () => {

            it('rook', () => {

                const board = createBoard('4k3/8/8/8/8/8/p7/R3K3 w - - 0 1');

                expect(hasLegalMoveByAlgebraicNotation(board, 'a1', 'a2')).toBe(true);
                expect(hasLegalMoveByAlgebraicNotation(board, 'a1', 'a3')).toBe(false);

            });

            it('knight', () => {
                
                const board = createBoard('4k3/8/8/8/8/1p6/8/N3K3 w - - 0 1');

                expect(hasLegalMoveByAlgebraicNotation(board, 'a1', 'b3')).toBe(true);
            
            });
            
            it('bishop', () => {
                
                const board = createBoard('4k3/8/8/8/8/4p3/8/2B1K3 w - - 0 1');

                expect(hasLegalMoveByAlgebraicNotation(board, 'c1', 'e3')).toBe(true);
                expect(hasLegalMoveByAlgebraicNotation(board, 'c1', 'f4')).toBe(false);
            
            }); 

            it('queen', () => {
                
                const board = createBoard('4k3/8/8/8/8/5p2/8/3QK3 w - - 0 1');

                expectLegalDestinations(board, 0, 3, [
                // vertical up (north)
                'd2','d3','d4','d5','d6','d7','d8',

                // horizontal left (west)
                'c1','b1','a1',

                // horizontal right (blocked by friendly king on e1)
                // no 'e1'

                // diagonal north-east
                'e2','f3',

                // diagonal north-west
                'c2','b3','a4'
                ]);
            });
            
            it('king can capture but still only moves one square', () => {
                
                const board = createBoard('4k3/8/8/8/8/8/4p3/4K3 w - - 0 1');

                expectLegalDestinations(board, 0, 4, [
                'd2','e2','f2'
                ]);
            });

        });

        describe('black pieces', () => {

            it('rook', () => {

                const board = createBoard('r3k3/P7/8/8/8/8/8/4K3 b - - 0 1');

                expect(hasLegalMoveByAlgebraicNotation(board, 'a8', 'a7')).toBe(true);
                expect(hasLegalMoveByAlgebraicNotation(board, 'a8', 'a6')).toBe(false);

            });

            it('knight', () => {
                
                const board = createBoard('n3k3/8/1P6/8/8/8/8/4K3 b - - 0 1');

                expect(hasLegalMoveByAlgebraicNotation(board, 'a8', 'b6')).toBe(true);
            
            });
            
            it('bishop', () => {
                
                const board = createBoard('2bk4/8/4P3/8/8/8/8/4K3 b - - 0 1');

                expect(hasLegalMoveByAlgebraicNotation(board, 'c8', 'e6')).toBe(true);
                expect(hasLegalMoveByAlgebraicNotation(board, 'c8', 'f5')).toBe(false);
            
            }); 

            it('queen', () => {
                
                const board = createBoard('3qk3/8/5P2/8/8/8/8/4K3 b - - 0 1');

                expectLegalDestinations(board, 7, 3, [
                // vertical down (south)
                'd7','d6','d5','d4','d3','d2', 'd1',

                // horizontal left (west)
                'c8','b8','a8',

                // horizontal right (blocked by friendly king on e8)
                // no 'e8'

                // diagonal south-east
                'e7','f6',

                // diagonal south-west
                'c7','b6','a5'
                ]);
            });
            
            it('king can capture but still only moves one square', () => {
                
                const board = createBoard('4k3/4P3/8/8/8/8/8/4K3 b - - 0 1');

                expectLegalDestinations(board, 7, 4, [
                'd7','e7','f7'
                ]);

            });

        });

    });


    describe('king specific', () => {

        it('white king cannot capture a defended piece', () => {
                
            const board = createBoard('4k3/8/8/7b/8/8/4r3/4K3 w - - 0 1');

            expect(hasLegalMoveByAlgebraicNotation(board, 'e1', 'e2')).toBe(false);

        }); 
        
        it('white king cannot move adjacent to opposing black king', () => {
            
            const board = createBoard('8/8/8/8/8/4k3/8/4K3 w - - 0 1');

            expect(hasLegalMoveByAlgebraicNotation(board, 'e1', 'd2')).toBe(false);
            expect(hasLegalMoveByAlgebraicNotation(board, 'e1', 'e2')).toBe(false);
            expect(hasLegalMoveByAlgebraicNotation(board, 'e1', 'f2')).toBe(false);
            
        });

        it('white king cannot move into a square attacked by a black knight', () => {
            
            const board = createBoard('4k3/8/8/8/5n2/8/8/4K3 w - - 0 1');

            expect(hasLegalMoveByAlgebraicNotation(board, 'e1', 'e2')).toBe(false);
        });

        it('white king cannot move into a square attacked by a black pawn', () => {
            
            const board = createBoard('4k3/8/8/8/8/3p4/8/4K3 w - - 0 1');

            expect(hasLegalMoveByAlgebraicNotation(board, 'e1', 'e2')).toBe(false);
        });

            
        it('black king cannot capture a defended piece', () => {
                
            const board = createBoard('4k3/4R3/8/8/7B/8/8/4K3 b - - 0 1');

            expect(hasLegalMoveByAlgebraicNotation(board, 'e8', 'e7')).toBe(false);

        }); 

        it('black king cannot move adjacent to opposing white king', () => {
            
            const board = createBoard('4k3/8/4K3/8/8/8/8/8 b - - 0 1');

            expect(hasLegalMoveByAlgebraicNotation(board, 'e8', 'd7')).toBe(false);
            expect(hasLegalMoveByAlgebraicNotation(board, 'e8', 'e7')).toBe(false);
            expect(hasLegalMoveByAlgebraicNotation(board, 'e8', 'f7')).toBe(false);
            
        });

        it('black king cannot move into a square attacked by a white knight', () => {
            
            const board = createBoard('4k3/8/8/5N2/8/8/8/4K3 b - - 0 1');

            expect(hasLegalMoveByAlgebraicNotation(board, 'e8', 'e7')).toBe(false);
        });

        it('black king cannot move into a square attacked by a white pawn', () => {
            
            const board = createBoard('4k3/8/3P4/8/8/8/8/4K3 b - - 0 1');

            expect(hasLegalMoveByAlgebraicNotation(board, 'e8', 'e7')).toBe(false);
        });
        
    });


    describe('moves that would expose own king to check are illegal', () => {

        describe('white pieces', () => {

            it('white rook cannot move if it would expose its king to check', () => {
            
                const board = createBoard('4k3/4q3/8/8/8/8/4R3/4K3 w - - 0 1');

                // illegal: leaves file → exposes king
                expect(hasLegalMoveByAlgebraicNotation(board, 'e2', 'f2')).toBe(false);
                expect(hasLegalMoveByAlgebraicNotation(board, 'e2', 'd2')).toBe(false);

                // legal: stays on file (still blocking)
                expect(hasLegalMoveByAlgebraicNotation(board, 'e2', 'e3')).toBe(true);
                expect(hasLegalMoveByAlgebraicNotation(board, 'e2', 'e4')).toBe(true);
            });

            it('white knight cannot move if it would expose its king to check', () => {
                
                const board = createBoard('4k3/4q3/8/8/8/8/4N3/4K3 w - - 0 1');

                expect(hasLegalMoveByAlgebraicNotation(board, 'e2', 'd4')).toBe(false);
                expect(hasLegalMoveByAlgebraicNotation(board, 'e2', 'f4')).toBe(false);
                expect(hasLegalMoveByAlgebraicNotation(board, 'e2', 'c3')).toBe(false);
                expect(hasLegalMoveByAlgebraicNotation(board, 'e2', 'g3')).toBe(false);
            });

            it('white bishop cannot move if it would expose its king to check', () => {
            
                const board = createBoard('4k3/4q3/8/8/8/8/4B3/4K3 w - - 0 1');

                expect(hasLegalMoveByAlgebraicNotation(board, 'e2', 'f3')).toBe(false);
                expect(hasLegalMoveByAlgebraicNotation(board, 'e2', 'd3')).toBe(false);

            });

            it('white queen cannot move if it would expose its king to check', () => {
  
                const board = createBoard('4k3/8/8/b7/8/8/3Q4/4K3 w - - 0 1');

                // illegal: moves off diagonal → exposes king
                expect(hasLegalMoveByAlgebraicNotation(board, 'd2', 'd3')).toBe(false);
                expect(hasLegalMoveByAlgebraicNotation(board, 'd2', 'e2')).toBe(false);

                // legal: stays on diagonal
                expect(hasLegalMoveByAlgebraicNotation(board, 'd2', 'c3')).toBe(true);
                expect(hasLegalMoveByAlgebraicNotation(board, 'd2', 'b4')).toBe(true);
            
            });


        });

        describe('black pieces', () => {

            it('black rook cannot move if it would expose its king to check', () => {
            
                const board = createBoard('4k3/4r3/8/8/8/8/4Q3/4K3 b - - 0 1');

                // illegal: leaves file → exposes king
                expect(hasLegalMoveByAlgebraicNotation(board, 'e7', 'f7')).toBe(false);
                expect(hasLegalMoveByAlgebraicNotation(board, 'e7', 'd7')).toBe(false);

                // legal: stays on file (still blocking)
                expect(hasLegalMoveByAlgebraicNotation(board, 'e7', 'e6')).toBe(true);
                expect(hasLegalMoveByAlgebraicNotation(board, 'e7', 'e5')).toBe(true);
            });

            it('black knight cannot move if it would expose its king to check', () => {
                
                const board = createBoard('4k3/4n3/8/8/8/8/4Q3/4K3 b - - 0 1');

                expect(hasLegalMoveByAlgebraicNotation(board, 'e7', 'd5')).toBe(false);
                expect(hasLegalMoveByAlgebraicNotation(board, 'e7', 'f5')).toBe(false);
                expect(hasLegalMoveByAlgebraicNotation(board, 'e7', 'c6')).toBe(false);
                expect(hasLegalMoveByAlgebraicNotation(board, 'e7', 'g6')).toBe(false);
            });
       
            it('black bishop cannot move if it would expose its king to check', () => {
            
                const board = createBoard('4k3/4b3/8/8/8/8/4Q3/4K3 b - - 0 1');

                expect(hasLegalMoveByAlgebraicNotation(board, 'e7', 'f6')).toBe(false);
                expect(hasLegalMoveByAlgebraicNotation(board, 'e7', 'd6')).toBe(false);

            });

            it('black queen cannot move if it would expose its king to check', () => {
  
                const board = createBoard('4k3/3q4/8/8/B7/8/8/4K3 b - - 0 1');

                // illegal: moves off diagonal → exposes king
                expect(hasLegalMoveByAlgebraicNotation(board, 'd7', 'd3')).toBe(false);
                expect(hasLegalMoveByAlgebraicNotation(board, 'd7', 'e7')).toBe(false);

                // legal: stays on diagonal
                expect(hasLegalMoveByAlgebraicNotation(board, 'd7', 'c6')).toBe(true);
                expect(hasLegalMoveByAlgebraicNotation(board, 'd7', 'b5')).toBe(true);
            
            });

        });

    });

    
    describe('side to move enforcement', () => {
        
        it('white piece has no legal moves when it is black to move', () => {
            
            const board = createBoard('4k3/8/8/8/8/8/8/4K3 b - - 0 1');

            const { rank, file } = algebraicToCoords('e1'); // white king
            expect(board.getLegalMoves(rank, file)).toHaveLength(0);

        });

        it('black piece has no legal moves when it is white to move', () => {
            
            const board = createBoard('4k3/8/8/8/8/8/8/4K3 w - - 0 1');

            const { rank, file } = algebraicToCoords('e8'); // black king
            expect(board.getLegalMoves(rank, file)).toHaveLength(0);

        });

    });

});