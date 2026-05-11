import { ChessBoard } from "./board/ChessBoard.js";
import { createGameSetup } from "./game/setup.js";
import type { SideLabels } from "./game/setup.js";
import {
  isCastlingMove,
  isCaptureMove,
  isEnPassantMove,
  isOrdinaryMoveCandidate,
  isOrdinaryMoveSoundState,
  isPromotionMove,
  playCastlingSound,
  playCaptureSound,
  playCheckSound,
  playCheckmateSound,
  playEnPassantSound,
  playOrdinaryMoveSound,
  playQuitGameSound,
  playPromotionSound,
  isQuitGameSoundState,
  preloadCastlingSound,
  preloadCaptureSound,
  preloadCheckSound,
  preloadCheckmateSound,
  preloadDrawByFiftyMoveRuleSound,
  preloadDrawByInsufficientMaterialSound,
  preloadDrawByThreefoldRepetitionSound,
  preloadEnPassantSound,
  preloadOrdinaryMoveSound,
  preloadPromotionSound,
  preloadQuitGameSound,
  preloadStalemateSound,
  playDrawByFiftyMoveRuleSound,
  playDrawByInsufficientMaterialSound,
  playDrawByThreefoldRepetitionSound,
  playStalemateSound,
  isDrawByFiftyMoveRuleSoundState,
  isStalemateSoundState,
  isDrawByThreefoldRepetitionSoundState,
  isDrawByInsufficientMaterialSoundState,
} from "./audio/moveSound.js";
import { createComputerPlayer } from "./player/ComputerPlayer.js";
import type { ComputerDifficulty } from "./player/ComputerPlayer.js";
import type { Square } from "./board/Square.js";
import { isTerminalGameResult } from "./types/GameResult.js";
import type { Colour } from "./types/colour.js";
import { FILES, RANKS } from "./types/coords.js";
import type { Move, PromotionPiece } from "./types/Move.js";
import {
  chooseGameOptions,
  choosePromotionPiece,
  submitPromotionChoice,
  resetStatusDialogs,
  showConfirmationModal,
  showInformationalModal,
} from "../ui/modalPopupWindow.js";
import { getAppElements } from "../ui/input.js";
import type { ComputerAxisLight, ComputerMovePreview } from "../ui/renderBoard.js";
import { pieceSymbols, renderBoard } from "../ui/renderBoard.js";
import { renderCapturedPieces } from "../ui/renderCapturedPieces.js";
import {
  CHECK_STATUS_MODAL_DELAY_MS,
  renderStatus,
  resetStatusAnnouncements,
} from "../ui/renderStatus.js";
import type { PieceType } from "./pieces/Piece.js";

// Coordinator file that starts the game, connects the model to the UI, 
// and asks the computer to move when appropriate

// single ChessBoard instance for the whole app:
const board = new ChessBoard();
// grabs DOM elements that we'll need to update as the game goes on:
const {
  boardRoot,
  status,
  turnBadge,
  capturedPieces,
  newGameButton,
  undoMoveButton,
  exitGameButton,
  moveEntryForm,
  moveFromInput,
  moveToInput,
  moveFromDecrementButton,
  moveFromIncrementButton,
  moveToDecrementButton,
  moveToIncrementButton,
  moveEntrySubmitButton,
  promotionChoicePanel,
  promotionChoiceStatus,
  promotionChoiceButtons,
} = getAppElements();
let sideLabels: SideLabels = {
  white: "White",
  black: "Black",
};
let playerColour: Colour = "white";
let selectedCoord: string | null = null;
let moveEntryFromCoord = "";
let moveEntryToCoord = "";
let computerColour: Colour | null = null;
let computerDifficulty: ComputerDifficulty | null = null;
let isAwaitingPromotionChoice = false;
let pendingPromotionColour: Colour | null = null;
let isGameActive = false;
let isComputerThinking = false;
let computerThinkingCoord: string | null = null;
let dragOriginCoord: string | null = null;
let dragStartPoint: { x: number; y: number } | null = null;
let suppressNextBoardClick = false;
// // This is used to trigger the "moving..." visual effect on the
// piece while its move animation is actively running:
let computerMovingCoord: string | null = null;
let computerMovePreview: ComputerMovePreview | null = null;
let computerDestinationCoord: string | null = null;
let pendingCastlingReadoutTimeoutId: number | null = null;
// // How long the computer "thinks" for before making a move, in milliseconds.
// This is just to make the computer's moves feel less instantaneous and robotic,
// which makes the game more evenly paced and enjoyable:
const COMPUTER_MOVE_DELAY_MS = 4250;
const COMPUTER_MOVE_STEP_MS = 140;
const COMPUTER_MOVE_MIN_ANIMATION_MS = 420;
const COMPUTER_MOVE_DESTINATION_HOLD_MS = 1000;
const CASTLING_READOUT_SWAP_DELAY_MS = 900;
const BOARD_DRAG_THRESHOLD_PX = 6;
const INITIAL_POSITION_FEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
const BOARD_COORD_SEQUENCE = FILES.flatMap(file => RANKS.map(rank => (
  `${"abcdefgh"[file]}${rank + 1}`
)));
let pendingComputerTurnTimeoutId: number | null = null;
let computerActionToken = 0;

