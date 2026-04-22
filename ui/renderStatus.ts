import type { ChessBoard } from "../src/board/ChessBoard.js";
import type { SideLabels } from "../src/game/setup.js";

// UI for game outcome:
export function renderStatus(
  board: ChessBoard,
  statusElement: HTMLElement,
  turnBadgeElement: HTMLElement,
  sideLabels: SideLabels,
): void {
  const sideToMove = board.getSideToMove();
  const gameStatus = board.getGameStatus();
  const sideLabel = sideLabels[sideToMove];

  turnBadgeElement.textContent = `${sideLabel} to move`;

  switch (gameStatus.status) {
    case "active":
      statusElement.textContent = "Starting position loaded. Ready for move input.";
      return;
    case "check":
      statusElement.textContent = `${sideLabel} is in check.`;
      return;
    case "checkmate":
      statusElement.textContent = `Checkmate. ${sideLabels[gameStatus.winner]} wins.`;
      return;
    case "stalemate":
      statusElement.textContent = "Stalemate.";
      return;
    case "drawByFiftyMoveRule":
      statusElement.textContent = "Draw by the fifty-move rule.";
      return;
    case "drawByRepetition":
      statusElement.textContent = "Draw by repetition.";
      return;
    case "drawByInsufficientMaterial":
      statusElement.textContent = "Draw by insufficient material.";
      return;
  }
}
