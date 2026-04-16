import { describe, it, expect } from 'vitest';
import { ChessBoard } from '../../src/board/ChessBoard.js';
import { expectPieceAt, expectEmpty } from './utils/boardTestUtils.js';
import { getMove } from '../move/utils/moveTestUtils.js';

function playMove(board: ChessBoard, from: string, to: string) {
  const move = getMove(board, from, to);
  if (!move) throw new Error(`Expected move ${from} -> ${to} to exist`);
  board.makeMove(move);
}

function playMoveSequence(board: ChessBoard, moves: Array<[string, string]>) {
  for (const [from, to] of moves) {
    playMove(board, from, to);
  }
}

describe('whole-game flow integration', () => {
  it('plays Fool\'s Mate from the starting position and ends in checkmate', () => {
    const board = new ChessBoard();

    playMoveSequence(board, [
      ['f2', 'f3'],
      ['e7', 'e5'],
      ['g2', 'g4'],
      ['d8', 'h4'],
    ]);

    expectPieceAt(board, 'f3', 'pawn', 'white');
    expectPieceAt(board, 'e5', 'pawn', 'black');
    expectPieceAt(board, 'g4', 'pawn', 'white');
    expectPieceAt(board, 'h4', 'queen', 'black');
    expect(board.getGameStatus()).toEqual({ status: 'checkmate', winner: 'black' });
    expect(board.getLegalMoves()).toHaveLength(0);
    expect(board.toFEN()).toBe('rnb1kbnr/pppp1ppp/8/4p3/6Pq/5P2/PPPPP2P/RNBQKBNR w KQkq - 1 3');
  });

  it('supports a realistic opening flow with both sides castling and keeps the game ongoing', () => {
    const board = new ChessBoard();

    playMoveSequence(board, [
      ['e2', 'e4'],
      ['e7', 'e5'],
      ['g1', 'f3'],
      ['b8', 'c6'],
      ['f1', 'c4'],
      ['f8', 'c5'],
      ['d2', 'd3'],
      ['g8', 'f6'],
      ['e1', 'g1'],
      ['e8', 'g8'],
    ]);

    expectEmpty(board, 'e1');
    expectEmpty(board, 'h1');
    expectEmpty(board, 'e8');
    expectEmpty(board, 'h8');
    expectPieceAt(board, 'g1', 'king', 'white');
    expectPieceAt(board, 'f1', 'rook', 'white');
    expectPieceAt(board, 'g8', 'king', 'black');
    expectPieceAt(board, 'f8', 'rook', 'black');
    expect(board.getGameStatus()).toEqual({ status: 'active' });
    expect(board.getSideToMove()).toBe('white');
  });

  it('can undo an entire move sequence back to the exact starting position', () => {
    const board = new ChessBoard();
    const start = board.toFEN();

    playMoveSequence(board, [
      ['e2', 'e4'],
      ['e7', 'e5'],
      ['g1', 'f3'],
      ['b8', 'c6'],
      ['f1', 'c4'],
      ['g8', 'f6'],
    ]);

    expect(board.canUndo()).toBe(true);
    expect(board.toFEN()).not.toBe(start);

    for (let i = 0; i < 6; i++) {
      board.undoMove();
    }

    expect(board.toFEN()).toBe(start);
    expect(board.getGameStatus()).toEqual({ status: 'active' });
    expect(board.getSideToMove()).toBe('white');
    expect(board.canUndo()).toBe(false);
  });
});
