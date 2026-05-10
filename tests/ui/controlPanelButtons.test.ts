// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const chooseGameOptionsMock = vi.fn();
const showConfirmationModalMock = vi.fn();
const showInformationalModalMock = vi.fn();
const playQuitGameSoundMock = vi.fn();
const isQuitGameSoundStateMock = vi.fn();
const chooseComputerMoveMock = vi.fn();

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

vi.mock("../../src/player/ComputerPlayer.js", () => ({
  createComputerPlayer: vi.fn(() => ({
    chooseMove: chooseComputerMoveMock,
  })),
}));

const INITIAL_POSITION_FEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";

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
    <form id="move-entry-form">
      <input id="move-from-input" />
      <input id="move-to-input" />
      <button id="move-from-increment-button" type="button"></button>
      <button id="move-from-decrement-button" type="button"></button>
      <button id="move-to-increment-button" type="button"></button>
      <button id="move-to-decrement-button" type="button"></button>

      <button id="move-entry-submit-button" type="submit"></button>
    </form>
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

async function loadApp(options: { initialFen?: string } = {}): Promise<void> {
  renderAppShell();

  if (options.initialFen) {
    const { ChessBoard } = await import("../../src/board/ChessBoard.js");
    const originalLoadFEN = ChessBoard.prototype.loadFEN;

    vi.spyOn(ChessBoard.prototype, "loadFEN").mockImplementation(function loadPatchedFen(fen) {
      return originalLoadFEN.call(
        this,
        fen === INITIAL_POSITION_FEN ? options.initialFen ?? fen : fen,
      );
    });
  }

  await import("../../src/index.js");
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
    chooseComputerMoveMock.mockReset();
    chooseComputerMoveMock.mockReturnValue(null);
    isQuitGameSoundStateMock.mockReturnValue(true);
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
    vi.restoreAllMocks();
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
    const incrementButton = getButton("#move-from-increment-button");
    const decrementButton = getButton("#move-from-decrement-button");
    const moveToIncrementButton = getButton("#move-to-increment-button");
    const moveToDecrementButton = getButton("#move-to-decrement-button");

    const exitGameButton = getButton("#exit-game-button");

    expect(undoMoveButton.disabled).toBe(true);
    expect(incrementButton.disabled).toBe(true);
    expect(decrementButton.disabled).toBe(true);
    expect(moveToIncrementButton.disabled).toBe(true);
    expect(moveToDecrementButton.disabled).toBe(true);
    expect(exitGameButton.disabled).toBe(true);
    expect(document.querySelector("#status")?.textContent).toBe(
      "No game in progress. Press New Game to begin.",
    );

    chooseGameOptionsMock.mockClear();
    newGameButton.click();
    await flushPromises();

    expect(chooseGameOptionsMock).toHaveBeenCalledTimes(1);
    expect(undoMoveButton.disabled).toBe(false);
    expect(incrementButton.disabled).toBe(false);
    expect(decrementButton.disabled).toBe(false);
    expect(moveToIncrementButton.disabled).toBe(false);
    expect(moveToDecrementButton.disabled).toBe(false);
    expect(exitGameButton.disabled).toBe(false);
    expect(document.querySelector("#status")?.textContent).toBe("");
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

  it("records both squares in the move-entry readouts after a board move", async () => {
    queueGameSetup({
      playerColour: "white",
      computerDifficulty: "medium",
      playerName: null,
    });

    await loadApp();

    const moveFromInput = document.querySelector<HTMLInputElement>("#move-from-input");
    const moveToInput = document.querySelector<HTMLInputElement>("#move-to-input");

    if (!moveFromInput || !moveToInput) {
      throw new Error("Expected move entry inputs to exist.");
    }

    getSquare("e2").click();
    getSquare("e4").click();

    expect(moveFromInput.value).toBe("e2");
    expect(moveToInput.value).toBe("e4");
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

  it("lets the player enter a move through the coordinate readouts", async () => {
    queueGameSetup({
      playerColour: "white",
      computerDifficulty: "medium",
      playerName: null,
    });

    await loadApp();

    const moveFromInput = document.querySelector<HTMLInputElement>("#move-from-input");
    const moveToInput = document.querySelector<HTMLInputElement>("#move-to-input");
    const moveEntryForm = document.querySelector<HTMLFormElement>("#move-entry-form");

    if (!moveFromInput || !moveToInput || !moveEntryForm) {
      throw new Error("Expected move entry controls to exist.");
    }

    moveFromInput.value = "e2";
    moveFromInput.dispatchEvent(new Event("input", { bubbles: true }));
    moveToInput.value = "e4";
    moveToInput.dispatchEvent(new Event("input", { bubbles: true }));
    moveEntryForm.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
    await flushPromises();

    expect(getSquare("e4").querySelector(".piece")?.getAttribute("aria-label")).toBe(
      "white pawn on e4",
    );
    expect(moveFromInput.value).toBe("e2");
    expect(moveToInput.value).toBe("e4");
  });

  it("keeps both move-entry readouts lit after a mouse drag move is confirmed", async () => {
    queueGameSetup({
      playerColour: "white",
      computerDifficulty: "medium",
      playerName: null,
    });

    await loadApp();

    const moveFromInput = document.querySelector<HTMLInputElement>("#move-from-input");
    const moveToInput = document.querySelector<HTMLInputElement>("#move-to-input");
    const originSquare = getSquare("e2");
    const destinationSquare = getSquare("e4");

    if (!moveFromInput || !moveToInput) {
      throw new Error("Expected move entry inputs to exist.");
    }

    originSquare.dispatchEvent(new MouseEvent("mousedown", {
      bubbles: true,
      clientX: 12,
      clientY: 12,
    }));
    destinationSquare.dispatchEvent(new MouseEvent("mouseup", {
      bubbles: true,
      clientX: 44,
      clientY: 54,
    }));
    destinationSquare.dispatchEvent(new MouseEvent("click", {
      bubbles: true,
      clientX: 44,
      clientY: 54,
    }));
    await flushPromises();

    expect(getSquare("e4").querySelector(".piece")?.getAttribute("aria-label")).toBe(
      "white pawn on e4",
    );
    expect(moveFromInput.value).toBe("e2");
    expect(moveToInput.value).toBe("e4");
  });

  it("swaps the move-entry readout to the rook leg after castling is confirmed", async () => {
    queueGameSetup({
      playerColour: "white",
      computerDifficulty: "medium",
      playerName: null,
    });

    await loadApp({
      initialFen: "4k3/8/8/8/8/8/8/R3K2R w KQ - 0 1",
    });

    const moveFromInput = document.querySelector<HTMLInputElement>("#move-from-input");
    const moveToInput = document.querySelector<HTMLInputElement>("#move-to-input");

    if (!moveFromInput || !moveToInput) {
      throw new Error("Expected move entry inputs to exist.");
    }

    getSquare("e1").click();
    getSquare("g1").click();
    await flushPromises();

    expect(getSquare("g1").querySelector(".piece")?.getAttribute("aria-label")).toBe(
      "white king on g1",
    );
    expect(getSquare("f1").querySelector(".piece")?.getAttribute("aria-label")).toBe(
      "white rook on f1",
    );
    expect(moveFromInput.value).toBe("e1");
    expect(moveToInput.value).toBe("g1");

    vi.advanceTimersByTime(900);
    await flushPromises();

    expect(moveFromInput.value).toBe("h1");
    expect(moveToInput.value).toBe("f1");
  });
});
