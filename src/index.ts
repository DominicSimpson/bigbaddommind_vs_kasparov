import { ChessBoard } from "./board/ChessBoard.js";
import { createGameSetup } from "./game/setup.js";
import type { SideLabels } from "./game/setup.js";
import { createComputerPlayer } from "./player/ComputerPlayer.js";
import type { ComputerDifficulty } from "./player/ComputerPlayer.js";
import { isTerminalGameResult } from "./types/GameResult.js";
import type { Colour } from "./types/colour.js";
import { chooseGameOptions } from "../ui/modalPopupWindow.js";
import { getAppElements } from "../ui/input.js";
import { renderBoard } from "../ui/renderBoard.js";
import { renderStatus } from "../ui/renderStatus.js";

// Coordinator file that starts the game, connects the model to the UI, 
// and asks the computer to move when appropriate

// single ChessBoard instance for the whole app:
const board = new ChessBoard();
// grabs DOM elements like the board container and status labels:
const { boardRoot, status, turnBadge } = getAppElements();
let sideLabels: SideLabels = {
  white: "White",
  black: "Black",
};

// Redraws the board and status UI from the current board state:
function renderGame(): void {
  renderBoard(board, boardRoot);
  renderStatus(board, status, turnBadge, sideLabels);
}

// If setup fails, it still renders the board, shows the error text, 
// and clears the turn badge:
function renderSetupError(message: string): void {
  renderBoard(board, boardRoot);
  status.textContent = message;
  turnBadge.textContent = "";
}

// // Computer-move trigger. It:
// - checks whether it's currently the computer's turn
// - checks the game isn't already over
// - waits 250ms
// - checks those conditions again
// - creates a computer player and tells it to make a move
// - re-renders the UI
function playComputerTurnIfNeeded(
  computerColour: Colour,
  computerDifficulty: ComputerDifficulty,
): void {
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

    const computerPlayer = createComputerPlayer(computerDifficulty);
    computerPlayer.playMove(board, computerColour);
    renderGame();
  }, 250);
}

// startup flow:
async function initialiseGame(): Promise<void> {
  try {
    const { playerColour, computerDifficulty, playerName } = await chooseGameOptions();
    const setup = createGameSetup(playerColour, computerDifficulty, playerName);
    const computerColour: Colour = setup.computerColour;
    sideLabels = setup.sideLabels;

    renderGame();
    playComputerTurnIfNeeded(computerColour, setup.computerDifficulty);
  } catch (error) {
    const message = error instanceof Error
      ? error.message
      : "Unable to start the game setup.";

    renderSetupError(message);
  }
}
// kicks everything off when the module loads:
void initialiseGame();
