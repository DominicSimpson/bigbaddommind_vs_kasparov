import { describe, it, expect } from 'vitest';
import {
  createBoard,
  expectBoardUnchanged,
  expectEmpty,
  expectLegalDestinations,
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

describe('en passant', () => {
  it('lets white capture en passant and removes the pawn from the passed square', () => {
    const board = createBoard('4k3/8/8/3pP3/8/8/8/4K3 w - d6 0 1');

    playMove(board, 'e5', 'd6');

    expectEmpty(board, 'e5');
    expectEmpty(board, 'd5');
    expectPieceAt(board, 'd6', 'pawn', 'white');
    expect(board.toFEN()).toBe('4k3/8/3P4/8/8/8/8/4K3 b - - 0 1');
  });

  it('lets black capture en passant and removes the pawn from the passed square', () => {
    const board = createBoard('4k3/8/8/8/3pP3/8/8/4K3 b - e3 0 1');

    playMove(board, 'd4', 'e3');

    expectEmpty(board, 'd4');
    expectEmpty(board, 'e4');
    expectPieceAt(board, 'e3', 'pawn', 'black');
    expect(board.toFEN()).toBe('4k3/8/8/8/8/4p3/8/4K3 w - - 0 2');
  });

  it('only allows en passant on the immediately following move', () => {
    const board = createBoard('4k3/8/8/3pP3/8/8/8/4K2R w - d6 0 1');

    playMove(board, 'h1', 'h2');
    playMove(board, 'e8', 'e7');

    const { rank, file } = algebraicToCoords('e5');
    expectLegalDestinations(board, rank, file, ['e6']);
    expect(board.toFEN()).toBe('8/4k3/8/3pP3/8/8/7R/4K3 w - - 2 2');
  });

  it('rejects a forced en passant move when there is no current en passant target', () => {
    const board = createBoard('4k3/8/8/3pP3/8/8/8/4K3 w - - 0 1');
    const from = algebraicToCoords('e5');
    const to = algebraicToCoords('d6');

    const move: Move = {
      fromRank: from.rank,
      fromFile: from.file,
      toRank: to.rank,
      toFile: to.file,
      enPassant: true,
    };

    expectBoardUnchanged(board, () => {
      expect(() => board.makeMove(move, true)).toThrow(
        'Invalid en passant: destination is not the current en passant target'
      );
    });
  });

  it('restores the original position when an en passant capture is undone', () => {
    const board = createBoard('4k3/8/8/3pP3/8/8/8/4K3 w - d6 0 1');
    const before = board.toFEN();

    playMove(board, 'e5', 'd6');
    board.undoMove();

    expect(board.toFEN()).toBe(before);
    expectPieceAt(board, 'e5', 'pawn', 'white');
    expectPieceAt(board, 'd5', 'pawn', 'black');
    expectEmpty(board, 'd6');
  });
});
