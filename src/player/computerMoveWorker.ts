/// <reference lib="webworker" />

import { ChessBoard } from "../board/ChessBoard.js";
import { createComputerPlayer } from "./ComputerPlayer.js";
import type { ComputerDifficulty } from "./ComputerPlayer.js";
import type { Move } from "../types/Move.js";
import type { Colour } from "../types/colour.js";

// // This worker listens for messages containing the current game state 
// (in FEN format), the desired difficulty level, and the colour of the 
// computer player. It then calculates the best move for the computer player 
// and sends it back to the main thread. This can combat visual latency issues by 
// offloading the potentially time-consuming move calculation to a separate 
// thread, ensuring that the main UI remains responsive.
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

const workerScope = self as DedicatedWorkerGlobalScope;

workerScope.addEventListener("message", (event: MessageEvent<WorkerRequest>) => {
  const { id, fen, difficulty, colour } = event.data;
  const board = new ChessBoard();
  board.loadFEN(fen);

  const move = createComputerPlayer(difficulty).chooseMove(board, colour);
  const response: WorkerResponse = {
    id,
    move,
  };

  workerScope.postMessage(response);
});
