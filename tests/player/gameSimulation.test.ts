import { describe, expect, it } from 'vitest';
import { ChessBoard } from '../../src/board/ChessBoard.js';
import { RandomMovePlayer } from '../../src/player/RandomMovePlayer.js';
import type { Move } from '../../src/types/Move.js';
import type { GameResult } from '../../src/types/GameResult.js';

interface Player {
    playMove(board: ChessBoard): Move | null;
}

class FirstLegalMovePlayer implements Player {
    public playMove(board: ChessBoard): Move | null {
        const move = [...board.getAllLegalMoves()].sort(compareMoves)[0] ?? null;
        if (!move) return null;

        board.makeMove(move);
        return move;
    }
}

function compareMoves(a: Move, b: Move): number {
    return (
        a.fromRank - b.fromRank ||
        a.fromFile - b.fromFile ||
        a.toRank - b.toRank ||
        a.toFile - b.toFile ||
        (a.promotion ?? '').localeCompare(b.promotion ?? '')
    );
}

function createCyclingRandom(values: number[]): () => number {
    let index = 0;

    return () => {
        const value = values[index % values.length];
        index++;
        return value;
    };
}

function playGame(
    board: ChessBoard,
    white: Player,
    black: Player,
    maxPlies = 120
): { plies: number; result: GameResult } {
    for (let ply = 0; ply < maxPlies; ply++) {
        const result = board.getGameStatus();
        if (result.status !== 'ongoing') {
            return { plies: ply, result };
        }

        const player = board.getSideToMove() === 'white' ? white : black;
        const move = player.playMove(board);

        expect(move).not.toBeNull();
    }

    return { plies: maxPlies, result: board.getGameStatus() };
}

describe('game simulations', () => {
    it('supports engine-vs-random play from the starting position', () => {
        const board = new ChessBoard();
        const startingFen = board.toFEN();
        const engine = new FirstLegalMovePlayer();
        const random = new RandomMovePlayer(createCyclingRandom([0.91, 0.17, 0.63, 0.28, 0.74]));

        const outcome = playGame(board, engine, random);

        expect(outcome.plies).toBeGreaterThan(0);
        expect(outcome.plies).toBeLessThanOrEqual(120);
        expect(board.toFEN()).not.toBe(startingFen);
    });

    it('supports random-vs-random play from the starting position', () => {
        const board = new ChessBoard();
        const startingFen = board.toFEN();
        const white = new RandomMovePlayer(createCyclingRandom([0.05, 0.44, 0.87, 0.23, 0.61]));
        const black = new RandomMovePlayer(createCyclingRandom([0.92, 0.31, 0.58, 0.14, 0.76]));

        const outcome = playGame(board, white, black);

        expect(outcome.plies).toBeGreaterThan(0);
        expect(outcome.plies).toBeLessThanOrEqual(120);
        expect(board.toFEN()).not.toBe(startingFen);
    });
});
