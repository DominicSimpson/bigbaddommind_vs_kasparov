import { describe, it, expect } from 'vitest';
import { ChessBoard } from '../../src/board/ChessBoard';
import { LegalMoveFilter } from '../../src/move/LegalMoveFilter';
import { hasLegalMoveByAlgebraicNotation } from '../utils/moveTestUtils';


describe('starting position move legality', () => {
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
    // template string with placeholders:
  ])('allows %s to %s', (from, to) => {

    const board = new ChessBoard();
    
    expect(hasLegalMoveByAlgebraicNotation(board, from, to)).toBe(true);
  });
  
});


describe('starting position move illegality', () => {
  it.each([
    // Back rank pieces cannot move forward except for knights:
    ['a1', 'a3'],
    ['c1', 'c3'],
    ['d1', 'd3'],
    ['e1', 'e3'],
    ['f1', 'f3'],
    ['h1', 'h3'],

    // template string with placeholders:
  ])('does not allow %s to %s', (from, to) => {

    const board = new ChessBoard();
    
    expect(hasLegalMoveByAlgebraicNotation(board, from, to)).toBe(false);
  });
  
});
