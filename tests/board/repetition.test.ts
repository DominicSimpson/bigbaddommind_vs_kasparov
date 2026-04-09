import { describe, it, expect } from 'vitest';
import { createBoard } from './utils/boardTestUtils';
import { getMove } from '../move/utils/moveTestUtils';
import type { PromotionPiece } from '../../src/types/Move';

function playMove(
  board: ReturnType<typeof createBoard>,
  from: string,
  to: string,
  promotion?: PromotionPiece
) {
  const move = getMove(board, from, to);
  if (!move) throw new Error(`Expected move ${from} -> ${to} to exist`);

  if (promotion) {
    move.promotion = promotion;
  }

  board.makeMove(move);
}

describe('threefold repetition', () => {
  it('declares a draw when the same position occurs three times', () => {
    const board = createBoard('1n2k3/8/8/8/8/8/8/RN2K3 w - - 0 1');
    // knights moving back and forth between b1/c3 and b8/c6, creating the same position three times
    playMove(board, 'b1', 'c3');
    playMove(board, 'b8', 'c6');
    playMove(board, 'c3', 'b1');
    playMove(board, 'c6', 'b8');

    expect(board.getGameResult()).toEqual({ status: 'ongoing' });

    playMove(board, 'b1', 'c3');
    playMove(board, 'b8', 'c6');
    playMove(board, 'c3', 'b1');
    playMove(board, 'c6', 'b8');

    expect(board.getGameResult()).toEqual({ status: 'draw', reason: 'threefold' });
  });

  it('does not declare a draw when the same position has occurred only twice', () => {
    const board = createBoard('1n2k3/8/8/8/8/8/8/RN2K3 w - - 0 1');

    playMove(board, 'b1', 'c3');
    playMove(board, 'b8', 'c6');
    playMove(board, 'c3', 'b1');
    playMove(board, 'c6', 'b8');

    expect(board.getGameResult()).toEqual({ status: 'ongoing' });
  });

  it('removes the threefold draw when the last move is undone', () => {
    const board = createBoard('1n2k3/8/8/8/8/8/8/RN2K3 w - - 0 1');

    playMove(board, 'b1', 'c3');
    playMove(board, 'b8', 'c6');
    playMove(board, 'c3', 'b1');
    playMove(board, 'c6', 'b8');
    playMove(board, 'b1', 'c3');
    playMove(board, 'b8', 'c6');
    playMove(board, 'c3', 'b1');
    playMove(board, 'c6', 'b8');

    expect(board.getGameResult()).toEqual({ status: 'draw', reason: 'threefold' });

    board.undoMove();

    expect(board.getGameResult()).toEqual({ status: 'ongoing' });
  });
  // This test ensures that the threefold repetition rule is correctly implemented by verifying 
  // that positions with different castling rights are not treated as 
  // the same position, which could lead to incorrect draw declarations:
  it('does not treat positions with different castling rights as the same', () => {
    const board = createBoard('r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1');

    playMove(board, 'h1', 'h2');
    playMove(board, 'h8', 'h7');
    playMove(board, 'h2', 'h1');
    playMove(board, 'h7', 'h8');

    expect(board.toFEN()).toBe('r3k2r/8/8/8/8/8/8/R3K2R w Qq - 4 3');
    expect(board.getGameResult()).toEqual({ status: 'ongoing' });
  });
  // This test ensures that the threefold repetition rule is correctly implemented by verifying 
  // that positions with different en passant availability are not treated as the same position, 
  // which could lead to incorrect draw declarations:
  it('does not treat positions with different en passant availability as the same', () => {
    const board = createBoard('4k1n1/8/8/8/8/8/4P3/4K1N1 w - - 0 1');

    playMove(board, 'e2', 'e4');
    expect(board.toFEN()).toBe('4k1n1/8/8/8/4P3/8/8/4K1N1 b - e3 0 1');

    playMove(board, 'g8', 'f6');
    playMove(board, 'g1', 'f3');
    playMove(board, 'f6', 'g8');
    playMove(board, 'f3', 'g1');

    expect(board.toFEN()).toBe('4k1n1/8/8/8/4P3/8/8/4K1N1 b - - 4 3');

    playMove(board, 'g8', 'f6');
    playMove(board, 'g1', 'f3');
    playMove(board, 'f6', 'g8');
    playMove(board, 'f3', 'g1');

    expect(board.getGameResult()).toEqual({ status: 'ongoing' });
  });
});
