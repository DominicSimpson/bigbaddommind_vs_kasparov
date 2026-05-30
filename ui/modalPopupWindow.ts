import type { ComputerDifficulty } from "../src/player/ComputerPlayer.js";
import type { Colour } from "../src/types/colour.js";
import type { PromotionPiece } from "../src/types/Move.js";
import {
  isSoundOn,
  setSoundEnabled,
} from "../src/audio/moveSound.js";
import { pieceSymbols } from "./renderBoard.js";

// // This file contains functions for creating and managing pop-up modal 
// windows in the UI, such as the game setup dialog, promotion choice dialog, 
// and status update modals. The modals are implemented using the HTML 
// <dialog> element, with dynamic content and event listeners for user 
// interactions. The functions include:
// - chooseGameOptions: Prompts the player to select their colour, 
// computer difficulty, and optionally enter their name before starting a new game.
// - choosePromotionPiece: When a pawn reaches the final rank, prompts the player 
// to choose which piece to promote to.
// - showTimedStatusModal: Displays a temporary modal with a status message (e.g. "White is in check") 
// that automatically dismisses after a specified duration.
// - showReplayModal: When the game ends, shows a modal with the result and offers the option to play again:
export type SelectedGameOptions = {
  playerColour: Colour;
  computerDifficulty: ComputerDifficulty;
  playerName: string | null;
};

let activeStatusDialog: HTMLDialogElement | null = null;
let activeStatusDialogTimeoutId: number | null = null;
const STATUS_DIALOG_TIMEOUT_MS = 3000;
const MOBILE_SCROLL_CUE_BREAKPOINT_PX = 700;
const MODAL_SCROLL_CUE_BOTTOM_THRESHOLD_PX = 8;
const MODAL_SCROLL_CUE_SECTION_THRESHOLD_PX = 24;

// Promotion options for when a pawn reaches the final rank:
const PROMOTION_OPTIONS: ReadonlyArray<{
  value: PromotionPiece;
  label: string;
  description: string;
}> = [
  { value: "queen", label: "Queen", description: "Strongest all-round option." },
  { value: "rook", label: "Rook", description: "Straight-line power and pressure." },
  { value: "bishop", label: "Bishop", description: "Diagonal control across the board." },
  { value: "knight", label: "Knight", description: "L-shaped moves for tricky forks." },
];

let activePromotionDialog: HTMLDialogElement | null = null;
let activePromotionResolve: ((piece: PromotionPiece) => void) | null = null;
let activePromotionReject: ((reason?: unknown) => void) | null = null;
let activePromotionButtons: Partial<Record<PromotionPiece, HTMLButtonElement>> = {};
let pendingPromotionSubmitTimeoutId: number | null = null;
const PROMOTION_SUBMIT_PREVIEW_MS = 140;

export { PROMOTION_OPTIONS };

function clearPendingPromotionSubmitTimeout(): void {
  if (pendingPromotionSubmitTimeoutId !== null) {
    window.clearTimeout(pendingPromotionSubmitTimeoutId);
    pendingPromotionSubmitTimeoutId = null;
  }
}

function setActivePromotionButtonSelection(piece: PromotionPiece | null): void {
  const promotionPieces: PromotionPiece[] = ["queen", "rook", "bishop", "knight"];

  for (const promotionPiece of promotionPieces) {
    const button = activePromotionButtons[promotionPiece];
    if (!button) {
      continue;
    }

    const isSelected = piece === promotionPiece;
    button.classList.toggle("setup-dialog__promotion-option--selected", isSelected);
    button.setAttribute("aria-pressed", isSelected ? "true" : "false");
  }
}

function queuePromotionChoiceSubmission(piece: PromotionPiece): boolean {
  if (!activePromotionDialog || !activePromotionResolve) {
    return false;
  }

  clearPendingPromotionSubmitTimeout();
  setActivePromotionButtonSelection(piece);
  pendingPromotionSubmitTimeoutId = window.setTimeout(() => {
    pendingPromotionSubmitTimeoutId = null;
    clearActivePromotionChoice("resolved", piece);
  }, PROMOTION_SUBMIT_PREVIEW_MS);

  return true;
}


// checkboxes
function createRadioOption(
  name: string,
  value: string,
  label: string,
  checked = false,
): HTMLLabelElement {
  const option = document.createElement("label");
  option.className = "setup-dialog__choice";

  const input = document.createElement("input");
  input.type = "radio";
  input.name = name;
  input.value = value;
  input.checked = checked;

  const text = document.createElement("span");
  text.textContent = label;

  option.append(input, text);

  return option;
}

// Utility functions for managing the active status dialog, 
// ensuring that only one is open at a time and that timeouts 
// are properly cleared when dialogs are closed or replaced:
function clearActiveStatusDialogTimeout(): void {
  if (activeStatusDialogTimeoutId !== null) {
    window.clearTimeout(activeStatusDialogTimeoutId);
    activeStatusDialogTimeoutId = null;
  }
}

