import { describe, it, expect } from 'vitest';
import { createBoard, expectEmpty, expectPieceAt } from './utils/boardTestUtils.js';
import { getMove } from '../move/utils/moveTestUtils.js';
import type { PromotionPiece, Move } from '../../src/types/Move.js';

function playPromotionMove(
  board: ReturnType<typeof createBoard>,
  from: string,
  to: string,
  promotion?: PromotionPiece
) {
  let move: Move | undefined;

  if (promotion) {
    move = getMove(board, from, to, { promotion });
  } else {
    const legalMove = getMove(board, from, to);
    if (legalMove) {
      const { promotion: _promotion, ...moveWithoutPromotion } = legalMove;
      move = moveWithoutPromotion;
    }
  }

  if (!move) throw new Error(`Expected move ${from} -> ${to} to exist`);
  board.makeMove(move);
}

describe('pawn promotion', () => {
  it('promotes a white pawn to a queen on the eighth rank', () => {
    const board = createBoard('5k2/2P5/8/8/8/8/8/4K3 w - - 0 1');

    playPromotionMove(board, 'c7', 'c8', 'queen');

    expectEmpty(board, 'c7');
    expectPieceAt(board, 'c8', 'queen', 'white');
    expect(board.toFEN()).toBe('2Q2k2/8/8/8/8/8/8/4K3 b - - 0 1');
  });

  it('promotes a black pawn to a queen on the first rank', () => {
    const board = createBoard('5k2/8/8/8/8/8/2p5/4K3 b - - 0 1');

    playPromotionMove(board, 'c2', 'c1', 'queen');

    expectEmpty(board, 'c2');
    expectPieceAt(board, 'c1', 'queen', 'black');
    expect(board.toFEN()).toBe('5k2/8/8/8/8/8/8/2q1K3 w - - 0 2');
  });

  it('promotes a white pawn to a non-queen piece when chosen', () => {
    const board = createBoard('5k2/2P5/8/8/8/8/8/4K3 w - - 0 1');

    playPromotionMove(board, 'c7', 'c8', 'knight');

    expectEmpty(board, 'c7');
    expectPieceAt(board, 'c8', 'knight', 'white');
    expect(board.toFEN()).toBe('2N2k2/8/8/8/8/8/8/4K3 b - - 0 1');
  });

   it('promotes a black pawn to a non-queen piece when chosen', () => {
    const board = createBoard('4k3/8/8/8/8/8/2p5/5K2 b - - 0 1');

    playPromotionMove(board, 'c2', 'c1', 'knight');

    expectEmpty(board, 'c2');
    expectPieceAt(board, 'c1', 'knight', 'black');
    expect(board.toFEN()).toBe('4k3/8/8/8/8/8/8/2n2K2 w - - 0 2');
  });

  it('requires an explicit promotion choice when a white pawn reaches the last rank', () => {
    const board = createBoard('5k2/2P5/8/8/8/8/8/4K3 w - - 0 1');

    expect(() => playPromotionMove(board, 'c7', 'c8')).toThrow(
      'Pawn reached last rank without promotion choice'
    );
    expect(board.toFEN()).toBe('5k2/2P5/8/8/8/8/8/4K3 w - - 0 1');
  });

   it('requires an explicit promotion choice when a black pawn reaches the last rank', () => {
    const board = createBoard('4k3/8/8/8/8/8/2p5/5K2 b - - 0 1');

    expect(() => playPromotionMove(board, 'c2', 'c1')).toThrow(
      'Pawn reached last rank without promotion choice'
    );
    expect(board.toFEN()).toBe('4k3/8/8/8/8/8/2p5/5K2 b - - 0 1');
  });

});
