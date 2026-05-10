import { describe, expect, it } from 'vitest';
import { ChessBoard } from '../../src/board/ChessBoard.js';
import { BasicComputerPlayer } from '../../src/player/BasicComputerPlayer.js';
import { ComputerPlayer } from '../../src/player/ComputerPlayer.js';
import { MinimaxPlayer } from '../../src/player/MinimaxPlayer.js';
import { RandomMovePlayer } from '../../src/player/RandomMovePlayer.js';
import type { Move } from '../../src/types/Move.js';
import type { GameResult } from '../../src/types/GameResult.js';

interface Player {
    playMove(board: ChessBoard): Move | null;
}

// The FirstLegalMovePlayer class is a simple implementation of a chess player 
// that always selects the first legal move available:
class FirstLegalMovePlayer implements Player {
    public playMove(board: ChessBoard): Move | null {
        const move = [...board.getAllLegalMoves()].sort(compareMoves)[0] ?? null;
        if (!move) return null;

        board.makeMove(move);
        return move;
    }
}

// The compareMoves function is a helper function used to sort moves in a 
// consistent order:
function compareMoves(a: Move, b: Move): number {
    return (
        a.fromRank - b.fromRank ||
        a.fromFile - b.fromFile ||
        a.toRank - b.toRank ||
        a.toFile - b.toFile ||
        (a.promotion ?? '').localeCompare(b.promotion ?? '')
    );
}

// The createCyclingRandom function creates a deterministic random number 
// generator that cycles through a given array of values. 
// This is useful for testing to ensure reproducibility while still simulating randomness:
function createCyclingRandom(values: number[]): () => number {
    let index = 0;

    return () => {
        const value = values[index % values.length];
        index++;
        return value;
    };
}

// The playGame function simulates a game of chess between two players on a given board. 
// It takes in a ChessBoard instance, two Player instances (one for white and one for black), 
// and an optional maximum number of plies to play before declaring a draw. 
// The function returns an object containing the total number of plies (one half-move)
// played and the final game result:
function playGame(
    board: ChessBoard,
    white: Player,
    black: Player,
    maxPlies = 120
): { plies: number; result: GameResult } {
    for (let ply = 0; ply < maxPlies; ply++) {
        const result = board.getGameStatus();
        if (result.status !== 'active' && result.status !== 'check') {
            return { plies: ply, result };
        }

        const player = board.getSideToMove() === 'white' ? white : black;
        const move = player.playMove(board);

        expect(move).not.toBeNull();
    }

    return { plies: maxPlies, result: board.getGameStatus() };
}

describe('game simulations', () => {
    it('supports minimax-vs-random play from the starting position', () => {
        const board = new ChessBoard();
        const startingFen = board.toFEN();
        const minimax = new MinimaxPlayer('easy');
        const random = new RandomMovePlayer(createCyclingRandom([0.91, 0.17, 0.63, 0.28, 0.74]));

        const outcome = playGame(board, minimax, random);

        expect(outcome.plies).toBeGreaterThan(0);
        expect(outcome.plies).toBeLessThanOrEqual(120);
        expect(board.toFEN()).not.toBe(startingFen);
    });

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

    it('supports basic-computer-vs-random play from the starting position', () => {
        const board = new ChessBoard();
        const startingFen = board.toFEN();
        const basic = new BasicComputerPlayer({
            randomFn: createCyclingRandom([0.13, 0.67, 0.24, 0.81, 0.4]),
        });
        const random = new RandomMovePlayer(createCyclingRandom([0.91, 0.17, 0.63, 0.28, 0.74]));

        const outcome = playGame(board, basic, random);

        expect(outcome.plies).toBeGreaterThan(0);
        expect(outcome.plies).toBeLessThanOrEqual(120);
        expect(board.toFEN()).not.toBe(startingFen);
    });

    it('supports packaged easy-vs-medium computer play from the starting position', () => {
        const board = new ChessBoard();
        const startingFen = board.toFEN();
        const easy = new ComputerPlayer('easy', {
            randomFn: createCyclingRandom([0.05, 0.44, 0.87, 0.23, 0.61]),
        });
        const medium = new ComputerPlayer('medium');

        const outcome = playGame(board, easy, medium);

        expect(outcome.plies).toBeGreaterThan(0);
        expect(outcome.plies).toBeLessThanOrEqual(120);
        expect(board.toFEN()).not.toBe(startingFen);
    }, 15000);

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