// Closes the currently active status dialog, if there is one, 
// and clears any associated timeouts:
function closeActiveStatusDialog(): void {
  clearActiveStatusDialogTimeout();

  if (activeStatusDialog) {
    if (activeStatusDialog.open) {
      activeStatusDialog.close();
      return;
    }

    activeStatusDialog.remove();
    activeStatusDialog = null;
  }
}

function clearActivePromotionChoice(
  reason: "resolved" | "cancelled",
  piece?: PromotionPiece,
): void {
  const dialog = activePromotionDialog;
  const resolve = activePromotionResolve;
  const reject = activePromotionReject;

  activePromotionDialog = null;
  activePromotionResolve = null;
  activePromotionReject = null;
  activePromotionButtons = {};
  clearPendingPromotionSubmitTimeout();

  if (dialog) {
    dialog.remove();
  }

  if (reason === "resolved" && piece && resolve) {
    resolve(piece);
    return;
  }

  if (reason === "cancelled" && reject) {
    reject(new Error("Promotion selection was cancelled."));
  }
}

// // This helper function creates a standardized structure for status dialogs, 
// including a title, description, and actions section. It returns the created 
// dialog element along with references to the form and actions container for 
// further customisation by the caller:
function createStatusDialog(titleText: string | null, descriptionText: string): {
  dialog: HTMLDialogElement;
  form: HTMLFormElement;
  actions: HTMLDivElement;
} {
  const dialog = document.createElement("dialog");
  dialog.className = "setup-dialog";

  const form = document.createElement("form");
  form.className = "setup-dialog__form";
  form.method = "dialog";

  const description = document.createElement("p");
  description.className = "setup-dialog__description";
  description.textContent = descriptionText;

  const actions = document.createElement("div");
  actions.className = "setup-dialog__actions";

  if (titleText) {
    const title = document.createElement("h2");
    title.className = "setup-dialog__title";
    title.textContent = titleText;
    form.append(title);
  }

  form.append(description, actions);
  dialog.append(form);

  return { dialog, form, actions };
}

function createModalScrollCueButton(): HTMLButtonElement {
  const button = document.createElement("button");
  button.className = "setup-dialog__scroll-cue";
  button.type = "button";
  button.setAttribute("aria-label", "Scroll to the next section");

  const chevron = document.createElement("span");
  chevron.className = "setup-dialog__scroll-cue-chevron";
  chevron.setAttribute("aria-hidden", "true");
  button.append(chevron);

  return button;
}

function attachModalScrollCue(
  dialog: HTMLDialogElement,
  scrollContainer: HTMLElement,
  scrollCueButton: HTMLButtonElement,
  targetElements: HTMLElement[],
): () => void {
  const updateScrollCueVisibility = (): void => {
    if (window.innerWidth > MOBILE_SCROLL_CUE_BREAKPOINT_PX) {
      dialog.classList.remove("setup-dialog--has-scroll-cue");
      return;
    }

    const hasMoreContent = (
      scrollContainer.scrollTop + scrollContainer.clientHeight
      < scrollContainer.scrollHeight - MODAL_SCROLL_CUE_BOTTOM_THRESHOLD_PX
    );

    dialog.classList.toggle("setup-dialog--has-scroll-cue", hasMoreContent);
  };

  const scrollToNextSection = (): void => {
    const viewportTop = scrollContainer.scrollTop;

    for (const element of targetElements) {
      const elementTop = element.offsetTop;

      if (elementTop > viewportTop + MODAL_SCROLL_CUE_SECTION_THRESHOLD_PX) {
        scrollContainer.scrollTo({
          top: Math.max(0, elementTop - 16),
          behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
            ? "auto"
            : "smooth",
        });
        return;
      }
    }

    scrollContainer.scrollTo({
      top: scrollContainer.scrollHeight,
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "auto"
        : "smooth",
    });
  };

  scrollContainer.addEventListener("scroll", updateScrollCueVisibility, { passive: true });
  window.addEventListener("resize", updateScrollCueVisibility);
  scrollCueButton.addEventListener("click", scrollToNextSection);
  updateScrollCueVisibility();

  return (): void => {
    scrollContainer.removeEventListener("scroll", updateScrollCueVisibility);
    window.removeEventListener("resize", updateScrollCueVisibility);
    scrollCueButton.removeEventListener("click", scrollToNextSection);
    dialog.classList.remove("setup-dialog--has-scroll-cue");
  };
}

export function resetStatusDialogs(): void {
  closeActiveStatusDialog();

  if (activePromotionDialog) {
    clearActivePromotionChoice("cancelled");
  }
}

export function showInformationalModal(
  message: string,
  title = "Undo move",
): void {
  closeActiveStatusDialog();

  const { dialog, actions } = createStatusDialog(title, message);
  const closeButton = document.createElement("button");
  closeButton.className = "setup-dialog__button setup-dialog__button--primary";
  closeButton.type = "button";
  closeButton.textContent = "OK";
  closeButton.addEventListener("click", () => {
    dialog.close();
  });

  actions.append(closeButton);
  document.body.append(dialog);
  activeStatusDialog = dialog;

  dialog.addEventListener("close", () => {
    if (activeStatusDialog === dialog) {
      activeStatusDialog = null;
    }

    dialog.remove();
  }, { once: true });

  dialog.addEventListener("cancel", (event) => {
    event.preventDefault();
    dialog.close();
  });

  dialog.showModal();
}

