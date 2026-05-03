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
let lastAnnouncedStatusKey: string | null = null;

// Types related to rendering the game status and the team-mate panel:
type RenderStatusOptions = {
  onPlayAgain?: () => void;
};

// // This type defines the structure of the information needed to render 
// the team-mate panel:
type TeamMateIndicator = {
  label: string;
  active: boolean;
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

// // This function creates a single row in the team-mate panel, 
// consisting of a label and an LED indicator that is active or 
// inactive based on the provided information:
function createIndicatorRow({ label, active }: TeamMateIndicator): HTMLElement {
  const row = document.createElement("div");
  row.className = "team-mate-panel__row";

  const labelElement = document.createElement("span");
  labelElement.className = "team-mate-panel__command";
  labelElement.textContent = label;

  const led = document.createElement("span");
  led.className = active ? "team-mate-panel__led is-active" : "team-mate-panel__led";
  led.setAttribute("aria-hidden", "true");

  row.append(labelElement, led);
  return row;
}

// // This function renders the team-mate panel, which shows the current 
// side to move, whether the player is in check, and whether the game 
// has ended. It uses the provided side labels and game status to 
// determine which indicators should be active:
function renderTeamMatePanel(
  root: HTMLElement,
  sideLabels: SideLabels,
  sideToMove: "white" | "black",
  gameStatus: GameResult,
): void {
  const isCheck = gameStatus.status === "check";
  const isEnd = gameStatus.status === "checkmate";
  const showInfo = !isCheck && !isEnd;
  const indicators: TeamMateIndicator[] = [
    { label: sideLabels.white, active: sideToMove === "white" && !isEnd },
    { label: sideLabels.black, active: sideToMove === "black" && !isEnd },
    { label: "Check", active: isCheck },
    { label: "End", active: isEnd },
    { label: "Info", active: showInfo },
  ];

  const panel = document.createElement("section");
  panel.className = "team-mate-panel";
  panel.setAttribute("aria-label", "Team-Mate computer status panel");

  const commandStack = document.createElement("div");
  commandStack.className = "team-mate-panel__commands";

  for (const indicator of indicators) {
    commandStack.append(createIndicatorRow(indicator));
  }

  const stripePanel = document.createElement("div");
  stripePanel.className = "team-mate-panel__stripes";
  stripePanel.setAttribute("aria-hidden", "true");

  const logoBlock = document.createElement("div");
  logoBlock.className = "team-mate-panel__brand";

  const logoText = document.createElement("div");
  logoText.className = "team-mate-panel__brand-text";

  const logoTitle = document.createElement("div");
  logoTitle.className = "team-mate-panel__brand-title";
  logoTitle.textContent = "TEAM-MATE";

  const logoSubtitle = document.createElement("div");
  logoSubtitle.className = "team-mate-panel__brand-subtitle";
  logoSubtitle.textContent = "CHESS COMPUTER";

  const whiteStrip = document.createElement("div");
  whiteStrip.className = "team-mate-panel__brand-strip";
  whiteStrip.setAttribute("aria-hidden", "true");

  logoText.append(logoTitle, logoSubtitle);
  logoBlock.append(logoText, whiteStrip);
  panel.append(commandStack, stripePanel, logoBlock);
  root.replaceChildren(panel);
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

  renderTeamMatePanel(turnBadgeElement, sideLabels, sideToMove, gameStatus);
  lastAnnouncedStatusKey = statusAnnouncementKey;

  switch (gameStatus.status) {
    case "check":
      statusElement.textContent = "";
      if (shouldAnnounceStatus) {
        showTimedStatusModal(`${sideLabel} is in check.`);
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
