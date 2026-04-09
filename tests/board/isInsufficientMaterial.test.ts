import { it, expect } from 'vitest';
import { ChessBoard } from '../../src/board/ChessBoard.js';

it.each([
    [
        'K vs K', 
        '8/8/8/8/8/4k3/8/4K3 w - - 0 1', 
        true
    ],
    [
        'K+N vs K',
        '8/8/8/8/8/4k3/8/3NK3 b - - 0 1',
        true
    ],
    [
        'K+B vs K',
        '8/8/8/8/8/4k3/8/3KB3 w - - 0 1',
        true
    ],
    [
        'K+N vs K+N',
        '8/8/8/8/3nk3/8/8/3NK3 w - - 0 1',
        true
    ],
    [
        'K+B vs K+N',
        '8/8/8/8/8/3nk3/8/3BK3 w - - 0 1',
        true
    ],
    [
        'K+B vs K+B (bishops on same square colours)',
        '8/8/8/2b5/4k3/8/8/2B1K3 w - - 0 1',
        true
    ],
    [
        'K+R vs K',
        '8/8/8/8/8/4k3/8/3RK3 w - - 0 1',
        false
    ],
    [
        'K+P vs K',
        '8/8/8/8/4k3/8/3P4/4K3 w - - 0 1',
        false
    ]
])('%s', (_, fen, expected) => {
    const board = new ChessBoard();
    board.loadFEN(fen);
    expect(board.isDrawByInsufficientMaterial()).toBe(expected);
});