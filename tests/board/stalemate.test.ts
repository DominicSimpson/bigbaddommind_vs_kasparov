import { describe, it, expect } from 'vitest';
import { ChessBoard } from '../../src/board/ChessBoard';

function stalemate(fen: string, colour: 'white' | 'black', expected: boolean) {
    const board = new ChessBoard();
    board.loadFEN(fen);
    expect(board.isStalemate(colour)).toBe(expected);
}


describe('isStalemate', () => {

    describe('stalemate detection', () => {
        it.each([
            [
                'black king trapped in corner by queen and king',
                'k7/2K5/1Q6/8/8/8/8/8 b - - 0 1',
                'black',
                true,
            ],
            [
                'white king trapped in corner by queen and king',
                '8/8/8/8/8/6q1/5k2/7K w - - 0 1',
                'white',
                true,
            ],
            [
                'checkmate not stalemate',
                '7k/5K2/7Q/8/8/8/8/8 b - - 0 1',   
                'black',
                false,
            ],
            [
                'kings too close but not stalemate',
                '8/8/8/8/3K1k2/8/8/8 w - - 0 1',
                'white',
                false,
            ],
            [
                'not stalemate: back king can escape to g7',
                '7k/8/5K2/6Q1/8/8/7P/8 b - - 0 1',
                'black',
                false,
            ],
        ])('%s', (_, fen, colour, expected) => {
            stalemate(fen, colour as 'white' | 'black', expected as boolean);
        });
    });

});