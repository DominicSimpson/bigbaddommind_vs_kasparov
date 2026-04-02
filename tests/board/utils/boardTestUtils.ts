import { expect } from 'vitest';
import { ChessBoard } from '../../../src/board/ChessBoard';
import type { File, Rank } from '../../../src/types/coords';
import { algebraicToCoords } from '../../move/utils/moveTestUtils';

// Utility functions for board tests:
export function createBoard(fen: string): ChessBoard {
  const board = new ChessBoard();
  board.loadFEN(fen);
  return board;
}

// Finds a legal move from 'from' to 'to' in algebraic notation (e.g. "e2" to "e4"):
export function expectBoardUnchanged(board: ChessBoard, fn: () => void) {
  const before = board.toFEN();
  // Run the function that should not change the board:
  fn();
  const after = board.toFEN();
  expect(after).toBe(before);
}

// Checks if there's a legal move from 'from' to 'to' in algebraic notation (e.g. "e2" to "e4"):
export function expectPieceAt(
    board: ChessBoard, 
    square: string, 
    type: string, 
    colour: string
) {
    const { rank, file } = algebraicToCoords(square);
    const piece = board.getSquare(rank, file).piece;
  
    expect(piece?.type).toBe(type);
    expect(piece?.colour).toBe(colour);
}

// Checks if the square is empty (no piece) in algebraic notation (e.g. "e4"):
export function expectEmpty(board: ChessBoard, square: string) {
    const { rank, file } = algebraicToCoords(square);
    expect(board.getSquare(rank, file).piece).toBeNull();
}

// Checks if the legal moves from 'from' include a move to 'to' in algebraic notation (e.g. "e2" to "e4"):
export function expectLegalDestinations(
  board: ChessBoard,
  rank: Rank,
  file: File,
  expected: string[]  
) {
  const moves = board.getLegalMoves(rank, file);
  // Convert legal moves to their algebraic destination squares:
  const destinations = moves
    .map(move => board.getSquare(move.toRank, move.toFile).coord)
    .sort();
    // Sort expected destinations for comparison:
  expect(destinations).toEqual([...expected].sort());
}