import { describe, it, expect } from 'vitest';
import { ChessBoard } from '../../src/board/ChessBoard';

function checkmate(fen: string, color: 'white' | 'black', expected: boolean) {
    const board = new ChessBoard();
    board.loadFEN(fen);
    expect(board.isCheckmate(color)).toBe(expected);
}

describe('isCheckmate', () => {

    describe('checkmate detection', () => {
        it.each([
            [
                'detects that black king on a8 is checkmated by white queen on b7',
                'k7/1Q6/8/8/8/8/1R6/3K4 b - - 0 1',
                'black',
                true,
            ],
            [
                'detects that white king on h1 is checkmated by black queen on g2',
                '3k4/6r1/8/8/8/8/6q1/7K w - - 0 1',
                'white',
                true,
            ],

            [
                'detects that black king on a8 is not checkmated by white queen on c6',
                'k7/8/2Q5/8/8/8/8/2K5 b - - 0 1',
                'black',
                false,
            ],
            [
                'detects that white king on h1 is not checkmated by black queen on f3',
                '3k4/8/8/8/8/5q2/8/7K w - - 0 1',
                'white',
                false,
            ]

        ])('%s', (_, fen, colour, expected) => {
            checkmate(fen, colour as 'white' | 'black', expected as boolean);
        });
    });

});