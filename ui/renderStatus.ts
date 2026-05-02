import type { ChessBoard } from "../src/board/ChessBoard.js";
import type { SideLabels } from "../src/game/setup.js";
import type { GameResult } from "../src/types/GameResult.js";
import { showReplayModal, showTimedStatusModal } from "./modalPopupWindow.js";

// // This module handles rendering the current game status to the user, 
// including turn information, check/checkmate/stalemate status, 
// and end-of-game results. It also manages showing modal pop-ups for 
// important status changes (e.g. when a player is in check or when 
// the game ends) and ensures that these pop-ups are not shown repeatedly 
// for the same status:
const STATUS_MODAL_DURATION_MS = 3000;

let lastAnnouncedStatusKey: string | null = null;

type RenderStatusOptions = {
  onPlayAgain?: () => void;
};

// // This helper function generates a unique key for the current game status, 
// which is used to determine whether a status change has occurred that 
// warrants showing a new modal pop-up. For example, if the status is 
// "check", the key will include which side is in check to differentiate 
// between "White is in check" and "Black is in check":
function getStatusAnnouncementKey(gameStatus: GameResult): string {
  switch (gameStatus.status) {
    case "check":
      return `${gameStatus.status}:${gameStatus.sideInCheck}`;
    case "checkmate":
      return `${gameStatus.status}:${gameStatus.winner}`;
    default:
      return gameStatus.status;
  }
}

export function resetStatusAnnouncements(): void {
  lastAnnouncedStatusKey = null;
}

// UI for game outcome:
export function renderStatus(
  board: ChessBoard,
  statusElement: HTMLElement,
  turnBadgeElement: HTMLElement, // DOM element where UI shows whose turn it is
  // If sideLabel is "white", that element's visible text becomes "White to move"
  sideLabels: SideLabels,
  options: RenderStatusOptions = {},
): void {
  const sideToMove = board.getSideToMove();
  const gameStatus = board.getGameStatus();
  const sideLabel = sideLabels[sideToMove];
  const statusAnnouncementKey = getStatusAnnouncementKey(gameStatus);
  const shouldAnnounceStatus = statusAnnouncementKey !== lastAnnouncedStatusKey;

  turnBadgeElement.textContent = `${sideLabel} to move`;
  lastAnnouncedStatusKey = statusAnnouncementKey;

  switch (gameStatus.status) {
    case "check":
      statusElement.textContent = `${sideLabel} is in check.`;
      if (shouldAnnounceStatus) {
        showTimedStatusModal(statusElement.textContent, STATUS_MODAL_DURATION_MS);
      }
      return;
    case "checkmate":
      statusElement.textContent = `Checkmate. ${sideLabels[gameStatus.winner]} wins.`;
      if (shouldAnnounceStatus && options.onPlayAgain) {
        showReplayModal(statusElement.textContent, options.onPlayAgain);
      }
      return;
    case "stalemate":
      statusElement.textContent = "Stalemate.";
      if (shouldAnnounceStatus && options.onPlayAgain) {
        showReplayModal(statusElement.textContent, options.onPlayAgain);
      }
      return;
    case "drawByFiftyMoveRule":
      statusElement.textContent = "Draw by the fifty-move rule.";
      if (shouldAnnounceStatus && options.onPlayAgain) {
        showReplayModal(statusElement.textContent, options.onPlayAgain);
      }
      return;
    case "drawByRepetition":
      statusElement.textContent = "Draw by repetition.";
      if (shouldAnnounceStatus && options.onPlayAgain) {
        showReplayModal(statusElement.textContent, options.onPlayAgain);
      }
      return;
    case "drawByInsufficientMaterial":
      statusElement.textContent = "Draw by insufficient material.";
      if (shouldAnnounceStatus && options.onPlayAgain) {
        showReplayModal(statusElement.textContent, options.onPlayAgain);
      }
      return;
  }
}
