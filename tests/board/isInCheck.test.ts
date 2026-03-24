import { describe, it, expect } from 'vitest';
import { ChessBoard } from '../../src/board/ChessBoard';

describe('diagonal check detection', () => {

    it('detects that white bishop on g5 does not check black king on d8 if there is black pawn on e7', () => {
        const board = new ChessBoard();
        board.loadFEN('3k4/4p3/8/6B1/8/8/8/3K4 b - - 0 1');
        expect(board.isInCheck('black')).toBe(false);
    });    
    it('detects that white bishop on g5 checks a black king on d8 if there is no black pawn on e7', () => {
        const board = new ChessBoard();
        board.loadFEN('3k4/8/8/6B1/8/8/8/3K4 b - - 0 1');
        expect(board.isInCheck('black')).toBe(true);
    });
    it('detects that a white bishop on f4 does not check a black king on d8', () => {
        const board = new ChessBoard();
        board.loadFEN('3k4/8/8/8/5B2/8/8/3K4 b - - 0 1');
        expect(board.isInCheck('black')).toBe(false);
    });


    it('detects that black bishop on g4 does not check white king on d1 if there is white pawn on e2', () => {
        const board = new ChessBoard();
        board.loadFEN('3k4/8/8/8/6B1/8/4P3/3K4 w - - 0 1');
        expect(board.isInCheck('white')).toBe(false);
    }); 
    it('detects that a black bishop on g4 checks a white king on d1 if there is no white pawn on e2', () => {
        const board = new ChessBoard();
        board.loadFEN('3k4/8/8/8/6b1/8/8/3K4 w - - 0 1');
        expect(board.isInCheck('white')).toBe(true);
    });
    it('detects that a black bishop on f5 does not check a black king on d8', () => {
        const board = new ChessBoard();
        board.loadFEN('3k4/8/8/5b2/8/8/8/3K4 w - - 0 1');
        expect(board.isInCheck('white')).toBe(false);
    });

});

describe('vertical check detection', () => {

     it('detects that white rook on d4 does not check black king on d8 if there is black pawn on d7', () => {
        const board = new ChessBoard();
        board.loadFEN('3k4/3p4/8/8/3R4/8/8/3K4 b - - 0 1');
        expect(board.isInCheck('black')).toBe(false);
    });
    it('detects that white rook on d4 checks a black king on d8 if there is no black pawn on d7', () => {
        const board = new ChessBoard(); 
        board.loadFEN('3k4/8/8/8/3R4/8/8/3K4 b - - 0 1');
        expect(board.isInCheck('black')).toBe(true);
    });
    it('detects that white rook on c4 does not check black king on d8', () => {
        const board = new ChessBoard(); 
        board.loadFEN('3k4/8/8/8/2R5/8/8/3K4 b - - 0 1');
        expect(board.isInCheck('black')).toBe(false);
    });


     it('detects that black rook on d4 does not check white king on d1 if there is white pawn on d2', () => {
        const board = new ChessBoard();
        board.loadFEN('3k4/4P3/8/8/3r4/8/3P4/3K4 w - - 0 1');
        expect(board.isInCheck('white')).toBe(false);
    });
    it('detects that a black rook on d4 checks a white king on d1 if there is no white pawn on d2', () => {
        const board = new ChessBoard();
        board.loadFEN('3k4/8/8/8/3r4/8/8/3K4 w - - 0 1');
        expect(board.isInCheck('white')).toBe(true);
    })
     it('detects that black rook on e4 does not check white king', () => {
        const board = new ChessBoard();
        board.loadFEN('3k4/8/8/8/4r3/8/8/3K4 w - - 0 1');
        expect(board.isInCheck('white')).toBe(false);
    })

});

describe('horizontal check detection', () => {

    it('detects that a white queen on b8 checks a black king on d8', () => {
        const board = new ChessBoard();
        board.loadFEN('Q3k3/8/8/8/8/8/8/3K4 b - - 0 1');
        expect(board.isInCheck('black')).toBe(true);
    });

    it('detects that a black queen on a1 checks a white king on d1', () => {
        const board = new ChessBoard();
        board.loadFEN('3k4/8/8/8/8/8/8/q3K3 w - - 0 1');
        expect(board.isInCheck('white')).toBe(true);
    })

});

describe('knight check detection', () => {

    it('detects that a white knight on e6 checks a black king on d8', () => {
        const board = new ChessBoard();
        board.loadFEN('3k4/8/4N3/8/8/8/8/3K4 b - - 0 1');    
        expect(board.isInCheck('black')).toBe(true);
    });

     it('detects that a black knight on c3 checks a white king on d1', () => {
        const board = new ChessBoard();
        board.loadFEN('3k4/8/8/8/8/2n5/8/3K4 w - - 0 1');    
        expect(board.isInCheck('white')).toBe(true);
    });

});