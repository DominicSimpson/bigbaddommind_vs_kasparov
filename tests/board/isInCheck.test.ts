import { describe, it, expect } from 'vitest';
import { ChessBoard } from '../../src/board/ChessBoard';

function expectInCheck(fen: string, colour: 'white' | 'black', expected: boolean) {
    const board = new ChessBoard();
    board.loadFEN(fen);
    expect(board.isInCheck(colour)).toBe(expected);
}

describe('isInCheck', () => {

    describe('bishop / diagonal check detection', () => {
        it.each([
            [
                'white bishop on b5 does not check black king on e8 if there is not open diagonal',
                '4k3/3p4/8/1B6/8/8/8/4K3 b - - 0 1',
                'black',
                false,
            ],
            [
                'white bishop on b5 checks a black king on e8 if there is open diagonal',
                '4k3/8/8/1B6/8/8/8/4K3 b - - 0 1',
                'black',
                true,
            ],
            [
                'detects that a white bishop on c4 does not check a black king on e8',
                '4k3/8/8/8/2B5/8/8/4K3 b - - 0 1',
                'black',
                false,
            ],

            [
                'detects that black bishop on b4 does not check white king on e1 if there is not open diagonal',
                '4k3/8/8/8/1b6/8/3P4/4K3 w - - 0 1',
                'white',
                false, 
            ],
            [   
                'detects that a black bishop on b4 checks a white king if there is open diagonal',
                '4k3/8/8/8/1b6/8/8/4K3 w - - 0 1',
                'white',
                true,
            ],
            [
                'detects that a black bishop on f5 does not check a white king on e1',
                '4k3/8/8/5b2/8/8/8/4K3 w - - 0 1',
                'white',
                false,
            ],
        ])('%s', (_, fen, colour, expected) => {
            expectInCheck(fen, colour as 'white' | 'black', expected as boolean);
        });
    });

    describe('rook / queen / file/rank check detection', () => {
        it.each([
            [
                'detects that white rook on e4 does not check black king on e8 if there is not open file',
                '4k3/4p3/8/8/4R3/8/8/4K3 b - - 0 1',
                'black',
                false,
            ],
            [
                'detects that white rook on e4 checks a black king on e8 if there is open file',
                '4k3/8/8/8/4R3/8/8/4K3 b - - 0 1',
                'black',
                true,
            ],
            [
                'detects that a white rook on c4 does not check a black king on e8',
                '4k3/8/8/8/2R5/8/8/4K3 b - - 0 1',
                'black',
                false,
            ],

            [
                'detects that a black rook on d4 does not check white king on e1',
                '4k3/4P3/8/8/3r4/8/3P4/4K3 w - - 0 1',
                'white',
                false,
            ],
            [
                'detects that a black rook on e4 checks a white king on e1 if there is open file',
                '4k3/8/8/8/4r3/8/8/4K3 w - - 0 1',
                'white',
                true,
            ],
            [
                'detects that a black rook on d4 does not check a white king on e1',
                '4k3/8/8/8/3r4/8/8/4K3 w - - 0 1',
                'white',
                false,
            ],

            [
                'detects that white queen on a8 does not check black king on e8 if there is not open rank',
                'Q2qk3/8/8/8/8/8/8/4K3 b - - 0 1',
                'black',
                false,
            ],
            [
                'detects that white queen on a8 checks a black king on e8 if there is open rank',
                'Q2k4/8/8/8/8/8/8/4K3 b - - 0 1',
                'black',
                true,
            ],
            [
                'detects that white queen on a7 does not check black king on e8',
                '4k3/Q7/8/8/8/8/8/4K3 b - - 0 1',
                'black',
                false,
            ],

            [
                'detects that black queen on a1 does not check white king on e1 if there is not open rank',
                '4k3/8/8/8/8/8/8/q2QK3 w - - 0 1',
                'white',
                false,
            ],
            [
                'detects that a black queen on a1 checks a white king on e1 if there is open rank',
                '4k3/8/8/8/8/8/8/q3K3 w - - 0 1',
                'white',
                true,
            ],
            [
                'detects that a black queen on a2 does not check a white king on e1',
                '4k3/8/8/8/8/8/q7/4K3 w - - 0 1',
                'white',
                false,
            ]
        ])('%s', (_, fen, colour, expected) => {            
            expectInCheck(fen, colour as 'white' | 'black', expected as boolean);
        });
    });

    describe('knight check detection', () => {
        it.each([
            [
                'detects that a white knight on f6 checks a black king on e8',
                '4k3/8/5N2/8/8/8/8/4K3 b - - 0 1',
                'black',
                true,
            ],
            [
                'detects that a white knight on e6 does not check a black king on e8',
                '4k3/8/4N3/8/8/8/8/4K3 b - - 0 1',
                'black',
                false,
            ],

            [
                'detects that a black knight on d3 checks a white king on e1',
                '4k3/8/8/8/8/3n4/8/4K3 w - - 0 1',
                'white',
                true,
            ],
            [
                'detects that a black knight on c3 does not check a white king on e1',
                '4k3/8/8/8/8/2n5/8/4K3 w - - 0 1',
                'white',
                false,
            ],
        ])('%s', (_, fen, colour, expected) => {            
            expectInCheck(fen, colour as 'white' | 'black', expected as boolean);
        });
    });

    describe('pawn check detection', () => {
        it.each([
            [
                'detects that a white pawn on d7 checks a black king on e8',
                '4k3/3P4/8/8/8/8/8/4K3 b - - 0 1',
                'black',
                true,
            ],
            [
                'detects that a white pawn on e7 does not check a black king on e8',
                '4k3/4P3/8/8/8/8/8/4K3 b - - 0 1',
                'black',
                false,
            ],

            [
                'detects that a black pawn on d2 checks a white king on e1',
                '4k3/8/8/8/8/8/3p4/4K3 w - - 0 1',
                'white',
                true,
            ],
            [
                'detects that a black pawn on e2 does not check a white king on e1',
                '4k3/8/8/8/8/8/4p3/4K3 w - - 0 1',
                'white',
                false,
            ],
        ])('%s', (_, fen, colour, expected) => {            
            expectInCheck(fen, colour as 'white' | 'black', expected as boolean);
        });
    });
        
    describe('king check detection', () => {
        it.each([
            [
                'detects that a white king on d6 does not attack a black king on e8',
                '4k3/8/3K4/8/8/8/8/8 b - - 0 1',
                'black',
                false,
            ],
            [
                'detects that a black king on d3 does not attack a white king on e1',
                '8/8/8/8/8/3k4/8/4K3 w - - 0 1',
                'white',
                false,
            ]
        ])('%s', (_, fen, colour, expected) => {            
            expectInCheck(fen, colour as 'white' | 'black', expected as boolean);
        });
    });

})