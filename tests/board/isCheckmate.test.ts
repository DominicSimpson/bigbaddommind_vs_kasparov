import { describe, it, expect } from 'vitest';
import { ChessBoard } from '../../src/board/ChessBoard.js';

function checkmate(fen: string, colour: 'white' | 'black', expected: boolean) {
    const board = new ChessBoard();
    board.loadFEN(fen);
    expect(board.isCheckmate(colour)).toBe(expected);
}

describe('isCheckmate', () => {

    describe('checkmate detection', () => {
        it.each([
            [
                'detects that black king on a8 is checkmated by a supported white queen on b7',
                'k7/1Q6/8/8/8/8/1R6/4K3 b - - 0 1',
                'black',
                true,
            ],
            [
                'detects that white king on h1 is checkmated by a supported black queen on g2',
                '4k3/6r1/8/8/8/8/6q1/7K w - - 0 1',
                'white',
                true,
            ],

            [
                'detects that black king on a8 is not checkmated by white queen on c6',
                'k7/8/2Q5/8/8/8/8/4K3 b - - 0 1',
                'black',
                false,
            ],
            [
                'detects that white king on h1 is not checkmated by black queen on f3',
                '4k3/8/8/8/8/5q2/8/7K w - - 0 1',
                'white',
                false,
            ],

            [   
                'detects that black king on h8 is checkmated by white rook on h7 protected by the white queen on g6',
                '7k/7R/6Q1/8/8/8/8/4K3 b - - 0 1',
                'black',
                true,
            ],
            [
                'detects that black king on h8 is not checkmated by an unprotected white rook on h7 because the king can capture it',
                '7k/7R/8/6K1/8/8/8/8 b - - 0 1',
                'black',
                false,
            ],
            [
                'detects that black king on h8 is checkmated by white queen on g7 protected by white king on g6',
                '7k/6Q1/6K1/8/8/8/8/8 b - - 0 1',
                'black',
                true,
            ],
            [
                'detects that black king on a8 is not checkmated if a friendly rook can capture the checking queen',
                'k7/1Q6/r7/8/8/8/8/3K4 b - - 0 1',
                'black',
                false,
            ],
               [
                'detects that black king on d8 is not checkmated if a friendly bishop can block a rook check',
                '3k4/8/3b4/8/8/3b4/8/3K4 b - - 0 1',
                'black',
                false,
            ],

        ])('%s', (_, fen, colour, expected) => {
            checkmate(fen, colour as 'white' | 'black', expected as boolean);
        });
    });

});