// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const chooseGameOptionsMock = vi.fn();
const showConfirmationModalMock = vi.fn();
const showInformationalModalMock = vi.fn();
const playQuitGameSoundMock = vi.fn();
const isQuitGameSoundStateMock = vi.fn();

vi.mock("../../ui/modalPopupWindow.js", async () => {
  const actual = await vi.importActual<typeof import("../../ui/modalPopupWindow.js")>(
    "../../ui/modalPopupWindow.js",
  );

  return {
    ...actual,
    chooseGameOptions: chooseGameOptionsMock,
    showConfirmationModal: showConfirmationModalMock,
    showInformationalModal: showInformationalModalMock,
  };
});

vi.mock("../../src/audio/moveSound.js", () => ({
  isCastlingMove: vi.fn(() => false),
  isCaptureMove: vi.fn(() => false),
  isDrawByFiftyMoveRuleSoundState: vi.fn(() => false),
  isDrawByInsufficientMaterialSoundState: vi.fn(() => false),
  isDrawByThreefoldRepetitionSoundState: vi.fn(() => false),
  isEnPassantMove: vi.fn(() => false),
  isOrdinaryMoveCandidate: vi.fn(() => true),
  isOrdinaryMoveSoundState: vi.fn(() => true),
  isPromotionMove: vi.fn(() => false),
  isQuitGameSoundState: isQuitGameSoundStateMock,
  isStalemateSoundState: vi.fn(() => false),
  playCaptureSound: vi.fn(),
  playCastlingSound: vi.fn(),
  playCheckSound: vi.fn(),
  playCheckmateSound: vi.fn(),
  playDrawByFiftyMoveRuleSound: vi.fn(),
  playDrawByInsufficientMaterialSound: vi.fn(),
  playDrawByThreefoldRepetitionSound: vi.fn(),
  playEnPassantSound: vi.fn(),
  playOrdinaryMoveSound: vi.fn(),
  playPromotionSound: vi.fn(),
  playQuitGameSound: playQuitGameSoundMock,
  playStalemateSound: vi.fn(),
  preloadCaptureSound: vi.fn(),
  preloadCastlingSound: vi.fn(),
  preloadCheckSound: vi.fn(),
  preloadCheckmateSound: vi.fn(),
  preloadDrawByFiftyMoveRuleSound: vi.fn(),
  preloadDrawByInsufficientMaterialSound: vi.fn(),
  preloadDrawByThreefoldRepetitionSound: vi.fn(),
  preloadEnPassantSound: vi.fn(),
  preloadOrdinaryMoveSound: vi.fn(),
  preloadPromotionSound: vi.fn(),
  preloadQuitGameSound: vi.fn(),
  preloadStalemateSound: vi.fn(),
}));

type SetupChoice = {
  playerColour: "white" | "black";
  computerDifficulty: "easy" | "medium" | "hard";
  playerName: string | null;
};

function renderAppShell(): void {
  document.body.innerHTML = `
    <div id="chessboard"></div>
    <p id="status"></p>
    <div id="turn-badge"></div>
    <section id="captured-pieces"></section>
    <button id="new-game-button" type="button"></button>
    <button id="undo-move-button" type="button"></button>
    <button id="exit-game-button" type="button"></button>
  `;
}

async function flushPromises(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
}

function queueGameSetup(...results: Array<SetupChoice | "cancel">): void {
  chooseGameOptionsMock.mockReset();

  for (const result of results) {
    if (result === "cancel") {
      chooseGameOptionsMock.mockRejectedValueOnce(
        new Error("Player colour selection was cancelled."),
      );
      continue;
    }

    chooseGameOptionsMock.mockResolvedValueOnce(result);
  }
}

async function loadApp(): Promise<void> {
  renderAppShell();
  await import("../../src/index.ts");
  await flushPromises();
}

function getButton(id: string): HTMLButtonElement {
  const button = document.querySelector<HTMLButtonElement>(id);

  if (!button) {
    throw new Error(`Expected button ${id} to exist.`);
  }

  return button;
}

function getSquare(coord: string): HTMLElement {
  const square = document.querySelector<HTMLElement>(`.square[data-coord="${coord}"]`);

  if (!square) {
    throw new Error(`Expected square ${coord} to exist.`);
  }

  return square;
}

describe("control panel buttons", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.useFakeTimers();
    showConfirmationModalMock.mockReset();
    showInformationalModalMock.mockReset();
    playQuitGameSoundMock.mockReset();
    isQuitGameSoundStateMock.mockReset();
    isQuitGameSoundStateMock.mockReturnValue(true);
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
    document.body.innerHTML = "";
  });

  it("starts a new game from the idle state when New Game is pressed", async () => {
    queueGameSetup(
      "cancel",
      {
        playerColour: "white",
        computerDifficulty: "medium",
        playerName: null,
      },
    );

    await loadApp();

    const newGameButton = getButton("#new-game-button");
    const undoMoveButton = getButton("#undo-move-button");
    const exitGameButton = getButton("#exit-game-button");

    expect(undoMoveButton.disabled).toBe(true);
    expect(exitGameButton.disabled).toBe(true);
    expect(document.querySelector("#status")?.textContent).toBe(
      "No game in progress. Press New Game to begin.",
    );

    chooseGameOptionsMock.mockClear();
    newGameButton.click();
    await flushPromises();

    expect(chooseGameOptionsMock).toHaveBeenCalledTimes(1);
    expect(undoMoveButton.disabled).toBe(false);
    expect(exitGameButton.disabled).toBe(false);
  });

  it("shows the undo warning when only one side has moved", async () => {
    queueGameSetup({
      playerColour: "white",
      computerDifficulty: "medium",
      playerName: null,
    });

    await loadApp();

    getSquare("e2").click();
    getSquare("e4").click();

    getButton("#undo-move-button").click();

    expect(showInformationalModalMock).toHaveBeenCalledWith(
      "You can only undo after both sides have moved.",
    );
    expect(getSquare("e4").querySelector(".piece")?.getAttribute("aria-label")).toBe(
      "white pawn on e4",
    );
  });

  it("returns to the idle state when Exit Game is confirmed", async () => {
    queueGameSetup({
      playerColour: "white",
      computerDifficulty: "medium",
      playerName: null,
    });
    showConfirmationModalMock.mockResolvedValue(true);

    await loadApp();

    getButton("#exit-game-button").click();
    await flushPromises();

    expect(showConfirmationModalMock).toHaveBeenCalledWith(
      "Are you sure that you want to exit the current game and return the board to its idle state?",
      {
        title: "Exit game",
        confirmLabel: "Exit game",
        cancelLabel: "Stay here",
      },
    );
    expect(playQuitGameSoundMock).toHaveBeenCalledTimes(1);
    expect(document.querySelector("#status")?.textContent).toBe(
      "No game in progress. Press New Game to begin.",
    );
    expect(getButton("#undo-move-button").disabled).toBe(true);
    expect(getButton("#exit-game-button").disabled).toBe(true);
  });
});
