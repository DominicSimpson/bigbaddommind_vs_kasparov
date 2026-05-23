import { scoreMoves } from "../engine/minimax.js";
import type { Move } from "../types/Move.js";
import type { Colour } from "../types/colour.js";
import type { ChessBoard } from "../board/ChessBoard.js";
import type { File, Rank } from "../types/coords.js";
import { MINIMAX_DIFFICULTY_PROFILES } from "./MinimaxPlayer.js";

type SupportedDifficulty = "easy" | "medium" | "hard";
const EASY_QUEEN_BLUNDER_CHANCE = 0.12;

function pickRandomMove<T>(moves: T[], randomFn: () => number): T | null {
    if (moves.length === 0) {
        return null;
    }

    const index = Math.min(
        Math.floor(randomFn() * moves.length),
        moves.length - 1
    );

    return moves[index];
}

function moveKey(move: Move): string {
    return [
        move.fromRank,
        move.fromFile,
        move.toRank,
        move.toFile,
        move.promotion ?? "",
        move.castle ?? "",
        move.enPassant ? "1" : "0",
        move.isCapture ? "1" : "0",
    ].join(":");
}

function findQueenSquare(board: ChessBoard, colour: Colour): {
    rank: Rank;
    file: File;
} | null {
    for (let rank = 0; rank < 8; rank += 1) {
        for (let file = 0; file < 8; file += 1) {
            const squareRank = rank as Rank;
            const squareFile = file as File;
            const piece = board.getPieceAt(squareRank, squareFile);
            if (piece?.type === "queen" && piece.colour === colour) {
                return { rank: squareRank, file: squareFile };
            }
        }
    }

    return null;
}

export function isOwnQueenAttacked(board: ChessBoard, colour: Colour): boolean {
    const queenSquare = findQueenSquare(board, colour);
    if (!queenSquare) {
        return false;
    }

    const opponent = colour === "white" ? "black" : "white";
    return board.isSquareAttackedBy(queenSquare.rank, queenSquare.file, opponent);
}

export function moveKeepsOwnQueenSafe(
    board: ChessBoard,
    move: Move,
    colour: Colour
): boolean {
    const nextBoard = board.cloneWithMove(move);
    const nextStatus = nextBoard.getGameStatus();

    if (nextStatus.status === "checkmate" && nextStatus.winner === colour) {
        return true;
    }

    return !isOwnQueenAttacked(nextBoard, colour);
}

export function refineComputerMoveForQueenSafety(
    board: ChessBoard,
    colour: Colour,
    difficulty: SupportedDifficulty,
    chosenMove: Move | null,
    randomFn: () => number = Math.random
): Move | null {
    if (!chosenMove || difficulty === "hard" || !findQueenSquare(board, colour)) {
        return chosenMove;
    }

    const legalMoves = board.getAllLegalMoves(colour);
    const queenSafeMoves = legalMoves.filter(move => moveKeepsOwnQueenSafe(board, move, colour));

    if (queenSafeMoves.length === 0) {
        return chosenMove;
    }

    const queenSafeMoveKeys = new Set(queenSafeMoves.map(moveKey));
    if (queenSafeMoveKeys.has(moveKey(chosenMove))) {
        return chosenMove;
    }

    if (difficulty === "easy") {
        if (randomFn() < EASY_QUEEN_BLUNDER_CHANCE) {
            return chosenMove;
        }

        return pickRandomMove(queenSafeMoves, randomFn) ?? chosenMove;
    }

    const profile = MINIMAX_DIFFICULTY_PROFILES.medium;
    const scoredQueenSafeMoves = scoreMoves(board, profile.depth, colour, {
        orderMoves: profile.orderMoves,
    }).filter(({ move }) => queenSafeMoveKeys.has(moveKey(move)));

    if (scoredQueenSafeMoves.length === 0) {
        return chosenMove;
    }

    const bestScore = scoredQueenSafeMoves[0].score;
    const bestMoves = scoredQueenSafeMoves
        .filter(({ score }) => score === bestScore)
        .map(({ move }) => move);

    return pickRandomMove(bestMoves, randomFn) ?? chosenMove;
}
