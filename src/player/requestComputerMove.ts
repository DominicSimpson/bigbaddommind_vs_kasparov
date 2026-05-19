import { ChessBoard } from "../board/ChessBoard.js";
import { createComputerPlayer } from "./ComputerPlayer.js";
import type { ComputerDifficulty } from "./ComputerPlayer.js";
import type { Move } from "../types/Move.js";
import type { Colour } from "../types/colour.js";

type WorkerRequest = {
  id: number;
  fen: string;
  difficulty: ComputerDifficulty;
  colour: Colour;
};

type WorkerResponse = {
  id: number;
  move: Move | null;
};

let worker: Worker | null = null;
let nextRequestId = 0;

function getWorker(): Worker | null {
  if (typeof Worker === "undefined") {
    return null;
  }

  if (!worker) {
    worker = new Worker(
      new URL("./computerMoveWorker.ts", import.meta.url),
      { type: "module" },
    );
  }

  return worker;
}

function chooseMoveOnMainThread(
  board: ChessBoard,
  difficulty: ComputerDifficulty,
  colour: Colour,
): Promise<Move | null> {
  return Promise.resolve().then(() => (
    createComputerPlayer(difficulty).chooseMove(board, colour)
  ));
}

export function requestComputerMove(
  board: ChessBoard,
  difficulty: ComputerDifficulty,
  colour: Colour,
): Promise<Move | null> {
  const activeWorker = getWorker();

  if (!activeWorker) {
    return chooseMoveOnMainThread(board, difficulty, colour);
  }

  const id = ++nextRequestId;
  const request: WorkerRequest = {
    id,
    fen: board.toFEN(),
    difficulty,
    colour,
  };

  return new Promise((resolve, reject) => {
    const handleMessage = (event: MessageEvent<WorkerResponse>): void => {
      if (event.data.id !== id) {
        return;
      }

      activeWorker.removeEventListener("message", handleMessage);
      activeWorker.removeEventListener("error", handleError);
      resolve(event.data.move);
    };

    const handleError = (event: ErrorEvent): void => {
      activeWorker.removeEventListener("message", handleMessage);
      activeWorker.removeEventListener("error", handleError);
      reject(event.error ?? new Error(event.message));
    };

    activeWorker.addEventListener("message", handleMessage);
    activeWorker.addEventListener("error", handleError, { once: true });
    activeWorker.postMessage(request);
  });
}