export function showGameOverAcknowledgementModal(
  message: string,
  onClose: () => void,
  title = "Game over",
): void {
  closeActiveStatusDialog();

  const { dialog, actions } = createStatusDialog(title, message);
  const closeButton = document.createElement("button");
  closeButton.className = "setup-dialog__button setup-dialog__button--primary";
  closeButton.type = "button";
  closeButton.textContent = "OK";
  closeButton.addEventListener("click", () => {
    dialog.close();
  });

  actions.append(closeButton);
  document.body.append(dialog);
  activeStatusDialog = dialog;

  dialog.addEventListener("close", () => {
    if (activeStatusDialog === dialog) {
      activeStatusDialog = null;
    }

    dialog.remove();
    onClose();
  }, { once: true });

  dialog.addEventListener("cancel", (event) => {
    event.preventDefault();
    dialog.close();
  });

  dialog.showModal();
}

function createGameInfoMoveInputThumbnail(): HTMLDivElement {
  const thumbnail = document.createElement("div");
  thumbnail.className = "setup-dialog__move-thumbnail";
  thumbnail.setAttribute("aria-hidden", "true");

  const fromReadout = document.createElement("div");
  fromReadout.className = "setup-dialog__move-thumbnail-readout";

  const fromLabel = document.createElement("span");
  fromLabel.className = "setup-dialog__move-thumbnail-label";
  fromLabel.textContent = "From";

  const fromValue = document.createElement("span");
  fromValue.className = "setup-dialog__move-thumbnail-value";
  fromValue.textContent = "E2";

  fromReadout.append(fromLabel, fromValue);

  const toReadout = document.createElement("div");
  toReadout.className = "setup-dialog__move-thumbnail-readout";

  const toLabel = document.createElement("span");
  toLabel.className = "setup-dialog__move-thumbnail-label";
  toLabel.textContent = "To";

  const toValue = document.createElement("span");
  toValue.className = "setup-dialog__move-thumbnail-value";
  toValue.textContent = "E4";

  toReadout.append(toLabel, toValue);

  const submitButton = document.createElement("div");
  submitButton.className = "setup-dialog__move-thumbnail-submit";
  submitButton.textContent = "Enter Move";

  thumbnail.append(fromReadout, toReadout, submitButton);
  return thumbnail;
}

function createGameInfoPromotionThumbnail(): HTMLDivElement {
  const thumbnail = document.createElement("div");
  thumbnail.className = "setup-dialog__promotion-thumbnail";
  thumbnail.setAttribute("aria-hidden", "true");

  const promotionPieces: PromotionPiece[] = ["queen", "rook", "bishop", "knight"];

  for (const piece of promotionPieces) {
    const control = document.createElement("div");
    control.className = "setup-dialog__promotion-thumbnail-control";

    const name = document.createElement("span");
    name.className = "setup-dialog__promotion-thumbnail-name";
    name.textContent = piece.charAt(0).toUpperCase() + piece.slice(1);

    const button = document.createElement("div");
    button.className = "setup-dialog__promotion-thumbnail-button";

    const symbol = document.createElement("span");
    symbol.className = "setup-dialog__promotion-thumbnail-symbol";
    symbol.textContent = pieceSymbols.white[piece];

    button.append(symbol);
    control.append(name, button);
    thumbnail.append(control);
  }

  return thumbnail;
}

function createGameInfoColourThumbnail(colour: Colour): HTMLDivElement {
  const thumbnail = document.createElement("div");
  thumbnail.className = "setup-dialog__colour-thumbnail";
  thumbnail.classList.add(
    colour === "black"
      ? "setup-dialog__colour-thumbnail--black"
      : "setup-dialog__colour-thumbnail--white",
  );
  thumbnail.setAttribute("aria-hidden", "true");

  const indicator = document.createElement("span");
  indicator.className = "setup-dialog__colour-thumbnail-indicator";

  const indicatorInner = document.createElement("span");
  indicatorInner.className = "setup-dialog__colour-thumbnail-indicator-inner";
  indicator.append(indicatorInner);

  const text = document.createElement("span");
  text.className = "setup-dialog__colour-thumbnail-text";
  text.textContent = colour === "white" ? "White" : "Black";

  thumbnail.append(indicator, text);
  return thumbnail;
}

function createGameInfoDifficultyThumbnail(
  difficulty: ComputerDifficulty,
): HTMLDivElement {
  const thumbnail = document.createElement("div");
  thumbnail.className = "setup-dialog__difficulty-thumbnail";
  thumbnail.setAttribute("aria-hidden", "true");

  const text = document.createElement("span");
  text.className = "setup-dialog__difficulty-thumbnail-text";
  text.textContent = difficulty.charAt(0).toUpperCase() + difficulty.slice(1);

  const chevron = document.createElement("span");
  chevron.className = "setup-dialog__difficulty-thumbnail-chevron";
  chevron.textContent = "v";

  thumbnail.append(text, chevron);
  return thumbnail;
}

