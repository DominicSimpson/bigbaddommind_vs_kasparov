import { describe, expect, it } from "vitest";
import { ChessBoard } from "../../src/board/ChessBoard.js";
import {
  isCastlingMove,
  isCaptureMove,
  isDrawByFiftyMoveRuleSoundState,
  isDrawByInsufficientMaterialSoundState,
  isDrawByThreefoldRepetitionSoundState,
  isEnPassantMove,
  isCheckSoundState,
  isCheckmateSoundState,
  isOrdinaryMoveSoundState,
  isOrdinaryMoveCandidate,
  isPromotionMove,
  playCaptureSound,
  playCheckmateSound,
  playCheckSound,
  playOrdinaryMoveSound,
  isQuitGameSoundState,
  isStalemateSoundState,
} from "../../src/audio/moveSound.js";
import { getMove } from "../move/utils/moveTestUtils.js";
import { createBoard } from '../board/utils/boardTestUtils.js';


describe("moveSound", () => {
  it("treats a regular quiet move as an ordinary move candidate", () => {
    const board = new ChessBoard();
    const move = getMove(board, "g1", "f3");

    expect(move).toBeTruthy();
    expect(isOrdinaryMoveCandidate(board, move!)).toBe(true);

    board.makeMove(move!);

    expect(isOrdinaryMoveSoundState(board)).toBe(true);
  });

  it("does not treat castling as an ordinary move candidate", () => {
    const board = createBoard('r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1');
    const move = getMove(board, "e1", "g1");

    expect(move).toBeTruthy();
    expect(isCastlingMove(board, move!)).toBe(true);
    expect(isOrdinaryMoveCandidate(board, move!)).toBe(false);
  });

  it("does not treat en passant as an ordinary move candidate", () => {
    const board = createBoard('4k3/8/8/3pP3/8/8/8/4K3 w - d6 0 1');
    const move = getMove(board, "e5", "d6");

    expect(move).toBeTruthy();
    expect(isEnPassantMove(board, move!)).toBe(true);
    expect(isOrdinaryMoveCandidate(board, move!)).toBe(false);
  });

  it("does not treat promotion as an ordinary move candidate", () => {
    const board = createBoard('4k3/1P6/8/8/8/8/8/4K3 w - - 0 1');
    const move = getMove(board, "b7", "b8", { promotion: "queen" });

    expect(move).toBeTruthy();
    expect(isPromotionMove(board, move!)).toBe(true);
    expect(isOrdinaryMoveCandidate(board, move!)).toBe(false);
  });

  it("does not play the ordinary move sound when the move gives check", () => {
    const board = createBoard("4k3/8/8/8/8/8/7R/4K3 w - - 0 1");
    const move = getMove(board, "h2", "h8");

    expect(move).toBeTruthy();

    board.makeMove(move!);

    expect(isCheckSoundState(board)).toBe(true);
    expect(board.getGameStatus()).toEqual({ status: "check", sideInCheck: "black" });
    expect(isOrdinaryMoveSoundState(board)).toBe(false);
  });

  it("triggers the check sound state when white is put in check", () => {
    const board = createBoard("4k3/r7/8/8/8/8/8/4K3 b - - 0 1");
    const move = getMove(board, "a7", "a1");

    expect(move).toBeTruthy();

    board.makeMove(move!);

    expect(isCheckSoundState(board)).toBe(true);
    expect(board.getGameStatus()).toEqual({ status: "check", sideInCheck: "white" });
    expect(isOrdinaryMoveSoundState(board)).toBe(false);
  });

  it("treats a capture that gives check as check rather than an ordinary capture outcome", () => {
    const board = createBoard("4k3/4p3/8/8/8/8/4R3/4K3 w - - 0 1");
    const move = getMove(board, "e2", "e7");

    expect(move).toBeTruthy();
    expect(isCaptureMove(board, move!)).toBe(true);

    board.makeMove(move!);

    expect(isCheckSoundState(board)).toBe(true);
    expect(board.getGameStatus()).toEqual({ status: "check", sideInCheck: "black" });
    expect(isOrdinaryMoveSoundState(board)).toBe(false);
  });

  it("treats a capture that gives checkmate as checkmate rather than a capture outcome", () => {
    const board = createBoard("7k/6pp/5Q1K/8/8/8/8/8 w - - 0 1");
    const move = getMove(board, "f6", "g7");

    expect(move).toBeTruthy();
    expect(isCaptureMove(board, move!)).toBe(true);

    board.makeMove(move!);

    expect(isCheckmateSoundState(board)).toBe(true);
    expect(board.getGameStatus()).toEqual({ status: "checkmate", winner: "white" });
  });

  it("uses a distinct capture sound and supersedes it with check or checkmate after capturing moves", () => {
    const createdSources: string[] = [];

    class MockAudio {
      public preload = "";
      public currentTime = 0;

      constructor(public readonly src: string) {
        createdSources.push(src);
      }

      load(): void {}

      play(): Promise<void> {
        return Promise.resolve();
      }
    }

    const originalAudio = globalThis.Audio;
    globalThis.Audio = MockAudio as unknown as typeof Audio;

    try {
      playOrdinaryMoveSound();
      playCaptureSound();
      playCheckSound();
      playCheckmateSound();

      const ordinaryMoveSource = "/sounds/chesssounds_ordinarymove.mp3";
      const captureSource = "/sounds/chesssounds_capture.mp3";
      const checkSource = "/sounds/chesssounds_check.mp3";
      const checkmateSource = "/sounds/chesssounds_checkmate.mp3";

      expect(createdSources).toContain(ordinaryMoveSource);
      expect(createdSources).toContain(captureSource);
      expect(createdSources).toContain(checkSource);
      expect(createdSources).toContain(checkmateSource);
      expect(captureSource).not.toBe(ordinaryMoveSource);
      expect(captureSource).not.toBe(checkSource);
      expect(captureSource).not.toBe(checkmateSource);

      const ordinaryCaptureBoard = createBoard("4k3/8/8/3p4/4P3/8/8/4K3 w - - 0 1");
      const ordinaryCaptureMove = getMove(ordinaryCaptureBoard, "e4", "d5");

      expect(ordinaryCaptureMove).toBeTruthy();
      expect(isCaptureMove(ordinaryCaptureBoard, ordinaryCaptureMove!)).toBe(true);

      ordinaryCaptureBoard.makeMove(ordinaryCaptureMove!);

      expect(isCheckSoundState(ordinaryCaptureBoard)).toBe(false);
      expect(isCheckmateSoundState(ordinaryCaptureBoard)).toBe(false);

      const captureCheckBoard = createBoard("4k3/4p3/8/8/8/8/4R3/4K3 w - - 0 1");
      const captureCheckMove = getMove(captureCheckBoard, "e2", "e7");

      expect(captureCheckMove).toBeTruthy();
      expect(isCaptureMove(captureCheckBoard, captureCheckMove!)).toBe(true);

      captureCheckBoard.makeMove(captureCheckMove!);

      expect(isCheckSoundState(captureCheckBoard)).toBe(true);
      expect(isCheckmateSoundState(captureCheckBoard)).toBe(false);
      expect(checkSource).not.toBe(captureSource);

      const captureCheckmateBoard = createBoard("7k/6pp/5Q2/8/8/8/8/6K1 w - - 0 1");
      const captureCheckmateMove = getMove(captureCheckmateBoard, "f6", "g7");

      expect(captureCheckmateMove).toBeTruthy();
      expect(isCaptureMove(captureCheckmateBoard, captureCheckmateMove!)).toBe(true);

      captureCheckmateBoard.makeMove(captureCheckmateMove!);

      expect(isCheckmateSoundState(captureCheckmateBoard)).toBe(true);
      expect(checkmateSource).not.toBe(captureSource);
    } finally {
      globalThis.Audio = originalAudio;
    }
  });

  it("treats an unfinished game as eligible for the quit-game sound", () => {
    const board = new ChessBoard();

    expect(isQuitGameSoundState(board)).toBe(true);
  });

  it("does not treat a concluded game as eligible for the quit-game sound", () => {
    const board = createBoard("7k/6pp/5Q1K/8/8/8/8/8 w - - 0 1");
    const move = getMove(board, "f6", "g7");

    expect(move).toBeTruthy();

    board.makeMove(move!);

    expect(isQuitGameSoundState(board)).toBe(false);
  });

  it("detects a checking move via the board state after the move", () => {
    const board = createBoard('4k3/8/8/8/8/8/7R/4K3 w - - 0 1');
    const move = getMove(board, "h2", "h8");

    expect(move).toBeTruthy();

    board.makeMove(move!);

    expect(board.getGameStatus()).toEqual({ status: "check", sideInCheck: "black" });
  });

  it("detects a checkmating move via the board state after the move", () => {
    const board = createBoard('7k/4Q3/5K2/8/8/8/8/8 w - - 0 1');
    const move = getMove(board, "e7", "g7");

    expect(move).toBeTruthy();

    board.makeMove(move!);

    expect(board.getGameStatus()).toEqual({ status: "checkmate", winner: "white" });
  });

  it("detects a stalemate outcome via the board state after the move", () => {
    const board = createBoard("7k/8/5KQ1/8/8/8/8/8 w - - 0 1");
    const move = getMove(board, "g6", "f7");

    expect(move).toBeTruthy();

    board.makeMove(move!);

    expect(board.getGameStatus()).toEqual({ status: "stalemate" });
    expect(isStalemateSoundState(board)).toBe(true);
  });

  it("detects a draw by fifty-move rule via the board state after the move", () => {
    const board = createBoard("7k/8/8/8/8/8/5K2/6R1 w - - 99 50");
    const move = getMove(board, "g1", "h1");

    expect(move).toBeTruthy();

    board.makeMove(move!);

    expect(board.getGameStatus()).toEqual({ status: "drawByFiftyMoveRule" });
    expect(isDrawByFiftyMoveRuleSoundState(board, move!)).toBe(true);
  });

  it("detects a draw by repetition via the board state after the move", () => {
    const board = new ChessBoard();
    const moves = [
      ["g1", "f3"],
      ["g8", "f6"],
      ["f3", "g1"],
      ["f6", "g8"],
      ["g1", "f3"],
      ["g8", "f6"],
      ["f3", "g1"],
      ["f6", "g8"],
    ] as const;

    let finalMove = null;

    for (const [from, to] of moves) {
      const move = getMove(board, from, to);

      expect(move).toBeTruthy();
      board.makeMove(move!);
      finalMove = move;
    }

    expect(finalMove).toBeTruthy();
    expect(board.getGameStatus()).toEqual({ status: "drawByRepetition" });
    expect(isDrawByThreefoldRepetitionSoundState(board)).toBe(true);
  });

  it("detects a draw by insufficient material via the board state after the move", () => {
    const board = createBoard("7k/8/8/8/8/8/5b2/6BK b - - 0 1");
    const move = getMove(board, "f2", "g1");

    expect(move).toBeTruthy();

    board.makeMove(move!);

    expect(board.getGameStatus()).toEqual({ status: "drawByInsufficientMaterial" });
    expect(isDrawByInsufficientMaterialSoundState(board)).toBe(true);
  });
});
