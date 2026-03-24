import { describe, it, expect } from 'vitest';
import { ChessBoard } from '../../src/board/ChessBoard';

describe('ChessBoard basic functionality', () => {

    it('should initialize an empty chess board', () => {
        const board = new ChessBoard();
        expect(board).toBeDefined();

    })
});
