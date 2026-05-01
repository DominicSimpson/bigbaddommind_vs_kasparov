import type { ChessBoard } from "../board/ChessBoard.js";
import { PIECE_VALUES } from "../engine/evaluatePosition.js";
import type { Move } from "../types/Move.js";
import type { Colour } from "../types/colour.js";

interface BasicComputerPlayerOptions {
    randomFn?: () => number;
    preferCaptures?: boolean;
    preferCheck?: boolean;
    avoidHangingPieces?: boolean; // see below
}

const CHECKMATE_BONUS = 100000;
const CHECK_BONUS = 75;
// Controls how scared the computer is of moving 
// a piece onto a square where it can be taken:
const HANGING_PIECE_PENALTY_FACTOR = 1;

// // Class scores each legal move with simple heuristics:
// bonus for captures
// bonus for check/checkmate
// penalty for moving a piece onto an attacked square
// Then it picks the highest-scoring move, breaking ties randomly:
export class BasicComputerPlayer {
    private readonly randomFn: () => number;

    private readonly preferCaptures: boolean;

    private readonly preferCheck: boolean;

    private readonly avoidHangingPieces: boolean;

    constructor(options: BasicComputerPlayerOptions = {}) {
        this.randomFn = options.randomFn ?? Math.random;
        this.preferCaptures = options.preferCaptures ?? true;
        this.preferCheck = options.preferCheck ?? true;
        this.avoidHangingPieces = options.avoidHangingPieces ?? true;
    }

    public chooseMove(board: ChessBoard, colour: Colour = board.getSideToMove()): Move | null {
        if (colour !== board.getSideToMove()) {
            throw new Error("BasicComputerPlayer can only choose for the side to move.");
        }

        const legalMoves = board.getAllLegalMoves(colour);
        if (legalMoves.length === 0) return null;

        let bestScore = Number.NEGATIVE_INFINITY;
        let bestMoves: Move[] = [];

        for (const move of legalMoves) {
            const score = this.scoreMove(board, move);

            if (score > bestScore) {
                bestScore = score;
                bestMoves = [move];
                continue;
            }

            if (score === bestScore) {
                bestMoves.push(move);
            }
        }

        const index = Math.floor(this.randomFn() * bestMoves.length);
        return bestMoves[Math.min(index, bestMoves.length - 1)];
    }
    // Stops the computer player from accidentially playing a move as the human player:
    public playMove(board: ChessBoard, colour: Colour = board.getSideToMove()): Move | null {
        if (colour !== board.getSideToMove()) {
            throw new Error("BasicComputerPlayer can only play for the side to move.");
        }

        const move = this.chooseMove(board, colour);
        if (!move) return null;

        board.makeMove(move);
        return move;
    }

    private scoreMove(board: ChessBoard, move: Move): number {
        let score = 0;

        if (this.preferCaptures) {
            score += this.getCaptureBonus(board, move);
        }

        const nextBoard = board.cloneWithMove(move);
        const mover = board.getSideToMove();
        const opponent = nextBoard.getSideToMove();
        const gameStatus = nextBoard.getGameStatus();

        if (this.preferCheck) {
            if (gameStatus.status === "checkmate" && gameStatus.winner === mover) {
                score += CHECKMATE_BONUS;
            } else if (nextBoard.isInCheck(opponent)) {
                score += CHECK_BONUS;
            }
        }

        if (this.avoidHangingPieces) {
            const movedPiece = nextBoard.getPieceAt(move.toRank, move.toFile);
            if (movedPiece && nextBoard.isSquareAttackedBy(move.toRank, move.toFile, opponent)) {
                score -= PIECE_VALUES[movedPiece.type] * HANGING_PIECE_PENALTY_FACTOR;
            }
        }

        return score;
    }
    // Assigns the same value as a normal pawn capture:
    private getCaptureBonus(board: ChessBoard, move: Move): number {
        if (move.enPassant) {
            return PIECE_VALUES.pawn;
        }

        const capturedPiece = board.getPieceAt(move.toRank, move.toFile);
        if (!capturedPiece) return 0;

        return PIECE_VALUES[capturedPiece.type];
    }
}

export type { BasicComputerPlayerOptions };