// // Clears any pending computer-turn timeout, preventing the computer 
// from making a move if the timeout hasn't already completed. 
// This is used when the game state changes in a way that would 
// invalidate a pending computer move, for example when the player 
// makes a move while the computer is still "thinking" about its 
// previous move, or when the player starts a new game while the 
// computer is still thinking about its move in the previous game:
function clearPendingComputerTurnTimeout(): void {
  if (pendingComputerTurnTimeoutId !== null) {
    window.clearTimeout(pendingComputerTurnTimeoutId);
    pendingComputerTurnTimeoutId = null;
  }
}

function clearPendingCastlingReadoutTimeout(): void {
  if (pendingCastlingReadoutTimeoutId !== null) {
    window.clearTimeout(pendingCastlingReadoutTimeoutId);
    pendingCastlingReadoutTimeoutId = null;
  }
}

function invalidatePendingComputerActions(): void {
  clearPendingComputerTurnTimeout();
  computerActionToken += 1;
}

function getComputerMoveDelayMs(computerColour: Colour): number {
  const gameStatus = board.getGameStatus();

  if (gameStatus.status === "check" && gameStatus.sideInCheck === computerColour) {
    return COMPUTER_MOVE_DELAY_MS + CHECK_STATUS_MODAL_DELAY_MS;
  }

  return COMPUTER_MOVE_DELAY_MS;
}


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

function normaliseMoveEntryValue(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "")
    .slice(0, 2);
}

function isBoardCoord(value: string): boolean {
  return /^[a-h][1-8]$/.test(value);
}

function clearMoveEntry(): void {
  clearPendingCastlingReadoutTimeout();
  moveEntryFromCoord = "";
  moveEntryToCoord = "";
}

function setMoveEntryReadouts(originCoord: string, destinationCoord: string): void {
  clearPendingCastlingReadoutTimeout();
  moveEntryFromCoord = originCoord;
  moveEntryToCoord = destinationCoord;
}

function getCastlingRookReadout(move: Move): { originCoord: string; destinationCoord: string } | null {
  if (!move.castle) {
    return null;
  }

  const homeRank = move.fromRank;

  if (move.castle === "K") {
    return {
      originCoord: toBoardCoord(homeRank, 7),
      destinationCoord: toBoardCoord(homeRank, 5),
    };
  }

  return {
    originCoord: toBoardCoord(homeRank, 0),
    destinationCoord: toBoardCoord(homeRank, 3),
  };
}

function scheduleCastlingReadoutSwap(move: Move): void {
  const rookReadout = getCastlingRookReadout(move);

  if (!rookReadout) {
    return;
  }

  pendingCastlingReadoutTimeoutId = window.setTimeout(() => {
    pendingCastlingReadoutTimeoutId = null;
    moveEntryFromCoord = rookReadout.originCoord;
    moveEntryToCoord = rookReadout.destinationCoord;
    renderGame();
  }, CASTLING_READOUT_SWAP_DELAY_MS);
}