function createGameInfoSoundThumbnail(enabled: boolean): HTMLDivElement {
  const thumbnail = document.createElement("div");
  thumbnail.className = "setup-dialog__sound-thumbnail";
  thumbnail.setAttribute("role", "group");
  thumbnail.setAttribute("aria-label", "Sound setting");

  const soundOptions: Array<{
    key: "on" | "off";
    label: string;
    selected: boolean;
    iconPath: string;
  }> = [
    {
      key: "on",
      label: "On",
      selected: enabled,
      iconPath: "/icons/sound-on.png",
    },
    {
      key: "off",
      label: "Off",
      selected: !enabled,
      iconPath: "/icons/sound-off.png",
    },
  ];

  for (const option of soundOptions) {
    const button = document.createElement("button");
    button.className = "setup-dialog__sound-option";
    button.type = "button";
    button.dataset.soundState = option.key;
    button.setAttribute("aria-pressed", option.selected ? "true" : "false");
    button.setAttribute("aria-label", `Turn sound ${option.key}`);

    const icon = document.createElement("img");
    icon.className = "setup-dialog__sound-option-icon";
    icon.src = option.iconPath;
    icon.alt = "";
    icon.setAttribute("aria-hidden", "true");

    const text = document.createElement("span");
    text.className = "setup-dialog__sound-option-text";
    text.textContent = option.label;

    button.append(icon, text);
    thumbnail.append(button);
  }

  return thumbnail;
}

function createGameInfoFenThumbnail(expanded: boolean): HTMLButtonElement {
  const thumbnail = document.createElement("button");
  thumbnail.className = "setup-dialog__fen-thumbnail";
  thumbnail.type = "button";
  thumbnail.setAttribute("aria-expanded", expanded ? "true" : "false");
  thumbnail.setAttribute("aria-label", expanded ? "Hide FEN position" : "Show FEN position");

  const text = document.createElement("span");
  text.className = "setup-dialog__fen-thumbnail-text";
  text.textContent = expanded ? "Hide position" : "View position";

  const chevron = document.createElement("span");
  chevron.className = "setup-dialog__fen-thumbnail-chevron";
  chevron.textContent = expanded ? "^" : "v";
  chevron.setAttribute("aria-hidden", "true");

  thumbnail.append(text, chevron);
  return thumbnail;
}

