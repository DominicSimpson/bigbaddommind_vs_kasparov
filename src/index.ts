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
import {
  chooseGameOptions,
  choosePromotionPiece,
  resetStatusDialogs,
} from "../ui/modalPopupWindow.js";
import { getAppElements } from "../ui/input.js";
import type { ComputerMovePreview } from "../ui/renderBoard.js";
import { renderBoard } from "../ui/renderBoard.js";
import { renderCapturedPieces } from "../ui/renderCapturedPieces.js";
import { renderStatus, resetStatusAnnouncements } from "../ui/renderStatus.js";
import type { PieceType } from "./pieces/Piece.js";

// Coordinator file that starts the game, connects the model to the UI, 
// and asks the computer to move when appropriate

// single ChessBoard instance for the whole app:
const board = new ChessBoard();
// grabs DOM elements like the board container and status labels:
const { boardRoot, status, turnBadge, capturedPieces } = getAppElements();
let sideLabels: SideLabels = {
  white: "White",
  black: "Black",
};
let playerColour: Colour = "white";
let selectedCoord: string | null = null;
let computerColour: Colour | null = null;
let computerDifficulty: ComputerDifficulty | null = null;
let isAwaitingPromotionChoice = false;
// // This is used to trigger the "moving..." visual effect on the 
// piece that's about to move, while the computer is "thinking".
// Otherwise, the human player finds it hard to track the computer's move, 
// because the move happens immediately after the computer "thinks", 
// with no visual transition or indication of which piece just moved:
let computerMovingCoord: string | null = null;
let computerMovePreview: ComputerMovePreview | null = null;
// // How long the computer "thinks" for before making a move, in milliseconds.
// This is just to make the computer's moves feel less instantaneous and robotic,
// which makes the game more evenly paced and enjoyable:
const COMPUTER_MOVE_DELAY_MS = 2000;
const COMPUTER_MOVE_STEP_MS = 140;
const COMPUTER_MOVE_MIN_ANIMATION_MS = 420;
const INITIAL_POSITION_FEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";


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
    computerMovingCoord,
    computerMovePreview,
    legalMoveCoords,
    legalCaptureCoords,
  });
  renderStatus(board, status, turnBadge, sideLabels, {
    onPlayAgain: () => {
      void initialiseGame(false);
    },
  });
  renderCapturedPieces(board, capturedPieces);
}

// // If setup fails, it still renders the board, shows the error text, 
// and clears the turn badge:
function renderSetupError(message: string): void {
  renderBoard(board, boardRoot, {
    selectedCoord,
    computerMovingCoord,
    computerMovePreview,
  });
  status.textContent = message;
  turnBadge.textContent = "";
  renderCapturedPieces(board, capturedPieces);
}

function resetBoardForNewGame(): void {
  board.loadFEN(INITIAL_POSITION_FEN);
  selectedCoord = null;
  computerMovingCoord = null;
  computerMovePreview = null;
  isAwaitingPromotionChoice = false;
  resetStatusDialogs();
  resetStatusAnnouncements();
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

function delay(ms: number): Promise<void> {
  return new Promise(resolve => {
    window.setTimeout(resolve, ms);
  });
}

function toBoardCoord(rank: number, file: number): string {
  return `${"abcdefgh"[file]}${rank + 1}`;
}

// // Builds an array of coordinates representing the path a piece 
// takes from its origin to its destination: 
function buildLinearTraversalCoords(move: Move): string[] {
  const rankDelta = Math.sign(move.toRank - move.fromRank);
  const fileDelta = Math.sign(move.toFile - move.fromFile);
  const coords: string[] = [];
  let currentRank = move.fromRank + rankDelta;
  let currentFile = move.fromFile + fileDelta;

  while (currentRank !== move.toRank || currentFile !== move.toFile) {
    coords.push(toBoardCoord(currentRank, currentFile));
    currentRank += rankDelta;
    currentFile += fileDelta;
  }

  coords.push(board.getSquare(move.toRank, move.toFile).coord);
  return coords;
}

// // Knights move in an "L" shape, so their path isn't a straight line. Thus, 
// a separate function is required to build the array of coordinates 
// representing the path a knight takes:
function buildKnightTraversalCoords(move: Move): string[] {
  const rankDelta = move.toRank - move.fromRank;
  const fileDelta = move.toFile - move.fromFile;
  const rankDistance = Math.abs(rankDelta);
  const fileDistance = Math.abs(fileDelta);

  if (rankDistance === 2 && fileDistance === 1) {
    const rankStep = Math.sign(rankDelta);
    return [
      toBoardCoord(move.fromRank + rankStep, move.fromFile),
      toBoardCoord(move.fromRank + (rankStep * 2), move.fromFile),
      board.getSquare(move.toRank, move.toFile).coord,
    ];
  }

  if (rankDistance === 1 && fileDistance === 2) {
    const fileStep = Math.sign(fileDelta);
    return [
      toBoardCoord(move.fromRank, move.fromFile + fileStep),
      toBoardCoord(move.fromRank, move.fromFile + (fileStep * 2)),
      board.getSquare(move.toRank, move.toFile).coord,
    ];
  }

  return [board.getSquare(move.toRank, move.toFile).coord];
}

function getComputerMoveTraversalCoords(move: Move, pieceType: PieceType): string[] {
  if (pieceType === "knight") {
    return buildKnightTraversalCoords(move);
  }

  return buildLinearTraversalCoords(move);
}

// // Animates the computer's move by updating the computerMovePreview 
// // state with intermediate coordinates. The piece then visually "moves" 
// // across the board by re-rendering the board for each intermediate coordinate.
// // The animation is just a visual effect, it doesn't affect the actual game 
// // state or move legality, and it doesn't update the board until the 
// // computer has "finished thinking" and is ready to make its move. 
// Its purpose is so that the human player can see which piece the 
// computer is moving, and track it across the board:
async function animateComputerMove(move: Move, pieceType: PieceType, colour: Colour): Promise<void> {
  const originCoord = board.getSquare(move.fromRank, move.fromFile).coord;
  const traversalCoords = getComputerMoveTraversalCoords(move, pieceType);
  const stepDelayMs = Math.max(
    COMPUTER_MOVE_STEP_MS,
    Math.ceil(COMPUTER_MOVE_MIN_ANIMATION_MS / traversalCoords.length),
  );

  computerMovePreview = {
    originCoord,
    currentCoord: originCoord,
    colour,
    pieceType,
  };
  computerMovingCoord = originCoord;
  renderGame();

  for (const currentCoord of traversalCoords) {
    computerMovePreview = {
      originCoord,
      currentCoord,
      colour,
      pieceType,
    };
    computerMovingCoord = currentCoord;
    renderGame();
    await delay(stepDelayMs);
  }
}

// // Click handler for the board. It handles piece selection, move attempts, 
// and promotion choice. When the user clicks on a square, it checks whether 
// they're selecting a piece, attempting to move a piece, or trying to 
// change their selection. If they're attempting to move a piece, it checks whether 
// the move is legal, and if so, makes the move on the board. If the move 
// involves a promotion, it waits for the user to choose a promotion piece 
// before making the move:
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
  computerMovingCoord = null;
  computerMovePreview = null;
  renderGame();

  if (computerColour && computerDifficulty) {
    playComputerTurnIfNeeded(computerColour, computerDifficulty);
  }
}

