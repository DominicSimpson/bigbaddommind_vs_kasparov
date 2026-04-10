import { describe, it, expect } from 'vitest';
import { ChessBoard } from '../../src/board/ChessBoard.js';
import { createBoard } from '../board/utils/boardTestUtils.js';
import { hasLegalMoveByAlgebraicNotation } from '../move/utils/moveTestUtils.js';


describe('white-to-move starting position move legality', () => {
  it.each([
    // Pawn moves:
    ['a2', 'a3'],
    ['a2', 'a4'],
    ['b2', 'b3'],
    ['b2', 'b4'],
    ['c2', 'c3'],
    ['c2', 'c4'],
    ['d2', 'd3'],
    ['d2', 'd4'],
    ['e2', 'e3'],
    ['e2', 'e4'],
    ['f2', 'f3'],
    ['f2', 'f4'],
    ['g2', 'g3'],
    ['g2', 'g4'],
    ['h2', 'h3'],
    ['h2', 'h4'],
    // Knight moves:
    ['b1', 'a3'],
    ['b1', 'c3'],
    ['g1', 'f3'],
    ['g1', 'h3'],
  ])('allows %s to %s', (from, to) => {

    const board = new ChessBoard();
    
    expect(hasLegalMoveByAlgebraicNotation(board, from, to)).toBe(true);
  });
  
});

describe('black-to-move starting position move legality', () => {
  it.each([
    // Pawn moves:
    ['a7', 'a6'],
    ['a7', 'a5'],   
    ['b7', 'b5'],
    ['b7', 'b6'],
    ['c7', 'c5'],
    ['c7', 'c6'],
    ['d7', 'd5'],
    ['d7', 'd6'],
    ['e7', 'e5'],
    ['e7', 'e6'],
    ['f7', 'f5'],
    ['f7', 'f6'],
    ['g7', 'g5'],
    ['g7', 'g6'],
    ['h7', 'h5'],
    ['h7', 'h6'],
    // Knight moves:
    ['b8', 'a6'],
    ['b8', 'c6'],
    ['g8', 'f6'],
    ['g8', 'h6'],
  ])('allows %s to %s', (from, to) => {

    const board = createBoard('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR b KQkq - 0 1');
    
    expect(hasLegalMoveByAlgebraicNotation(board, from, to)).toBe(true);
  });
  
});


describe('white-to-move starting position move illegality', () => {
  it.each([
    // Back rank pieces cannot move forward except for knights:
    ['a1', 'a3'],
    ['c1', 'c3'],
    ['d1', 'd3'],
    ['e1', 'e3'],
    ['f1', 'f3'],
    ['h1', 'h3'],
  ])('does not allow %s to %s', (from, to) => {

    const board = new ChessBoard();
    
    expect(hasLegalMoveByAlgebraicNotation(board, from, to)).toBe(false);
  });
  
});

describe('black-to-move starting position move illegality', () => {
  it.each([
    // Back rank pieces cannot move forward except for knights:
    ['a8', 'a6'],
    ['c8', 'c6'],
    ['d8', 'd6'],
    ['e8', 'e6'],
    ['f8', 'f6'],
    ['h8', 'h6'],
  ])('does not allow %s to %s', (from, to) => {

    const board = createBoard('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR b KQkq - 0 1');
    
    expect(hasLegalMoveByAlgebraicNotation(board, from, to)).toBe(false);
  });
  
});

describe('turn enforcement', () => {
  it('does not allow a black move when it is white to move', () => {
    const board = new ChessBoard();

    expect(hasLegalMoveByAlgebraicNotation(board, 'a7', 'a6')).toBe(false);
    expect(hasLegalMoveByAlgebraicNotation(board, 'g8', 'f6')).toBe(false);
  });

  it('does not allow a white move when it is black to move', () => {
    const board = createBoard('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR b KQkq - 0 1');

    expect(hasLegalMoveByAlgebraicNotation(board, 'a2', 'a3')).toBe(false);
    expect(hasLegalMoveByAlgebraicNotation(board, 'g1', 'f3')).toBe(false);
  });
});

describe('empty-square rejection', () => {
  it('does not allow a move from an empty square', () => {
    const board = new ChessBoard();

    expect(hasLegalMoveByAlgebraicNotation(board, 'e4', 'e5')).toBe(false);
    expect(hasLegalMoveByAlgebraicNotation(board, 'd5', 'd6')).toBe(false);
  });
});

describe('castling legality filtering', () => {
  it('does not allow castling while in check', () => {
    const board = createBoard('4k2r/8/8/8/8/8/4r3/R3K2R w KQk - 0 1');

    expect(hasLegalMoveByAlgebraicNotation(board, 'e1', 'g1', { castle: 'K' })).toBe(false);
    expect(hasLegalMoveByAlgebraicNotation(board, 'e1', 'c1', { castle: 'Q' })).toBe(false);
  });

  it('does not allow castling through an attacked square', () => {
    const board = createBoard('4k2r/8/8/8/2b5/8/8/R3K2R w KQk - 0 1');

    expect(hasLegalMoveByAlgebraicNotation(board, 'e1', 'g1', { castle: 'K' })).toBe(false);
  });

  it('does not allow castling into check', () => {
    const board = createBoard('4k2r/8/8/2b5/8/8/8/R3K2R w KQk - 0 1');

    expect(hasLegalMoveByAlgebraicNotation(board, 'e1', 'g1', { castle: 'K' })).toBe(false);
  });
});
