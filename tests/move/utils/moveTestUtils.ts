import { expect } from 'vitest';
import { ChessBoard } from '../../../src/board/ChessBoard.js';
import type { Rank, File } from '../../../src/types/coords.js';
import type { Move } from '../../../src/types/Move.js';

type MoveMatcher = Partial<
    Pick<Move, 'promotion' | 'castle' | 'enPassant' | 'isCapture'>
>;

function moveMatches(board: ChessBoard, move: Move, to: string, matcher?: MoveMatcher): boolean {
    const coord = board.getSquare(move.toRank, move.toFile).coord;
    if (coord !== to) return false;
    if (!matcher) return true;

    return Object.entries(matcher).every(([key, value]) => {
        if (value === undefined) return true;
        const moveKey = key as keyof MoveMatcher;
        return move[moveKey] === value;
    });
}

// Utility functions for move tests:
export function getMove(
    board: ChessBoard,
    from: string,
    to: string,
    matcher?: MoveMatcher
) {
    const { rank, file } = algebraicToCoords(from);
    // Find a legal move from 'from' to 'to' in algebraic notation (e.g. "e2" to "e4"):
    return board.getLegalMoves(rank, file).find(move => moveMatches(board, move, to, matcher));
}


// Simple algebraic parser for tests: converts algebraic notation (e.g. "e4") to internal coordinates (rank, file)
export function algebraicToCoords(square: string): {rank: Rank; file: File} {
    // RegEx validates input format (a-h followed by 1-8):
    if (!/^[a-h][1-8]$/.test(square)) {
        throw new Error(`Invalid square: ${square}`);
    }
    
    const file = (square.charCodeAt(0) - 'a'.charCodeAt(0)) as File; // 'a' -> 0, 'b' -> 1, ..., 'h' -> 7
    const rank = (Number(square[1]) - 1) as Rank; // '1' -> 0, '2' -> 1, ..., '8' -> 7

    return { rank, file };
}

// Checks if there's a legal move from 'from' to 'to' in algebraic notation (e.g. "e2" to "e4"):
export function hasLegalMoveByAlgebraicNotation(
    board: ChessBoard,
    from: string,
    to: string,
    matcher?: MoveMatcher
): boolean {
    const fromSquare = algebraicToCoords(from);

    const legalMoves = board.getLegalMoves(fromSquare.rank, fromSquare.file);
    // Check if any legal move matches the from and to coordinates:
    return legalMoves.some(
        move =>
            move.fromRank === fromSquare.rank &&
            move.fromFile === fromSquare.file &&
            moveMatches(board, move, to, matcher)
    );
}