// // Computer-move trigger. It:
// - checks whether it's currently the computer's turn
// - checks the game isn't already over
// - waits 2000ms
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

  const computerPlayer = createComputerPlayer(computerDifficulty);
  const chosenMove = computerPlayer.chooseMove(board, computerColour);

  if (!chosenMove) {
    computerMovingCoord = null;
    renderGame();
    return;
  }

  computerMovingCoord = board.getSquare(chosenMove.fromRank, chosenMove.fromFile).coord;
  renderGame();

  window.setTimeout(() => {
    if (board.getSideToMove() !== computerColour) {
      computerMovingCoord = null;
      computerMovePreview = null;
      return;
    }

    if (isTerminalGameResult(board.getGameStatus())) {
      computerMovingCoord = null;
      computerMovePreview = null;
      return;
    }

    const movingPiece = board.getSquare(chosenMove.fromRank, chosenMove.fromFile).piece;
    if (!movingPiece) {
      computerMovingCoord = null;
      computerMovePreview = null;
      renderGame();
      return;
    }

    void animateComputerMove(chosenMove, movingPiece.type, computerColour)
      .then(() => {
        if (board.getSideToMove() !== computerColour) {
          computerMovingCoord = null;
          computerMovePreview = null;
          return;
        }

        if (isTerminalGameResult(board.getGameStatus())) {
          computerMovingCoord = null;
          computerMovePreview = null;
          return;
        }

        board.makeMove(chosenMove);
        selectedCoord = null;
        computerMovingCoord = null;
        computerMovePreview = null;
        renderGame();
      });
  }, COMPUTER_MOVE_DELAY_MS);
}

// startup flow:
async function initialiseGame(showSetupErrorOnCancel = true): Promise<void> {
  try {
    const {
      playerColour: chosenPlayerColour,
      computerDifficulty: chosenComputerDifficulty,
      playerName,
    } = await chooseGameOptions();
    const setup = createGameSetup(chosenPlayerColour, chosenComputerDifficulty, playerName);
    resetBoardForNewGame();
    playerColour = setup.playerColour;
    computerColour = setup.computerColour;
    computerDifficulty = setup.computerDifficulty;
    sideLabels = setup.sideLabels;

    renderGame();
    playComputerTurnIfNeeded(setup.computerColour, setup.computerDifficulty);
  } catch (error) {
    if (!showSetupErrorOnCancel && error instanceof Error && error.message === "Player colour selection was cancelled.") {
      renderGame();
      return;
    }

    const message = error instanceof Error
      ? error.message
      : "Unable to start the game setup.";

    renderSetupError(message);
  }
}
// kicks everything off when the module loads:
boardRoot.addEventListener("click", handleBoardClick);
void initialiseGame();