function syncMoveEntryAvailability(): void {
  const canEnterMove = (
    isGameActive
    && !isAwaitingPromotionChoice
    && !isComputerThinking
    && board.getSideToMove() === playerColour
  );

  moveFromInput.value = moveEntryFromCoord;
  moveToInput.value = moveEntryToCoord;
  moveFromInput.disabled = !canEnterMove;
  moveToInput.disabled = !canEnterMove;
  moveFromDecrementButton.disabled = !canEnterMove;
  moveFromIncrementButton.disabled = !canEnterMove;
  moveToDecrementButton.disabled = !canEnterMove;
  moveToIncrementButton.disabled = !canEnterMove;
  moveEntrySubmitButton.disabled = !canEnterMove;
  syncPromotionChoiceAvailability();
}

function syncPromotionChoiceAvailability(): void {
  const shouldShowPromotionChoices = isAwaitingPromotionChoice && pendingPromotionColour !== null;

  promotionChoiceStatus.textContent = shouldShowPromotionChoices
    ? `${pendingPromotionColour === "white" ? "White" : "Black"} pawn is awaiting promotion. Choose the piece to confirm the move.`
    : "Promotion buttons stay on standby until a pawn reaches the final rank.";
  promotionChoicePanel.setAttribute("aria-disabled", shouldShowPromotionChoices ? "false" : "true");

  for (const button of promotionChoiceButtons) {
    const piece = button.dataset.promotionPiece;
    const symbol = button.querySelector<HTMLElement>(".move-entry-panel__promotion-symbol");

    if (
      piece !== "queen"
      && piece !== "rook"
      && piece !== "bishop"
      && piece !== "knight"
    ) {
      button.disabled = true;
      if (symbol) {
        symbol.textContent = "";
      }
      continue;
    }

    button.disabled = !shouldShowPromotionChoices;
    button.setAttribute("aria-label", `Promote to ${piece}`);

    if (symbol) {
      symbol.textContent = pendingPromotionColour
        ? pieceSymbols[pendingPromotionColour][piece]
        : "";
    }
  }
}

function getSteppedBoardCoord(currentValue: string, step: 1 | -1): string {
  const currentIndex = BOARD_COORD_SEQUENCE.indexOf(currentValue);

  if (currentIndex === -1) {
    return step > 0
      ? BOARD_COORD_SEQUENCE[0]
      : BOARD_COORD_SEQUENCE[BOARD_COORD_SEQUENCE.length - 1];
  }

  const nextIndex = (currentIndex + step + BOARD_COORD_SEQUENCE.length) % BOARD_COORD_SEQUENCE.length;
  return BOARD_COORD_SEQUENCE[nextIndex];
}

function getComputerAxisLight(): ComputerAxisLight | null {
  if (computerMovePreview) {
    return {
      coord: computerMovePreview.currentCoord,
      mode: "confirmed",
    };
  }

  if (computerMovingCoord) {
    return {
      coord: computerMovingCoord,
      mode: "confirmed",
    };
  }

  if (isComputerThinking && computerThinkingCoord) {
    return {
      coord: computerThinkingCoord,
      mode: "thinking",
    };
  }

  return null;
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
    computerAxisLight: getComputerAxisLight(),
    computerDestinationCoord,
    legalMoveCoords,
    legalCaptureCoords,
  });
  renderStatus(board, status, turnBadge, sideLabels, {
    isComputerThinking,
    onPlayAgain: () => {
      void initialiseGame(false);
    },
  });
  renderCapturedPieces(board, capturedPieces);
  syncControlAvailability();
  syncMoveEntryAvailability();
}

function syncControlAvailability(): void {
  newGameButton.disabled = isAwaitingPromotionChoice;
  undoMoveButton.disabled = !isGameActive || isAwaitingPromotionChoice;
  exitGameButton.disabled = !isGameActive || isAwaitingPromotionChoice;
}

// // Renders the board in its idle state, with no game in progress. 
// It also updates the status text to prompt the user to start a new game, 
// and clears the turn badge and captured pieces display:
function renderIdleState(): void {
  renderBoard(board, boardRoot, {
    selectedCoord,
    computerMovingCoord,
    computerMovePreview,
    computerAxisLight: getComputerAxisLight(),
    computerDestinationCoord,
  });
  status.textContent = "No game in progress. Press New Game to begin.";
  turnBadge.replaceChildren();
  renderCapturedPieces(board, capturedPieces);
  syncControlAvailability();
  syncMoveEntryAvailability();
}