export function showGameInfoModal(content: {
  moveGuidance: string;
  promotionGuidance: string;
  promotionThumbnailCaption: string;
  playerName: string;
  playerColour: Colour;
  computerDifficulty: ComputerDifficulty;
  currentFen: string;
  leaderboardEntries: Array<{
    name: string;
    points: number;
  }>;
  onOpen?: () => void;
  onClose?: () => void;
}): void {
  closeActiveStatusDialog();

  const {
    moveGuidance,
    promotionGuidance,
    promotionThumbnailCaption,
    playerName,
    playerColour,
    computerDifficulty,
    currentFen,
    leaderboardEntries,
    onOpen,
    onClose,
  } = content;
  const { dialog, form, actions } = createStatusDialog("Game info", moveGuidance);
  dialog.classList.add("setup-dialog--game-info", "setup-dialog--large");
  const scrollCueButton = createModalScrollCueButton();

  const visualSection = document.createElement("section");
  visualSection.className = "setup-dialog__section";

  const visualLabel = document.createElement("p");
  visualLabel.className = "setup-dialog__label";
  visualLabel.textContent = "Using the move input";

  const thumbnailCaption = document.createElement("p");
  thumbnailCaption.className = "setup-dialog__description";
  thumbnailCaption.textContent = "Example: entering e2 to e4 before selecting 'Enter Move' will move the piece from e2 to e4.";

  visualSection.append(
    visualLabel,
    createGameInfoMoveInputThumbnail(),
    thumbnailCaption,
  );

  form.insertBefore(visualSection, actions);

  const promotionDescription = document.createElement("p");
  promotionDescription.className = "setup-dialog__description";
  promotionDescription.textContent = promotionGuidance;
  form.insertBefore(promotionDescription, actions);

  const promotionSection = document.createElement("section");
  promotionSection.className = "setup-dialog__section";

  const promotionLabel = document.createElement("p");
  promotionLabel.className = "setup-dialog__label";
  promotionLabel.textContent = "Using the promotion buttons";

  const promotionThumbnailCaptionElement = document.createElement("p");
  promotionThumbnailCaptionElement.className = "setup-dialog__description";
  promotionThumbnailCaptionElement.textContent = promotionThumbnailCaption;

  promotionSection.append(
    promotionLabel,
    createGameInfoPromotionThumbnail(),
    promotionThumbnailCaptionElement,
  );

  form.insertBefore(promotionSection, actions);

  const gameDetailsSection = document.createElement("section");
  gameDetailsSection.className = "setup-dialog__game-details";

  const divider = document.createElement("hr");
  divider.className = "setup-dialog__divider";

  const gameDetailsLabel = document.createElement("p");
  gameDetailsLabel.className = "setup-dialog__label";
  gameDetailsLabel.textContent = "This game";

  const playerNameRow = document.createElement("p");
  playerNameRow.className = "setup-dialog__detail-row";

  const playerNameRowLabel = document.createElement("span");
  playerNameRowLabel.className = "setup-dialog__detail-label";
  playerNameRowLabel.textContent = "Name:";

  const playerNameRowValue = document.createElement("span");
  playerNameRowValue.className = "setup-dialog__detail-value";
  playerNameRowValue.textContent = playerName;

  playerNameRow.append(playerNameRowLabel, playerNameRowValue);

  const playerColourRow = document.createElement("div");
  playerColourRow.className = "setup-dialog__detail-row";

  const playerColourRowLabel = document.createElement("span");
  playerColourRowLabel.className = "setup-dialog__detail-label";
  playerColourRowLabel.textContent = "Colour:";

  const playerColourRowValue = document.createElement("div");
  playerColourRowValue.className = "setup-dialog__detail-value";
  playerColourRowValue.append(createGameInfoColourThumbnail(playerColour));

  playerColourRow.append(playerColourRowLabel, playerColourRowValue);

  const difficultyRow = document.createElement("div");
  difficultyRow.className = "setup-dialog__detail-row";

  const difficultyRowLabel = document.createElement("span");
  difficultyRowLabel.className = "setup-dialog__detail-label";
  difficultyRowLabel.textContent = "Level:";

  const difficultyRowValue = document.createElement("div");
  difficultyRowValue.className = "setup-dialog__detail-value";
  difficultyRowValue.append(createGameInfoDifficultyThumbnail(computerDifficulty));

  difficultyRow.append(difficultyRowLabel, difficultyRowValue);

  const soundRow = document.createElement("div");
  soundRow.className = "setup-dialog__detail-row";

  const soundRowLabel = document.createElement("span");
  soundRowLabel.className = "setup-dialog__detail-label";
  soundRowLabel.textContent = "Sound:";

  const soundRowValue = document.createElement("div");
  soundRowValue.className = "setup-dialog__detail-value";
  let soundThumbnail = createGameInfoSoundThumbnail(isSoundOn());
  const handleSoundToggle = (enabled: boolean): void => {
    if (enabled === isSoundOn()) {
      return;
    }

    setSoundEnabled(enabled);
    const nextSoundThumbnail = createGameInfoSoundThumbnail(enabled);
    bindSoundThumbnailEvents(nextSoundThumbnail);
    soundThumbnail.replaceWith(nextSoundThumbnail);
    soundThumbnail = nextSoundThumbnail;
  };

  function bindSoundThumbnailEvents(thumbnail: HTMLDivElement): void {
    const onButton = thumbnail.querySelector<HTMLButtonElement>("[data-sound-state='on']");
    const offButton = thumbnail.querySelector<HTMLButtonElement>("[data-sound-state='off']");

    onButton?.addEventListener("click", () => {
      handleSoundToggle(true);
    });

    offButton?.addEventListener("click", () => {
      handleSoundToggle(false);
    });
  }

  bindSoundThumbnailEvents(soundThumbnail);
  soundRowValue.append(soundThumbnail);
  soundRow.append(soundRowLabel, soundRowValue);

  const fenRow = document.createElement("div");
  fenRow.className = "setup-dialog__detail-row setup-dialog__detail-row--fen";

  const fenRowLabel = document.createElement("span");
  fenRowLabel.className = "setup-dialog__detail-label";
  fenRowLabel.textContent = "FEN:";

  const fenRowValue = document.createElement("div");
  fenRowValue.className = "setup-dialog__detail-value setup-dialog__detail-value--fen";

  const fenReadout = document.createElement("p");
  fenReadout.className = "setup-dialog__fen-readout";
  fenReadout.hidden = true;
  fenReadout.textContent = currentFen;

  let fenThumbnail = createGameInfoFenThumbnail(false);
  
  function handleFenToggle(): void {
    const nextExpandedState: boolean = fenReadout.hidden;
    fenReadout.hidden = !nextExpandedState;

    const nextFenThumbnail = createGameInfoFenThumbnail(nextExpandedState);
    nextFenThumbnail.addEventListener("click", handleFenToggle);
    fenThumbnail.replaceWith(nextFenThumbnail);
    fenThumbnail = nextFenThumbnail;
  }

  fenThumbnail.addEventListener("click", handleFenToggle);
  fenRowValue.append(fenThumbnail, fenReadout);
  fenRow.append(fenRowLabel, fenRowValue);

  gameDetailsSection.append(
    divider,
    gameDetailsLabel,
    playerNameRow,
    playerColourRow,
    difficultyRow,
    soundRow,
    fenRow,
  );
  form.insertBefore(gameDetailsSection, actions);

  const leaderboardSection = document.createElement("section");
  leaderboardSection.className = "setup-dialog__leaderboard";

  const leaderboardDivider = document.createElement("hr");
  leaderboardDivider.className = "setup-dialog__divider";

  const leaderboardLabel = document.createElement("p");
  leaderboardLabel.className = "setup-dialog__label";
  leaderboardLabel.textContent = "Leaderboard";

  const leaderboardDescription = document.createElement("p");
  leaderboardDescription.className = "setup-dialog__description";
  leaderboardDescription.textContent = "Wins are weighted by difficulty levels: Easy = 1 point, Medium = 2 points, Hard = 4 points. You have to enter a name to feature on the leaderboard.";

  leaderboardSection.append(leaderboardDivider, leaderboardLabel, leaderboardDescription);

  if (leaderboardEntries.length === 0) {
    const leaderboardEmptyState = document.createElement("p");
    leaderboardEmptyState.className = "setup-dialog__leaderboard-empty";
    leaderboardEmptyState.textContent = "No named player wins have been recorded yet.";
    leaderboardSection.append(leaderboardEmptyState);
  } else {
    const leaderboardList = document.createElement("ol");
    leaderboardList.className = "setup-dialog__leaderboard-list";

    for (const entry of leaderboardEntries) {
      const leaderboardItem = document.createElement("li");
      leaderboardItem.className = "setup-dialog__leaderboard-item";

      const player = document.createElement("span");
      player.className = "setup-dialog__leaderboard-name";
      player.textContent = entry.name;

      const score = document.createElement("span");
      score.className = "setup-dialog__leaderboard-score";
      score.textContent = `${entry.points} ${entry.points === 1 ? "point" : "points"}`;

      leaderboardItem.append(player, score);
      leaderboardList.append(leaderboardItem);
    }

    leaderboardSection.append(leaderboardList);
  }

  form.insertBefore(leaderboardSection, actions);

  const closeButton = document.createElement("button");
  closeButton.className = "setup-dialog__button setup-dialog__button--primary";
  closeButton.type = "button";
  closeButton.textContent = "OK";
  closeButton.addEventListener("click", () => {
    dialog.close();
  });

  actions.append(closeButton);
  dialog.append(scrollCueButton);
  document.body.append(dialog);
  activeStatusDialog = dialog;
  const detachModalScrollCue = attachModalScrollCue(
    dialog,
    form,
    scrollCueButton,
    [
      promotionDescription,
      promotionSection,
      gameDetailsSection,
      leaderboardSection,
      actions,
    ],
  );

  dialog.addEventListener("close", () => {
    if (activeStatusDialog === dialog) {
      activeStatusDialog = null;
    }

    detachModalScrollCue();
    onClose?.();
    dialog.remove();
  }, { once: true });

  dialog.addEventListener("cancel", (event) => {
    event.preventDefault();
    dialog.close();
  });

  dialog.showModal();
  onOpen?.();
}

