import { describe, it, expect } from 'vitest';
import { ChessBoard } from '../../src/board/ChessBoard.js';

describe('ChessBoard basic functionality', () => {

    it('should initialize an empty chess board', () => {
        const board = new ChessBoard();
        expect(board).toBeDefined();

    })
});