// // If setup fails, it still renders the board, shows the error text, 
// and clears the turn badge:
function renderSetupError(message: string): void {
  renderBoard(board, boardRoot, {
    selectedCoord,
    computerMovingCoord,
    computerMovePreview,
    computerAxisLight: getComputerAxisLight(),
    computerDestinationCoord,
  });
  status.textContent = message;
  turnBadge.textContent = "";
  renderCapturedPieces(board, capturedPieces);
  syncMoveEntryAvailability();
}

// // Resets the board and all relevant state to start a new game. 
// It also clears any pending computer actions, so that if the player 
// starts a new game while the computer is still "thinking" about 
// its move in the previous game, the computer won't suddenly make 
// its move in the new game:
function resetBoardForNewGame(): void {
  invalidatePendingComputerActions();
  clearPendingCastlingReadoutTimeout();
  board.loadFEN(INITIAL_POSITION_FEN);
  selectedCoord = null;
  clearMoveEntry();
  dragOriginCoord = null;
  dragStartPoint = null;
  suppressNextBoardClick = false;
  computerMovingCoord = null;
  computerMovePreview = null;
  computerThinkingCoord = null;
  computerDestinationCoord = null;
  isComputerThinking = false;
  isAwaitingPromotionChoice = false;
  pendingPromotionColour = null;
  resetStatusDialogs();
  resetStatusAnnouncements();
}

function enterIdleState(): void {
  resetBoardForNewGame();
  isGameActive = false;
  computerColour = null;
  computerDifficulty = null;
  sideLabels = {
    white: "White",
    black: "Black",
  };
  renderIdleState();
}

