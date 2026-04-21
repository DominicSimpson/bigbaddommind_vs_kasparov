import { ChessBoard } from "./board/ChessBoard.js";
import { createComputerPlayer } from "./player/ComputerPlayer.js";
import { isTerminalGameResult } from "./types/GameResult.js";
import type { Colour } from "./types/colour.js";
import { choosePlayerColour } from "../ui/choosePlayerColour.js";
import { getAppElements } from "../ui/input.js";
import { renderBoard } from "../ui/renderBoard.js";
import { renderStatus } from "../ui/renderStatus.js";

const board = new ChessBoard();
const { boardRoot, status, turnBadge } = getAppElements();

function renderGame(): void {
  renderBoard(board, boardRoot);
  renderStatus(board, status, turnBadge);
}

function renderSetupError(message: string): void {
  renderBoard(board, boardRoot);
  status.textContent = message;
  turnBadge.textContent = "";
}

function playComputerTurnIfNeeded(computerColour: Colour): void {
  if (board.getSideToMove() !== computerColour) {
    return;
  }

  if (isTerminalGameResult(board.getGameStatus())) {
    return;
  }

  window.setTimeout(() => {
    if (board.getSideToMove() !== computerColour) {
      return;
    }

    if (isTerminalGameResult(board.getGameStatus())) {
      return;
    }

    const computerPlayer = createComputerPlayer("medium");
    computerPlayer.playMove(board, computerColour);
    renderGame();
  }, 250);
}

function initialiseGame(): void {
  try {
    const playerColour = choosePlayerColour();
    const computerColour: Colour = playerColour === "white" ? "black" : "white";

    renderGame();
    playComputerTurnIfNeeded(computerColour);
  } catch (error) {
    const message = error instanceof Error
      ? error.message
      : "Unable to start the game setup.";

    renderSetupError(message);
  }
}

initialiseGame();
