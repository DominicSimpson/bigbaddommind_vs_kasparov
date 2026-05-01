import { ChessBoard } from "./board/ChessBoard.js";
import { createGameSetup } from "./game/setup.js";
import type { SideLabels } from "./game/setup.js";
import { createComputerPlayer } from "./player/ComputerPlayer.js";
import type { ComputerDifficulty } from "./player/ComputerPlayer.js";
import type { Square } from "./board/Square.js";
import { isTerminalGameResult } from "./types/GameResult.js";
import type { Colour } from "./types/colour.js";
import { FILES, RANKS } from "./types/coords.js";
import type { Move } from "./types/Move.js";
import { chooseGameOptions, choosePromotionPiece } from "../ui/modalPopupWindow.js";
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
let playerColour: Colour = "white";
let selectedCoord: string | null = null;
let computerColour: Colour | null = null;
let computerDifficulty: ComputerDifficulty | null = null;
let isAwaitingPromotionChoice = false;

function getLegalMovesForCoord(coord: string | null): Move[] {
  if (!coord) {
    return [];
  }

  const square = getSquareByCoord(coord);
  if (!square?.piece) {
    return [];
  }

  return board.getLegalMoves(square.rank, square.file);
}

// Redraws the board and status UI from the current board state:
function renderGame(): void {
  const legalMoves = getLegalMovesForCoord(selectedCoord);
  const legalMoveCoords = new Set<string>();
  const legalCaptureCoords = new Set<string>();

  for (const move of legalMoves) {
    const destinationCoord = board.getSquare(move.toRank, move.toFile).coord;

    if (move.isCapture) {
      legalCaptureCoords.add(destinationCoord);
      continue;
    }

    legalMoveCoords.add(destinationCoord);
  }

  renderBoard(board, boardRoot, {
    selectedCoord,
    legalMoveCoords,
    legalCaptureCoords,
  });
  renderStatus(board, status, turnBadge, sideLabels);
}

// If setup fails, it still renders the board, shows the error text, 
// and clears the turn badge:
function renderSetupError(message: string): void {
  renderBoard(board, boardRoot, { selectedCoord });
  status.textContent = message;
  turnBadge.textContent = "";
}

function getSquareByCoord(coord: string): Square | null {
  for (const rank of RANKS) {
    for (const file of FILES) {
      const square = board.getSquare(rank, file);

      if (square.coord === coord) {
        return square;
      }
    }
  }

  return null;
}

async function handleBoardClick(event: MouseEvent): Promise<void> {
  if (board.getSideToMove() !== playerColour || isAwaitingPromotionChoice) {
    return;
  }

  const target = event.target;
  if (!(target instanceof Element)) {
    return;
  }

  const squareElement = target.closest<HTMLElement>(".square");
  if (!squareElement) {
    return;
  }

  const coord = squareElement.dataset.coord;
  if (!coord) {
    return;
  }

  const square = getSquareByCoord(coord);
  if (!selectedCoord) {
    if (!square?.piece || square.piece.colour !== playerColour) {
      return;
    }

    selectedCoord = coord;
    renderGame();
    return;
  }

  if (square?.piece?.colour === playerColour) {
    selectedCoord = selectedCoord === coord ? null : coord;
    renderGame();
    return;
  }

  const legalMoves = getLegalMovesForCoord(selectedCoord);
  const candidateMoves = legalMoves.filter(move => (
    board.getSquare(move.toRank, move.toFile).coord === coord
  ));

  if (candidateMoves.length === 0) {
    return;
  }

  let chosenMove = candidateMoves[0];

  if (candidateMoves.some(move => move.promotion)) {
    const promotingPiece = getSquareByCoord(selectedCoord)?.piece;
    if (!promotingPiece) {
      return;
    }

    isAwaitingPromotionChoice = true;

    try {
      const promotionChoice = await choosePromotionPiece(promotingPiece.colour);
      const matchingMove = candidateMoves.find(move => move.promotion === promotionChoice);

      if (!matchingMove) {
        return;
      }

      chosenMove = matchingMove;
    } catch {
      selectedCoord = null;
      renderGame();
      return;
    } finally {
      isAwaitingPromotionChoice = false;
    }
  }

  board.makeMove(chosenMove);
  selectedCoord = null;
  renderGame();

  if (computerColour && computerDifficulty) {
    playComputerTurnIfNeeded(computerColour, computerDifficulty);
  }
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
    selectedCoord = null;
    renderGame();
  }, 250);
}

// startup flow:
async function initialiseGame(): Promise<void> {
  try {
    const {
      playerColour: chosenPlayerColour,
      computerDifficulty: chosenComputerDifficulty,
      playerName,
    } = await chooseGameOptions();
    const setup = createGameSetup(chosenPlayerColour, chosenComputerDifficulty, playerName);
    selectedCoord = null;
    playerColour = setup.playerColour;
    computerColour = setup.computerColour;
    computerDifficulty = setup.computerDifficulty;
    sideLabels = setup.sideLabels;

    renderGame();
    playComputerTurnIfNeeded(setup.computerColour, setup.computerDifficulty);
  } catch (error) {
    const message = error instanceof Error
      ? error.message
      : "Unable to start the game setup.";

    renderSetupError(message);
  }
}
// kicks everything off when the module loads:
boardRoot.addEventListener("click", handleBoardClick);
void initialiseGame();
