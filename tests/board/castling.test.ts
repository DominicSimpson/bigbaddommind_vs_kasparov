import { describe, it, expect } from 'vitest';
import {
  createBoard,
  expectBoardUnchanged,
  expectEmpty,
  expectPieceAt,
} from './utils/boardTestUtils.js';
import { algebraicToCoords, getMove } from '../move/utils/moveTestUtils.js';
import type { Move } from '../../src/types/Move.js';

function playMove(
  board: ReturnType<typeof createBoard>,
  from: string,
  to: string
) {
  const move = getMove(board, from, to);
  if (!move) throw new Error(`Expected move ${from} -> ${to} to exist`);
  board.makeMove(move);
}

describe('castling', () => {
  it('casts white king-side and moves both king and rook', () => {
    const board = createBoard('4k2r/8/8/8/8/8/8/R3K2R w KQk - 0 1');

    playMove(board, 'e1', 'g1');

    expectEmpty(board, 'e1');
    expectEmpty(board, 'h1');
    expectPieceAt(board, 'g1', 'king', 'white');
    expectPieceAt(board, 'f1', 'rook', 'white');
    expect(board.toFEN()).toBe('4k2r/8/8/8/8/8/8/R4RK1 b k - 1 1');
  });

  it('casts black queen-side and moves both king and rook', () => {
    const board = createBoard('r3k2r/8/8/8/8/8/8/4K2R b kq - 0 1');

    playMove(board, 'e8', 'c8');

    expectEmpty(board, 'e8');
    expectEmpty(board, 'a8');
    expectPieceAt(board, 'c8', 'king', 'black');
    expectPieceAt(board, 'd8', 'rook', 'black');
    expect(board.toFEN()).toBe('2kr3r/8/8/8/8/8/8/4K2R w - - 1 2');
  });

  it('removes both white castling rights after the king moves without castling', () => {
    const board = createBoard('4k3/8/8/8/8/8/8/R3K2R w KQ - 0 1');

    playMove(board, 'e1', 'f1');

    expect(board.toFEN()).toBe('4k3/8/8/8/8/8/8/R4K1R b - - 1 1');
  });

  it('removes both black castling rights after the king moves without castling', () => {
    const board = createBoard('r3k2r/8/8/8/8/8/8/4K3 b kq - 0 1');

    playMove(board, 'e8', 'f8');

    expect(board.toFEN()).toBe('r4k1r/8/8/8/8/8/8/4K3 w - - 1 2');
  });

  it('removes only the matching white castling right when a rook moves off its starting square', () => {
    const board = createBoard('4k3/8/8/8/8/8/8/R3K2R w KQ - 0 1');

    playMove(board, 'h1', 'h2');

    expect(board.toFEN()).toBe('4k3/8/8/8/8/8/7R/R3K3 b Q - 1 1');
  });

  it('removes only the matching black castling right when a rook moves off its starting square', () => {
    const board = createBoard('r3k2r/8/8/8/8/8/8/4K3 b kq - 0 1');

    playMove(board, 'h8', 'h7');

    expect(board.toFEN()).toBe('r3k3/7r/8/8/8/8/8/4K3 w q - 1 2');
  });

  it('rejects a forced castle when castling rights are unavailable', () => {
    const board = createBoard('4k3/8/8/8/8/8/8/4K3 w - - 0 1');
    const from = algebraicToCoords('e1');
    const to = algebraicToCoords('g1');

    const move: Move = {
      fromRank: from.rank,
      fromFile: from.file,
      toRank: to.rank,
      toFile: to.file,
      castle: 'K',
    };

    expectBoardUnchanged(board, () => {
      expect(() => board.makeMove(move, true)).toThrow(
        'Invalid castling: castling rights not available'
      );
    });
  });

  it('restores the original position when castling is undone', () => {
    const board = createBoard('4k2r/8/8/8/8/8/8/R3K2R w KQk - 0 1');
    const before = board.toFEN();

    playMove(board, 'e1', 'g1');
    board.undoMove();

    expect(board.toFEN()).toBe(before);
    expectPieceAt(board, 'e1', 'king', 'white');
    expectPieceAt(board, 'h1', 'rook', 'white');
    expectEmpty(board, 'f1');
    expectEmpty(board, 'g1');
  });
});
