import { describe, it, expect } from 'vitest';
import { ChessBoard } from '../../src/board/ChessBoard.js';
import { createBoard, expectPieceAt, expectEmpty } from './utils/boardTestUtils.js';
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
  it('returns all legal moves for the current side and for an explicitly requested side', () => {
    const board = createBoard('4k3/8/8/8/8/8/4P3/4K2R b - - 0 1');

    const currentMoves = board.getAllLegalMoves();
    const blackMoves = board.getAllLegalMoves('black');
    const whiteMoves = board.getAllLegalMoves('white');

    expect(currentMoves).toHaveLength(5);
    expect(blackMoves).toHaveLength(5);
    expect(whiteMoves).toHaveLength(15);
    expect(currentMoves).toEqual(blackMoves);
  });

  it('applies a legal move sequence and matches the expected board state after each move', () => {
    const board = new ChessBoard();

    const steps: Array<{
      move: [string, string];
      fen: string;
      sideToMove: 'white' | 'black';
      occupied: Array<[string, 'pawn' | 'knight', 'white' | 'black']>;
      empty?: string[];
    }> = [
      {
        move: ['e2', 'e4'],
        fen: 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1',
        sideToMove: 'black',
        occupied: [['e4', 'pawn', 'white']],
        empty: ['e2'],
      },
      {
        move: ['e7', 'e5'],
        fen: 'rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq e6 0 2',
        sideToMove: 'white',
        occupied: [['e4', 'pawn', 'white'], ['e5', 'pawn', 'black']],
        empty: ['e7'],
      },
      {
        move: ['g1', 'f3'],
        fen: 'rnbqkbnr/pppp1ppp/8/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R b KQkq - 1 2',
        sideToMove: 'black',
        occupied: [['e4', 'pawn', 'white'], ['e5', 'pawn', 'black'], ['f3', 'knight', 'white']],
        empty: ['g1'],
      },
      {
        move: ['b8', 'c6'],
        fen: 'r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 2 3',
        sideToMove: 'white',
        occupied: [
          ['e4', 'pawn', 'white'],
          ['e5', 'pawn', 'black'],
          ['f3', 'knight', 'white'],
          ['c6', 'knight', 'black'],
        ],
        empty: ['b8'],
      },
    ];

    for (const step of steps) {
      playMove(board, step.move[0], step.move[1]);

      expect(board.toFEN()).toBe(step.fen);
      expect(board.getSideToMove()).toBe(step.sideToMove);
      expect(board.getGameStatus()).toEqual({ status: 'active' });

      for (const [square, piece, colour] of step.occupied) {
        expectPieceAt(board, square, piece, colour);
      }

      for (const square of step.empty ?? []) {
        expectEmpty(board, square);
      }
    }
  });

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

  it('reaches stalemate through legal play', () => {
    const board = createBoard('7k/8/6QK/8/8/8/8/8 w - - 0 1');

    playMove(board, 'g6', 'f7');

    expectPieceAt(board, 'f7', 'queen', 'white');
    expectPieceAt(board, 'h6', 'king', 'white');
    expectPieceAt(board, 'h8', 'king', 'black');
    expectEmpty(board, 'g6');
    expect(board.getSideToMove()).toBe('black');
    expect(board.getLegalMoves()).toHaveLength(0);
    expect(board.getGameStatus()).toEqual({ status: 'stalemate' });
    expect(board.toFEN()).toBe('7k/5Q2/7K/8/8/8/8/8 b - - 1 1');
  });
});
