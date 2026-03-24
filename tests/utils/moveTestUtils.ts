import { ChessBoard } from '../../src/board/ChessBoard';
import type { Rank, File } from '../../src/types/coords';


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

export function hasLegalMoveByAlgebraicNotation(
    board: ChessBoard,
    from: string,
    to: string
): boolean {
    const fromSquare = algebraicToCoords(from);
    const toSquare = algebraicToCoords(to);

    const legalMoves = board.getLegalMoves(fromSquare.rank, fromSquare.file);

    return legalMoves.some(
        move => 
            move.fromRank === fromSquare.rank && 
            move.fromFile === fromSquare.file && 
            move.toRank   === toSquare.rank && 
            move.toFile   === toSquare.file
    );
}