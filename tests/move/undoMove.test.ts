import { describe, it, expect } from 'vitest';
import { createBoard, expectEmpty, expectPieceAt } from '../board/utils/boardTestUtils.js';
import { getMove } from './utils/moveTestUtils.js';
import type { PromotionPiece } from '../../src/types/Move.js';

function playMove(
  board: ReturnType<typeof createBoard>,
  from: string,
  to: string
) {
  const move = getMove(board, from, to);
  if (!move) throw new Error(`Expected move ${from} -> ${to} to exist`);
  board.makeMove(move);
}

function playPromotionMove(
  board: ReturnType<typeof createBoard>,
  from: string,
  to: string,
  promotion: PromotionPiece
) {
  const move = getMove(board, from, to, { promotion });
  if (!move) throw new Error(`Expected promotion move ${from} -> ${to}=${promotion} to exist`);
  board.makeMove(move);
}

describe('undoMove', () => {
  it('does nothing when there is no move to undo', () => {
    const board = createBoard('4k3/8/8/8/8/8/4P3/4K3 w - - 0 1');
    const before = board.toFEN();

    board.undoMove();

    expect(board.toFEN()).toBe(before);
    expect(board.canUndo()).toBe(false);
    expect(board.getSideToMove()).toBe('white');
  });

  it('undoes a quiet move and restores the exact previous position', () => {
    const board = createBoard('4k3/8/8/8/8/8/4P3/4K3 w - - 0 1');
    const before = board.toFEN();

    playMove(board, 'e2', 'e3');
    board.undoMove();

    expect(board.toFEN()).toBe(before);
    expectPieceAt(board, 'e2', 'pawn', 'white');
    expectEmpty(board, 'e3');
    expect(board.getSideToMove()).toBe('white');
  });

  it('undoes a normal capture and restores the captured piece', () => {
    const board = createBoard('4k3/8/8/3p4/4P3/8/8/4K3 w - - 0 1');
    const before = board.toFEN();

    playMove(board, 'e4', 'd5');
    board.undoMove();

    expect(board.toFEN()).toBe(before);
    expectPieceAt(board, 'e4', 'pawn', 'white');
    expectPieceAt(board, 'd5', 'pawn', 'black');
  });

  it('undoes a double pawn push and restores the previous en passant state', () => {
    const board = createBoard('4k3/8/8/8/8/8/4P3/4K3 w - - 7 1');
    const before = board.toFEN();

    playMove(board, 'e2', 'e4');
    expect(board.toFEN()).toBe('4k3/8/8/8/4P3/8/8/4K3 b - e3 0 1');

    board.undoMove();

    expect(board.toFEN()).toBe(before);
    expectPieceAt(board, 'e2', 'pawn', 'white');
    expectEmpty(board, 'e4');
  });

  it('undoes a rook move and restores castling rights', () => {
    const board = createBoard('4k3/8/8/8/8/8/8/R3K2R w KQ - 0 1');
    const before = board.toFEN();

    playMove(board, 'h1', 'h2');
    expect(board.toFEN()).toBe('4k3/8/8/8/8/8/7R/R3K3 b Q - 1 1');

    board.undoMove();

    expect(board.toFEN()).toBe(before);
    expect(board.canCastle('white', 'K')).toBe(true);
    expect(board.canCastle('white', 'Q')).toBe(true);
    expectPieceAt(board, 'h1', 'rook', 'white');
    expectEmpty(board, 'h2');
  });

  it('undoes a promotion and restores the pawn', () => {
    const board = createBoard('5k2/2P5/8/8/8/8/8/4K3 w - - 0 1');
    const before = board.toFEN();

    playPromotionMove(board, 'c7', 'c8', 'queen');
    board.undoMove();

    expect(board.toFEN()).toBe(before);
    expectPieceAt(board, 'c7', 'pawn', 'white');
    expectEmpty(board, 'c8');
  });

  it('undoes a promotion capture and restores both the pawn and captured piece', () => {
    const board = createBoard('1r3k2/P7/8/8/8/8/8/4K3 w - - 0 1');
    const before = board.toFEN();

    playPromotionMove(board, 'a7', 'b8', 'queen');
    board.undoMove();

    expect(board.toFEN()).toBe(before);
    expectPieceAt(board, 'a7', 'pawn', 'white');
    expectPieceAt(board, 'b8', 'rook', 'black');
    expectEmpty(board, 'a8');
  });

  it('undoes a black promotion and restores the pawn', () => {
    const board = createBoard('5k2/8/8/8/8/8/2p5/4K3 b - - 0 1');
    const before = board.toFEN();

    playPromotionMove(board, 'c2', 'c1', 'queen');
    board.undoMove();

    expect(board.toFEN()).toBe(before);
    expectPieceAt(board, 'c2', 'pawn', 'black');
    expectEmpty(board, 'c1');
  });

  it('undoes a capture of the queenside rook on its home square and restores castling rights', () => {
    const board = createBoard('r3k2r/8/8/8/3q4/8/8/R3K3 b Qkq - 0 1');
    const before = board.toFEN();

    playMove(board, 'd4', 'a1');
    expect(board.canCastle('white', 'Q')).toBe(false);

    board.undoMove();

    expect(board.toFEN()).toBe(before);
    expect(board.canCastle('white', 'Q')).toBe(true);
    expect(board.canCastle('black', 'K')).toBe(true);
    expect(board.canCastle('black', 'Q')).toBe(true);
    expectPieceAt(board, 'a1', 'rook', 'white');
    expectPieceAt(board, 'd4', 'queen', 'black');
  });

  it('undoes a capture of the kingside rook on its home square and restores castling rights', () => {
    const board = createBoard('r3k2r/8/8/7q/8/8/8/4K2R b Kkq - 0 1');
    const before = board.toFEN();

    playMove(board, 'h5', 'h1');
    expect(board.canCastle('white', 'K')).toBe(false);

    board.undoMove();

    expect(board.toFEN()).toBe(before);
    expect(board.canCastle('white', 'K')).toBe(true);
    expect(board.canCastle('black', 'K')).toBe(true);
    expect(board.canCastle('black', 'Q')).toBe(true);
    expectPieceAt(board, 'h1', 'rook', 'white');
    expectPieceAt(board, 'h5', 'queen', 'black');
  });

  it('undoes an unrelated move and restores the previous en passant target', () => {
    const board = createBoard('4k3/8/8/3pP3/8/8/8/4K2R w - d6 0 1');
    const before = board.toFEN();

    playMove(board, 'h1', 'h2');
    expect(board.toFEN()).toBe('4k3/8/8/3pP3/8/8/7R/4K3 b - - 1 1');

    board.undoMove();

    expect(board.toFEN()).toBe(before);
    expectPieceAt(board, 'h1', 'rook', 'white');
    expectEmpty(board, 'h2');
  });

  it('supports multiple undos in LIFO order', () => {
    const board = createBoard('4k3/8/8/8/8/8/4P3/4K2R w - - 0 1');
    const start = board.toFEN();

    playMove(board, 'e2', 'e4');
    const afterFirst = board.toFEN();
    playMove(board, 'e8', 'e7');
    const afterSecond = board.toFEN();
    playMove(board, 'h1', 'h2');
    const afterThird = board.toFEN();

    expect(afterThird).toBe('8/4k3/8/8/4P3/8/7R/4K3 b - - 2 2');

    board.undoMove();
    expect(board.toFEN()).toBe(afterSecond);

    board.undoMove();
    expect(board.toFEN()).toBe(afterFirst);

    board.undoMove();
    expect(board.toFEN()).toBe(start);
  });

  it('updates canUndo correctly as moves are made and undone', () => {
    const board = createBoard('4k3/8/8/8/8/8/4P3/4K3 w - - 0 1');

    expect(board.canUndo()).toBe(false);

    playMove(board, 'e2', 'e3');
    expect(board.canUndo()).toBe(true);

    board.undoMove();
    expect(board.canUndo()).toBe(false);
  });
});