export function showConfirmationModal(
  message: string,
  options: {
    title?: string;
    confirmLabel?: string;
    cancelLabel?: string;
    onConfirm?: () => void;
  } = {},
): Promise<boolean> {
  return new Promise<boolean>((resolve) => {
    closeActiveStatusDialog();

    const {
      title = "Confirm",
      confirmLabel = "Confirm",
      cancelLabel = "Cancel",
      onConfirm,
    } = options;
    const { dialog, actions } = createStatusDialog(title, message);

    const cancelButton = document.createElement("button");
    cancelButton.className = "setup-dialog__button setup-dialog__button--secondary";
    cancelButton.type = "button";
    cancelButton.textContent = cancelLabel;
    cancelButton.addEventListener("click", () => {
      dialog.close("cancel");
    });

    const confirmButton = document.createElement("button");
    confirmButton.className = "setup-dialog__button setup-dialog__button--primary";
    confirmButton.type = "button";
    confirmButton.textContent = confirmLabel;
    confirmButton.addEventListener("click", () => {
      onConfirm?.();
      dialog.close("confirm");
    });

    actions.append(cancelButton, confirmButton);
    document.body.append(dialog);
    activeStatusDialog = dialog;

    dialog.addEventListener("cancel", (event) => {
      event.preventDefault();
      dialog.close("cancel");
    });

    dialog.addEventListener("close", () => {
      if (activeStatusDialog === dialog) {
        activeStatusDialog = null;
      }

      const wasConfirmed = dialog.returnValue === "confirm";
      dialog.remove();
      resolve(wasConfirmed);
    }, { once: true });

    dialog.showModal();
  });
}

// This function displays a temporary modal with a 
// status message (e.g. "White is in check") for three seconds:
export function showTimedStatusModal(
  message: string,
  durationMs = STATUS_DIALOG_TIMEOUT_MS,
): void {
  closeActiveStatusDialog();

  const { dialog, actions } = createStatusDialog(null, message);
  const dismissButton = document.createElement("button");
  dismissButton.className = "setup-dialog__button setup-dialog__button--secondary";
  dismissButton.type = "button";
  dismissButton.textContent = "Dismiss";
  dismissButton.addEventListener("click", () => {
    dialog.close();
  });

  actions.append(dismissButton);
  document.body.append(dialog);
  activeStatusDialog = dialog;

  dialog.addEventListener("close", () => {
    clearActiveStatusDialogTimeout();
    if (activeStatusDialog === dialog) {
      activeStatusDialog = null;
    }
    dialog.remove();
  }, { once: true });

  dialog.addEventListener("cancel", (event) => {
    event.preventDefault();
    dialog.close();
  });

  dialog.showModal();
  activeStatusDialogTimeoutId = window.setTimeout(() => {
    if (dialog.open) {
      dialog.close();
    }
  }, durationMs);
}