function resetComputerTurnVisualState(): void {
  isComputerThinking = false;
  computerThinkingCoord = null;
  computerMovingCoord = null;
  computerMovePreview = null;
  computerDestinationCoord = null;
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

function getSquareCoordFromEventTarget(target: EventTarget | null): string | null {
  if (!(target instanceof Element)) {
    return null;
  }

  const squareElement = target.closest<HTMLElement>(".square");
  return squareElement?.dataset.coord ?? null;
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

// // Applies a move to the board, then checks the new 
// board state to determine which move sound to play. 
// For example, if the move puts the opponent in check, 
// it plays the check sound. If it's an ordinary move that doesn't put either 
// player in check, it plays the ordinary move sound:
function applyMove(move: Move): void {
  const shouldPlayCastlingSound = isCastlingMove(board, move);
  const shouldPlayCaptureSound = isCaptureMove(board, move);
  const shouldPlayEnPassantSound = isEnPassantMove(board, move);
  const shouldPlayPromotionSound = isPromotionMove(board, move);
  const shouldPlayMoveSound = isOrdinaryMoveCandidate(board, move);

  board.makeMove(move);
  const gameStatus = board.getGameStatus();

  if (gameStatus.status === "checkmate") {
    playCheckmateSound();
    return;
  }

  if (gameStatus.status === "check") {
    playCheckSound();
    return;
  }

  if (isDrawByFiftyMoveRuleSoundState(board, move)) {
    playDrawByFiftyMoveRuleSound();
    return;
  }

  if (isDrawByThreefoldRepetitionSoundState(board)) {
    playDrawByThreefoldRepetitionSound();
    return;
  }

  if (isDrawByInsufficientMaterialSoundState(board)) {
    playDrawByInsufficientMaterialSound();
    return;
  }

  if (isStalemateSoundState(board)) {
    playStalemateSound();
    return;
  }

  if (shouldPlayCastlingSound) {
    playCastlingSound();
    return;
  }

  if (shouldPlayEnPassantSound) {
    playEnPassantSound();
    return;
  }

  if (shouldPlayPromotionSound) {
    playPromotionSound();
    return;
  }

  if (shouldPlayCaptureSound) {
    playCaptureSound();
    return;
  }

  if (shouldPlayMoveSound && isOrdinaryMoveSoundState(board)) {
    playOrdinaryMoveSound();
  }
}

async function completePlayerMove(
  originCoord: string,
  destinationCoord: string,
  options: {
    preserveReadoutsOnSuccess?: boolean;
  } = {},
): Promise<boolean> {
  const { preserveReadoutsOnSuccess = true } = options;
  const legalMoves = getLegalMovesForCoord(originCoord);
  const candidateMoves = legalMoves.filter(move => (
    board.getSquare(move.toRank, move.toFile).coord === destinationCoord
  ));

  if (candidateMoves.length === 0) {
    return false;
  }

  let chosenMove = candidateMoves[0];

  if (candidateMoves.some(move => move.promotion)) {
    const promotingPiece = getSquareByCoord(originCoord)?.piece;
    if (!promotingPiece) {
      return false;
    }

    isAwaitingPromotionChoice = true;
    pendingPromotionColour = promotingPiece.colour;
    syncMoveEntryAvailability();
    syncControlAvailability();
    renderGame();

    try {
      const promotionChoice = await choosePromotionPiece(promotingPiece.colour);
      const matchingMove = candidateMoves.find(move => move.promotion === promotionChoice);

      if (!matchingMove) {
        return false;
      }

      chosenMove = matchingMove;
    } catch {
      selectedCoord = null;
      clearMoveEntry();
      renderGame();
      return false;
    } finally {
      isAwaitingPromotionChoice = false;
      pendingPromotionColour = null;
      syncMoveEntryAvailability();
      syncControlAvailability();
    }
  }

  applyMove(chosenMove);
  selectedCoord = null;
  if (preserveReadoutsOnSuccess) {
    setMoveEntryReadouts(originCoord, destinationCoord);
    scheduleCastlingReadoutSwap(chosenMove);
  } else {
    clearMoveEntry();
  }
  computerMovingCoord = null;
  computerMovePreview = null;
  computerDestinationCoord = null;
  renderGame();

  if (computerColour && computerDifficulty) {
    playComputerTurnIfNeeded(computerColour, computerDifficulty);
  }

  return true;
}

// // Animates the computer's move by updating the computerMovePreview 
// // state with intermediate coordinates. The piece then visually "moves" 
// // across the board by re-rendering the board for each intermediate coordinate.
// // The animation is just a visual effect, it doesn't affect the actual game 
// // state or move legality, and it doesn't update the board until the 
// // computer has "finished thinking" and is ready to make its move. 
// Its purpose is so that the human player can see which piece the 
// computer is moving, and track it across the board:
async function animateComputerMove(
  move: Move,
  pieceType: PieceType,
  colour: Colour,
  actionToken: number,
): Promise<boolean> {
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
    if (actionToken !== computerActionToken) {
      return false;
    }

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

  return actionToken === computerActionToken;
}

// // Click handler for the board. It handles piece selection, move attempts, 
// and promotion choice. When the user clicks on a square, it checks whether 
// they're selecting a piece, attempting to move a piece, or trying to 
// change their selection. If they're attempting to move a piece, it checks whether 
// the move is legal, and if so, makes the move on the board. If the move 
// involves a promotion, it waits for the user to choose a promotion piece 
// before making the move:
async function handleBoardClick(event: MouseEvent): Promise<void> {
  if (suppressNextBoardClick) {
    suppressNextBoardClick = false;
    return;
  }

  if (!isGameActive) {
    return;
  }

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
    moveEntryFromCoord = coord;
    moveEntryToCoord = "";
    renderGame();
    return;
  }

  if (square?.piece?.colour === playerColour) {
    selectedCoord = selectedCoord === coord ? null : coord;
    moveEntryFromCoord = selectedCoord ?? "";
    moveEntryToCoord = "";
    renderGame();
    return;
  }
  moveEntryToCoord = coord;
  await completePlayerMove(selectedCoord, coord, {
    preserveReadoutsOnSuccess: true,
  });
}

function handleBoardMouseDown(event: MouseEvent): void {
  dragOriginCoord = null;
  dragStartPoint = null;

  if (!isGameActive || isAwaitingPromotionChoice || board.getSideToMove() !== playerColour) {
    return;
  }

  const coord = getSquareCoordFromEventTarget(event.target);

  if (!coord) {
    return;
  }

  const square = getSquareByCoord(coord);

  if (!square?.piece || square.piece.colour !== playerColour) {
    return;
  }

  dragOriginCoord = coord;
  dragStartPoint = { x: event.clientX, y: event.clientY };
}

async function handleBoardMouseUp(event: MouseEvent): Promise<void> {
  const originCoord = dragOriginCoord;
  const startPoint = dragStartPoint;

  dragOriginCoord = null;
  dragStartPoint = null;

  if (!originCoord || !startPoint) {
    return;
  }

  if (!isGameActive || isAwaitingPromotionChoice || board.getSideToMove() !== playerColour) {
    return;
  }

  const deltaX = event.clientX - startPoint.x;
  const deltaY = event.clientY - startPoint.y;
  const pointerTravel = Math.hypot(deltaX, deltaY);

  if (pointerTravel < BOARD_DRAG_THRESHOLD_PX) {
    return;
  }

  const destinationCoord = getSquareCoordFromEventTarget(event.target);

  if (!destinationCoord || destinationCoord === originCoord) {
    return;
  }

  const originSquare = getSquareByCoord(originCoord);

  if (!originSquare?.piece || originSquare.piece.colour !== playerColour) {
    return;
  }

  selectedCoord = originCoord;
  moveEntryFromCoord = originCoord;
  moveEntryToCoord = destinationCoord;
  suppressNextBoardClick = true;
  await completePlayerMove(originCoord, destinationCoord, {
    preserveReadoutsOnSuccess: true,
  });
}

function handleMoveFromInput(): void {
  moveEntryFromCoord = normaliseMoveEntryValue(moveFromInput.value);
  moveFromInput.value = moveEntryFromCoord;

  if (!isBoardCoord(moveEntryFromCoord)) {
    selectedCoord = null;
    renderGame();
    return;
  }

  const square = getSquareByCoord(moveEntryFromCoord);

  if (!square?.piece || square.piece.colour !== playerColour) {
    selectedCoord = null;
    renderGame();
    return;
  }

  selectedCoord = moveEntryFromCoord;
  renderGame();
}

function handleMoveToInput(): void {
  moveEntryToCoord = normaliseMoveEntryValue(moveToInput.value);
  moveToInput.value = moveEntryToCoord;
}

function stepMoveFromInput(step: 1 | -1): void {
  moveFromInput.value = getSteppedBoardCoord(moveEntryFromCoord, step);
  handleMoveFromInput();
  moveFromInput.focus();
}

function stepMoveToInput(step: 1 | -1): void {
  moveToInput.value = getSteppedBoardCoord(moveEntryToCoord, step);
  handleMoveToInput();
  renderGame();
  moveToInput.focus();
}

function handlePromotionChoiceClick(piece: PromotionPiece): void {
  if (!isAwaitingPromotionChoice) {
    return;
  }

  submitPromotionChoice(piece);
}

async function handleMoveEntrySubmit(event: Event): Promise<void> {
  event.preventDefault();

  if (!isGameActive) {
    showInformationalModal("Start a new game before entering a move.");
    return;
  }

  if (isComputerThinking || board.getSideToMove() !== playerColour) {
    showInformationalModal("Wait until it is your turn before entering a move.");
    return;
  }

  const originCoord = normaliseMoveEntryValue(moveFromInput.value);
  const destinationCoord = normaliseMoveEntryValue(moveToInput.value);
  moveEntryFromCoord = originCoord;
  moveEntryToCoord = destinationCoord;

  if (!isBoardCoord(originCoord) || !isBoardCoord(destinationCoord)) {
    showInformationalModal("Enter both move coordinates in chess notation, for example e2 to e4.");
    renderGame();
    return;
  }

  const square = getSquareByCoord(originCoord);

  if (!square?.piece || square.piece.colour !== playerColour) {
    showInformationalModal("Choose one of your own pieces as the starting square.");
    selectedCoord = null;
    renderGame();
    return;
  }

  selectedCoord = originCoord;
  renderGame();

  const moveWasCompleted = await completePlayerMove(originCoord, destinationCoord, {
    preserveReadoutsOnSuccess: true,
  });

  if (!moveWasCompleted) {
    selectedCoord = originCoord;
    moveEntryFromCoord = originCoord;
    moveEntryToCoord = destinationCoord;
    renderGame();
    showInformationalModal(`The move ${originCoord} to ${destinationCoord} is not legal in this position.`);
  }
}

function handleUndoMove(): void {
  if (!isGameActive) {
    return;
  }

  if (isAwaitingPromotionChoice) {
    return;
  }

  // // Until both sides have completed a full move, don't allow undo.
  // This covers both:
  // - the initial position, including when the computer's first move is still pending
  // - positions where exactly one side has moved and the reply has not happened yet
  const moveHistory = board.getMoveHistory();
  if (moveHistory.length <= 1) {
    showInformationalModal("You can only undo after both sides have moved.");
    return;
  }

  invalidatePendingComputerActions();

  const latestMove = moveHistory[moveHistory.length - 1];

  if (!latestMove) {
    resetComputerTurnVisualState();
    selectedCoord = null;
    clearMoveEntry();
    renderGame();
    return;
  }

  if (latestMove.movedPiece.colour === playerColour) {
    board.undoMove();
  } else {
    const priorMove = moveHistory[moveHistory.length - 2];

    if (!priorMove || priorMove.movedPiece.colour !== playerColour) {
      resetComputerTurnVisualState();
      selectedCoord = null;
      clearMoveEntry();
      renderGame();
      return;
    }

    board.undoMove();
    board.undoMove();
  }

  resetComputerTurnVisualState();
  selectedCoord = null;
  clearMoveEntry();
  renderGame();
}

async function handleExitGame(): Promise<void> {
  if (!isGameActive || isAwaitingPromotionChoice) {
    return;
  }

  const shouldExit = await showConfirmationModal(
    "Are you sure that you want to exit the current game and return the board to its idle state?",
    {
      title: "Exit game",
      confirmLabel: "Exit game",
      cancelLabel: "Stay here",
    },
  );

  if (!shouldExit) {
    renderGame();
    return;
  }

  if (isQuitGameSoundState(board)) {
    playQuitGameSound();
  }

  enterIdleState();
}

// // Computer-move trigger. It:
// - checks whether it's currently the computer's turn
// - checks the game isn't already over
// - waits 2000ms, plus an extra check-modal delay if the computer is in check
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
    isComputerThinking = false;
    computerThinkingCoord = null;
    computerMovingCoord = null;
    computerDestinationCoord = null;
    renderGame();
    return;
  }

  clearPendingComputerTurnTimeout();
  const actionToken = ++computerActionToken;
  isComputerThinking = true;
  computerThinkingCoord = board.getSquare(chosenMove.fromRank, chosenMove.fromFile).coord;
  computerMovingCoord = null;
  computerMovePreview = null;
  computerDestinationCoord = null;
  renderGame();

  pendingComputerTurnTimeoutId = window.setTimeout(() => {
    pendingComputerTurnTimeoutId = null;

    if (actionToken !== computerActionToken) {
      return;
    }

    if (board.getSideToMove() !== computerColour) {
      isComputerThinking = false;
      computerThinkingCoord = null;
      computerMovingCoord = null;
      computerMovePreview = null;
      computerDestinationCoord = null;
      renderGame();
      return;
    }

    if (isTerminalGameResult(board.getGameStatus())) {
      isComputerThinking = false;
      computerThinkingCoord = null;
      computerMovingCoord = null;
      computerMovePreview = null;
      computerDestinationCoord = null;
      renderGame();
      return;
    }

    const movingPiece = board.getSquare(chosenMove.fromRank, chosenMove.fromFile).piece;
    if (!movingPiece) {
      isComputerThinking = false;
      computerThinkingCoord = null;
      computerMovingCoord = null;
      computerMovePreview = null;
      computerDestinationCoord = null;
      renderGame();
      return;
    }

    computerMovingCoord = board.getSquare(chosenMove.fromRank, chosenMove.fromFile).coord;
    void animateComputerMove(chosenMove, movingPiece.type, computerColour, actionToken)
      .then((animationCompleted) => {
        if (!animationCompleted || actionToken !== computerActionToken) {
          return;
        }

        if (board.getSideToMove() !== computerColour) {
          isComputerThinking = false;
          computerThinkingCoord = null;
          computerMovingCoord = null;
          computerMovePreview = null;
          computerDestinationCoord = null;
          clearMoveEntry();
          renderGame();
          return;
        }

        if (isTerminalGameResult(board.getGameStatus())) {
          isComputerThinking = false;
          computerThinkingCoord = null;
          computerMovingCoord = null;
          computerMovePreview = null;
          computerDestinationCoord = null;
          clearMoveEntry();
          renderGame();
          return;
        }

        computerDestinationCoord = board.getSquare(chosenMove.toRank, chosenMove.toFile).coord;
        renderGame();
        return delay(COMPUTER_MOVE_DESTINATION_HOLD_MS).then(() => {
          if (board.getSideToMove() !== computerColour) {
            isComputerThinking = false;
            computerThinkingCoord = null;
            computerMovingCoord = null;
            computerMovePreview = null;
            computerDestinationCoord = null;
            renderGame();
            return;
          }

          if (isTerminalGameResult(board.getGameStatus())) {
            isComputerThinking = false;
            computerThinkingCoord = null;
            computerMovingCoord = null;
            computerMovePreview = null;
            computerDestinationCoord = null;
            renderGame();
            return;
          }

          applyMove(chosenMove);
          isComputerThinking = false;
          computerThinkingCoord = null;
          selectedCoord = null;
          clearMoveEntry();
          computerMovingCoord = null;
          computerMovePreview = null;
          computerDestinationCoord = null;
          renderGame();
        });
      });
  }, getComputerMoveDelayMs(computerColour));
}

