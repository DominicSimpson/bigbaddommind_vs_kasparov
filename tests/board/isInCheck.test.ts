import { describe, it, expect } from 'vitest';
import { ChessBoard } from '../../src/board/ChessBoard';

function expectInCheck(fen: string, color: 'white' | 'black', expected: boolean) {
    const board = new ChessBoard();
    board.loadFEN(fen);
    expect(board.isInCheck(color)).toBe(expected);
}

describe('isInCheck', () => {

    describe('bishop / diagonal check detection', () => {
        it.each([
            [
                'white bishop on g5 does not check black king on d8 if there is not open diagonal',
                '3k4/4p3/8/6B1/8/8/8/3K4 b - - 0 1',
                'black',
                false,
            ],
            [
                'white bishop on g5 checks a black king on d8 if there is open diagonal',
                '3k4/8/8/6B1/8/8/8/3K4 b - - 0 1',
                'black',
                true,
            ],
            [
                'detects that a white bishop on f4 does not check a black king on d8',
                '3k4/8/8/8/5B2/8/8/3K4 b - - 0 1',
                'black',
                false,
            ],
            [
                'detects that black bishop on g4 does not check white king on d1 if there is not open diagonal',
                '3k4/8/8/8/6B1/8/4P3/3K4 w - - 0 1',
                'white',
                false, 
            ],
            [
                'detects that a black bishop on g4 checks a white king if there is open diagonal',
                '3k4/8/8/8/6b1/8/8/3K4 w - - 0 1',
                'white',
                true,
            ],
            [
                'detects that a black bishop on f5 does not check a white king on d1',
                '3k4/8/8/5b2/8/8/8/3K4 w - - 0 1',
                'white',
                false,
            ],
        ])('(%s', (_, fen, colour, expected) => {
            expectInCheck(fen, colour as 'white' | 'black', expected as boolean);
        });
    });

    // next test here
     describe('rook / queen / file/rank check detection', () => {
        it.each([
            [
                'detects that white rook on d4 does not check black king on d8 if there is not open file',
                '3k4/3p4/8/8/3R4/8/8/3K4 b - - 0 1',
                'black',
                false,
            ],
            [
                'detects that white rook on d4 checks a black king on d8 if there is open file',
                '3k4/8/8/8/3R4/8/8/3K4 b - - 0 1',
                'black',
                true,
            ],
            [
                'detects that white rook on c4 does not check black king on d8',
                '3k4/8/8/8/2R5/8/8/3K4 b - - 0 1',
                'black',
                false,
            ],
            [
                'detects that black rook on d4 does not check white king on d1 if there is not open file',
                '3k4/4P3/8/8/3r4/8/3P4/3K4 w - - 0 1',
                'white',
                false,
            ],
            [
                'detects that a black rook on d4 checks a white king on d1 if there is open file',
                '3k4/8/8/8/3r4/8/8/3K4 w - - 0 1',
                'white',
                true,
            ],
            [
                'detects that a black rook on e4 does not check a white king on d1',
                '3k4/8/8/8/4r3/8/8/3K4 w - - 0 1',
                'white',
                false,
            ],

            [
                'detects that white queen on a8 does not check black king on d8 if there is not open rank',
                'Q1bk4/8/8/8/8/8/8/3K4 b - - 0 1',
                'black',
                false,
            ],
            [
                'detects that white queen on a8 checks a black king on d8 if there is open rank',
                'Q2k4/8/8/8/8/8/8/3K4 b - - 0 1',
                'black',
                true,
            ],
            [
                'detects that white queen on a7 does not check black king on d8',
                '3k4/Q7/8/8/8/8/8/3K4 b - - 0 1',
                'black',
                false,
            ],
            [
                'detects that black queen on a1 does not check white king on d1 if there is not open rank',
                '3k4/8/8/8/8/8/8/q1bK4 w - - 0 1',
                'white',
                false,
            ],
            [
                'detects that a black queen on a1 checks a white king on d1 if there is open rank',
                '3k4/8/8/8/8/8/8/q3K3 w - - 0 1',
                'white',
                true,
            ],
            [
                'detects that a black queen on b1 does not check a white king on d1',
                '3k4/8/8/8/8/8/q7/3K4 w - - 0 1',
                'white',
                false,
            ]
        ])('(%s', (_, fen, colour, expected) => {            
            expectInCheck(fen, colour as 'white' | 'black', expected as boolean);
        });
    });

    // next test here
    describe('knight check detection', () => {
        it.each([
            [
                'detects that a white knight on e6 checks a black king on d8',
                '3k4/8/4N3/8/8/8/8/3K4 b - - 0 1',
                'black',
                true,
            ],
            [
                'detects that a white knight on d6 does not check a black king on d8',
                '3k4/8/3N4/8/8/8/8/3K4 b - - 0 1',
                'black',
                false,
            ],
            [
                'detects that a black knight on c3 checks a white king on d1',
                '3k4/8/8/8/8/2n5/8/3K4 w - - 0 1',
                'white',
                true,
            ],
            [
                'detects that a black knight on d3 does not check a white king on d1',
                '3k4/8/8/8/8/3n4/8/3K4 w - - 0 1',
                'white',
                false,
            ],
        ])('(%s', (_, fen, colour, expected) => {            
            expectInCheck(fen, colour as 'white' | 'black', expected as boolean);
        });

        //next test here
});



describe('pawn check detection', () => {

    it('detects that a white pawn on e7 checks a black king on d8', () => {
        const board = new ChessBoard();
        board.loadFEN('3k4/4P3/8/8/8/8/8/3K4 b - - 0 1');    
        expect(board.isInCheck('black')).toBe(true);
    });
      it('detects that white pawn on d7 does not check black king on d8', () => {
        const board = new ChessBoard();
        board.loadFEN('3k4/3P4/8/8/8/8/8/3K4 b - - 0 1');    
        expect(board.isInCheck('black')).toBe(false);
    });


    it('detects that a black pawn on c2 checks a white king on d1', () => {
        const board = new ChessBoard();
        board.loadFEN('3k4/8/8/8/8/8/2p5/3K4 w - - 0 1');    
        expect(board.isInCheck('white')).toBe(true);
    });
    it('detects that a black pawn on d2 does not check white king on d1', () => {
        const board = new ChessBoard();
        board.loadFEN('3k4/8/8/8/8/8/3p4/3K4 w - - 0 1');    
        expect(board.isInCheck('white')).toBe(false);

    });

});

describe('king check detection', () => {

    it('detects that a white king on c7 checks a black king on d8', () => {
        const board = new ChessBoard();
        board.loadFEN('3k4/2K5/8/8/8/8/8/8 b - - 0 1');    
        expect(board.isInCheck('black')).toBe(true);
    });
    it('detects that white king on d6 does not check black king on d8', () => {
        const board = new ChessBoard();
        board.loadFEN('3k4/8/3K4/8/8/8/8/8 b - - 0 1');    
        expect(board.isInCheck('black')).toBe(false);
    });


    it('detects that a black king on e2 checks a white king on d1', () => {
        const board = new ChessBoard();
        board.loadFEN('8/8/8/8/8/8/4k3/3K4 w - - 0 1');    
        expect(board.isInCheck('white')).toBe(true);
    });
    it('detects that black king on d3 does not check white king on d1', () => {
        const board = new ChessBoard();
        board.loadFEN('8/8/8/8/8/3k4/8/3K4 w - - 0 1');    
        expect(board.isInCheck('white')).toBe(false);
    });

});