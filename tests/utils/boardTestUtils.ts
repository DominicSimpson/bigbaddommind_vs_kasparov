import { expect } from 'vitest';
import { ChessBoard } from '../../src/board/ChessBoard';

export function expectBoardUnchanged(board: ChessBoard, fn: () => void) {
  const before = board.toFEN();

  fn();

  const after = board.toFEN();

  expect(after).toBe(before);

}