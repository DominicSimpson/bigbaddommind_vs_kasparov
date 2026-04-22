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

const board = new ChessBoard();
const { boardRoot, status, turnBadge } = getAppElements();
let sideLabels: SideLabels = {
  white: "White",
  black: "Black",
};

function renderGame(): void {
  renderBoard(board, boardRoot);
  renderStatus(board, status, turnBadge, sideLabels);
}

function renderSetupError(message: string): void {
  renderBoard(board, boardRoot);
  status.textContent = message;
  turnBadge.textContent = "";
}

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

void initialiseGame();