// When the game ends, this pop-up modal shows the result and offers 
// the option to play again. The function takes a message to display 
// (e.g. "White wins by checkmate") and a callback function to execute 
// if the player chooses to play again. The UI is built using a <dialog> 
// element, with buttons for closing the dialog or starting a new game, 
// and appropriate event listeners for handling user interactions:
export function showReplayModal(
  message: string,
  onPlayAgain: () => void,
): void {
  closeActiveStatusDialog();

  const { dialog, actions } = createStatusDialog("Game over", message);

  const closeButton = document.createElement("button");
  closeButton.className = "setup-dialog__button setup-dialog__button--secondary";
  closeButton.type = "button";
  closeButton.textContent = "Close";
  closeButton.addEventListener("click", () => {
    dialog.close();
  });

  const playAgainButton = document.createElement("button");
  playAgainButton.className = "setup-dialog__button setup-dialog__button--primary";
  playAgainButton.type = "button";
  playAgainButton.textContent = "Play again";
  playAgainButton.addEventListener("click", () => {
    dialog.close("playAgain");
  });

  actions.append(closeButton, playAgainButton);
  document.body.append(dialog);
  activeStatusDialog = dialog;

  dialog.addEventListener("cancel", (event) => {
    event.preventDefault();
    dialog.close();
  });

  dialog.addEventListener("close", () => {
    if (activeStatusDialog === dialog) {
      activeStatusDialog = null;
    }

    const shouldPlayAgain = dialog.returnValue === "playAgain";
    dialog.remove();

    if (shouldPlayAgain) {
      onPlayAgain();
    }
  }, { once: true });

  dialog.showModal();
}

// Options in pop-up modal window before game starts
export function chooseGameOptions(): Promise<SelectedGameOptions> {
  return new Promise<SelectedGameOptions>((resolve, reject) => {
    const dialog = document.createElement("dialog");
    dialog.className = "setup-dialog";

    const form = document.createElement("form");
    form.className = "setup-dialog__form";
    form.method = "dialog";

    const title = document.createElement("h2");
    title.className = "setup-dialog__title";
    title.textContent = "Start a new game";

    const description = document.createElement("p");
    description.className = "setup-dialog__description";
    description.textContent =
      "Choose your side and the engine strength before the first move.";

    const colourSection = document.createElement("fieldset");
    colourSection.className = "setup-dialog__section";
    // player chooses their pawn colour
    const colourLegend = document.createElement("legend");
    colourLegend.textContent = "Which colour would you like to play?";

    const colourChoices = document.createElement("div");
    colourChoices.className = "setup-dialog__choices";
    colourChoices.append(
      createRadioOption("player-colour", "white", "White", true),
      createRadioOption("player-colour", "black", "Black"),
    );

    colourSection.append(colourLegend, colourChoices);

    const difficultySection = document.createElement("label");
    difficultySection.className = "setup-dialog__section";
    // Game difficulty level
    const difficultyLabel = document.createElement("span");
    difficultyLabel.className = "setup-dialog__label";
    difficultyLabel.textContent = "Computer difficulty";

    const difficultySelect = document.createElement("select");
    difficultySelect.className = "setup-dialog__select";
    difficultySelect.name = "computer-difficulty";

    const difficultyOptions: Array<{
      value: ComputerDifficulty;
      label: string;
    }> = [
      { value: "easy", label: "Easy" },
      { value: "medium", label: "Medium" },
      { value: "hard", label: "Hard" },
    ];

    for (const optionData of difficultyOptions) {
      const option = document.createElement("option");
      option.value = optionData.value;
      option.textContent = optionData.label;
      difficultySelect.append(option);
    }

    difficultySelect.value = "medium";
    difficultySection.append(difficultyLabel, difficultySelect);

    const playerNameSection = document.createElement("label");
    playerNameSection.className = "setup-dialog__section";
    // Player's name (not mandatory to fill in):
    const playerNameLabel = document.createElement("span");
    playerNameLabel.className = "setup-dialog__label";
    playerNameLabel.textContent = "Your name (optional)";

    const playerNameInput = document.createElement("input");
    playerNameInput.className = "setup-dialog__input";
    playerNameInput.name = "player-name";
    playerNameInput.type = "text";
    playerNameInput.maxLength = 40;
    playerNameInput.placeholder = "Enter your name";
    playerNameInput.setAttribute("autocomplete", "nickname");

    playerNameSection.append(playerNameLabel, playerNameInput);

    const actions = document.createElement("div");
    actions.className = "setup-dialog__actions";
    // if player wants to cancel game:
    const cancelButton = document.createElement("button");
    cancelButton.className = "setup-dialog__button setup-dialog__button--secondary";
    cancelButton.type = "button";
    cancelButton.textContent = "Cancel";
    cancelButton.addEventListener("click", () => {
      dialog.close("cancel");
    });
    // start game:
    const submitButton = document.createElement("button");
    submitButton.className = "setup-dialog__button setup-dialog__button--primary";
    submitButton.type = "submit";
    submitButton.textContent = "Start game";

    actions.append(cancelButton, submitButton);
    form.append(
      title,
      description,
      colourSection,
      difficultySection,
      playerNameSection,
      actions,
    );
    dialog.append(form);
    document.body.append(dialog);

    const cleanup = (): void => {
      dialog.remove();
    };

    dialog.addEventListener("cancel", (event) => {
      event.preventDefault();
      dialog.close("cancel");
    });

    dialog.addEventListener("close", () => {
      if (dialog.returnValue === "cancel") {
        cleanup();
        reject(new Error("Player colour selection was cancelled."));
        return;
      }

      const selectedColour = form.querySelector<HTMLInputElement>(
        'input[name="player-colour"]:checked',
      )?.value;
      const selectedDifficulty = difficultySelect.value;
      const trimmedPlayerName = playerNameInput.value.trim();

      if (
        (selectedColour !== "white" && selectedColour !== "black")
        || (
          selectedDifficulty !== "easy"
          && selectedDifficulty !== "medium"
          && selectedDifficulty !== "hard"
        )
      ) {
        cleanup();
        reject(new Error("Game setup could not be completed."));
        return;
      }

      cleanup();
      resolve({
        playerColour: selectedColour,
        computerDifficulty: selectedDifficulty,
        playerName: trimmedPlayerName.length > 0 ? trimmedPlayerName : null,
      });
    }, { once: true });

    dialog.showModal();
  });
}