// startup flow:
async function initialiseGame(returnToIdleOnCancel = false): Promise<void> {
  try {
    const {
      playerColour: chosenPlayerColour,
      computerDifficulty: chosenComputerDifficulty,
      playerName,
    } = await chooseGameOptions();
    const setup = createGameSetup(chosenPlayerColour, chosenComputerDifficulty, playerName);
    resetBoardForNewGame();
    isGameActive = true;
    playerColour = setup.playerColour;
    computerColour = setup.computerColour;
    computerDifficulty = setup.computerDifficulty;
    sideLabels = setup.sideLabels;

    renderGame();
    syncControlAvailability();
    playComputerTurnIfNeeded(setup.computerColour, setup.computerDifficulty);
  } catch (error) {
    const setupWasCancelled = error instanceof Error && error.message === "Player colour selection was cancelled.";

    if (setupWasCancelled) {
      if (returnToIdleOnCancel) {
        if (isQuitGameSoundState(board)) {
          playQuitGameSound();
        }

        enterIdleState();
        return;
      }

      renderGame();
      syncControlAvailability();
      return;
    }

    const message = error instanceof Error
      ? error.message
      : "Unable to start the game setup.";

    renderSetupError(message);
  }
}
// kicks everything off when the module loads:
preloadOrdinaryMoveSound();
preloadCaptureSound();
preloadCastlingSound();
preloadCheckSound();
preloadEnPassantSound();
preloadPromotionSound();
preloadCheckmateSound();
preloadDrawByFiftyMoveRuleSound();
preloadDrawByThreefoldRepetitionSound();
preloadDrawByInsufficientMaterialSound();
preloadStalemateSound();
preloadQuitGameSound();
boardRoot.addEventListener("mousedown", handleBoardMouseDown);
boardRoot.addEventListener("mouseup", event => {
  void handleBoardMouseUp(event);
});
boardRoot.addEventListener("click", handleBoardClick);
newGameButton.addEventListener("click", () => {
  void initialiseGame(!isGameActive);
});
undoMoveButton.addEventListener("click", handleUndoMove);
exitGameButton.addEventListener("click", () => {
  void handleExitGame();
});
moveFromInput.addEventListener("input", handleMoveFromInput);
moveToInput.addEventListener("input", handleMoveToInput);
moveFromDecrementButton.addEventListener("click", () => {
  stepMoveFromInput(-1);
});
moveFromIncrementButton.addEventListener("click", () => {
  stepMoveFromInput(1);
});
moveToDecrementButton.addEventListener("click", () => {
  stepMoveToInput(-1);
});
moveToIncrementButton.addEventListener("click", () => {
  stepMoveToInput(1);
});
moveEntryForm.addEventListener("submit", event => {
  void handleMoveEntrySubmit(event);
});
for (const button of promotionChoiceButtons) {
  button.addEventListener("click", () => {
    const piece = button.dataset.promotionPiece;

    if (
      piece === "queen"
      || piece === "rook"
      || piece === "bishop"
      || piece === "knight"
    ) {
      handlePromotionChoiceClick(piece);
    }
  });
}
enterIdleState();
void initialiseGame(true);