// // When a pawn reaches the final rank, this pop-up modal prompts the player 
// to choose which piece they want to promote to. The function returns a 
// Promise that resolves to the chosen promotion piece, or rejects if the 
// selection is cancelled. The UI is built using a <dialog> element, 
// with buttons for each promotion option, and appropriate event listeners 
// for handling user interactions:
export function choosePromotionPiece(colour: Colour): Promise<PromotionPiece> {
  return new Promise<PromotionPiece>((resolve, reject) => {
    if (activePromotionDialog) {
      clearActivePromotionChoice("cancelled");
    }

    const dialog = document.createElement("dialog");
    dialog.className = "setup-dialog setup-dialog--promotion";

    const form = document.createElement("form");
    form.className = "setup-dialog__form";
    form.method = "dialog";

    const title = document.createElement("h2");
    title.className = "setup-dialog__title";
    title.textContent = "Choose a promotion";

    const description = document.createElement("p");
    description.className = "setup-dialog__description";
    description.textContent = `${colour === "white" ? "White" : "Black"} pawn reached the final rank. Pick the piece to promote to.`;

    const section = document.createElement("fieldset");
    section.className = "setup-dialog__section";

    const legend = document.createElement("legend");
    legend.textContent = "Promotion piece";

    const choices = document.createElement("div");
    choices.className = "setup-dialog__promotion-grid";

    for (const optionData of PROMOTION_OPTIONS) {
      const button = document.createElement("button");
      button.className = "setup-dialog__promotion-option";
      button.type = "button";
      button.value = optionData.value;
      button.setAttribute("aria-pressed", "false");

      const icon = document.createElement("span");
      icon.className = "setup-dialog__promotion-icon";
      icon.textContent = pieceSymbols[colour][optionData.value];
      icon.setAttribute("aria-hidden", "true");

      const content = document.createElement("span");
      content.className = "setup-dialog__promotion-copy";

      const label = document.createElement("span");
      label.className = "setup-dialog__promotion-name";
      label.textContent = optionData.label;

      const detail = document.createElement("span");
      detail.className = "setup-dialog__promotion-detail";
      detail.textContent = optionData.description;

      content.append(label, detail);
      button.append(icon, content);
      button.addEventListener("click", () => {
        queuePromotionChoiceSubmission(optionData.value);
      });
      activePromotionButtons[optionData.value] = button;
      choices.append(button);
    }

    const actions = document.createElement("div");
    actions.className = "setup-dialog__actions";

    const cancelButton = document.createElement("button");
    cancelButton.className = "setup-dialog__button setup-dialog__button--secondary";
    cancelButton.type = "button";
    cancelButton.textContent = "Cancel";
    cancelButton.addEventListener("click", () => {
      clearActivePromotionChoice("cancelled");
    });

    actions.append(cancelButton);
    section.append(legend, choices);
    form.append(title, description, section, actions);
    dialog.append(form);
    document.body.append(dialog);

    activePromotionDialog = dialog;
    activePromotionResolve = resolve;
    activePromotionReject = reject;

    dialog.addEventListener("cancel", (event) => {
      event.preventDefault();
      clearActivePromotionChoice("cancelled");
    }, { once: true });

    dialog.addEventListener("close", () => {
      if (activePromotionDialog === dialog) {
        clearActivePromotionChoice("cancelled");
      }
    }, { once: true });

    dialog.show();
    const firstChoice = choices.querySelector<HTMLButtonElement>("button");
    firstChoice?.focus();
  });
}

export function submitPromotionChoice(piece: PromotionPiece): boolean {
  return queuePromotionChoiceSubmission(piece);
}
