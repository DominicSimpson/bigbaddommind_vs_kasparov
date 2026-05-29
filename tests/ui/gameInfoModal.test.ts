// @vitest-environment jsdom

import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

const {
  isSoundOnMock,
  setSoundEnabledMock,
  toggleSoundEnabledMock,
} = vi.hoisted(() => ({
  isSoundOnMock: vi.fn<() => boolean>(),
  setSoundEnabledMock: vi.fn<(enabled: boolean) => void>(),
  toggleSoundEnabledMock: vi.fn<() => boolean>(),
}));

vi.mock("../../src/audio/moveSound.js", () => ({
  isSoundOn: isSoundOnMock,
  setSoundEnabled: setSoundEnabledMock,
  toggleSoundEnabled: toggleSoundEnabledMock,
}));

import { resetStatusDialogs, showGameInfoModal } from "../../ui/modalPopupWindow.js";

beforeAll(() => {
  if (typeof HTMLDialogElement === "undefined") {
    class HTMLDialogElementStub extends HTMLElement {
      open = false;
      returnValue = "";

      showModal(): void {
        this.open = true;
      }

      show(): void {
        this.open = true;
      }

      close(returnValue = ""): void {
        this.open = false;
        this.returnValue = returnValue;
        this.dispatchEvent(new Event("close"));
      }
    }

    Object.defineProperty(globalThis, "HTMLDialogElement", {
      configurable: true,
      value: HTMLDialogElementStub,
    });
  }

  if (!HTMLDialogElement.prototype.showModal) {
    HTMLDialogElement.prototype.showModal = function showModal(): void {
      this.open = true;
    };
  }

  if (!HTMLDialogElement.prototype.show) {
    HTMLDialogElement.prototype.show = function show(): void {
      this.open = true;
    };
  }

  if (!HTMLDialogElement.prototype.close) {
    HTMLDialogElement.prototype.close = function close(returnValue = ""): void {
      this.open = false;
      this.returnValue = returnValue;
      this.dispatchEvent(new Event("close"));
    };
  }
});

beforeEach(() => {
  isSoundOnMock.mockReset();
  setSoundEnabledMock.mockReset();
  toggleSoundEnabledMock.mockReset();
  isSoundOnMock.mockReturnValue(true);
});

afterEach(() => {
  resetStatusDialogs();
  vi.clearAllMocks();
  document.body.innerHTML = "";
  document.head.innerHTML = "";
});

function openGameInfoModal(overrides: Partial<Parameters<typeof showGameInfoModal>[0]> = {}): void {
  showGameInfoModal({
    moveGuidance: "Enter the starting square, then the destination square.",
    promotionGuidance: "Choose the promotion piece from the available buttons.",
    promotionThumbnailCaption: "Selecting queen promotes the pawn to a queen.",
    playerName: "Dana",
    playerColour: "black",
    computerDifficulty: "hard",
    currentFen: "4k3/8/8/8/8/8/8/4K3 b - - 0 1",
    leaderboardEntries: [
      { name: "Dana", points: 4 },
      { name: "Chris", points: 1 },
    ],
    ...overrides,
  });
}

describe("showGameInfoModal", () => {
  it("renders the game guidance, current game details, and leaderboard entries", () => {
    openGameInfoModal();

    const dialog = document.querySelector<HTMLDialogElement>("dialog.setup-dialog--large");

    expect(dialog).not.toBeNull();
    expect(dialog?.open).toBe(true);
    expect(document.querySelector(".setup-dialog__title")?.textContent).toBe("Game info");
    expect(document.body.textContent).toContain("Enter the starting square, then the destination square.");
    expect(document.body.textContent).toContain("Choose the promotion piece from the available buttons.");
    expect(document.body.textContent).toContain("Selecting queen promotes the pawn to a queen.");
    expect(document.body.textContent).toContain("This game");
    expect(document.body.textContent).toContain("Dana");
    expect(document.body.textContent).toContain("Black");
    expect(document.body.textContent).toContain("Hard");
    expect(document.body.textContent).toContain("Leaderboard");
    expect(document.body.textContent).toContain("Dana");
    expect(document.body.textContent).toContain("4 points");
    expect(document.body.textContent).toContain("Chris");
    expect(document.body.textContent).toContain("1 point");

    const fenReadout = document.querySelector<HTMLElement>(".setup-dialog__fen-readout");
    const fenButton = document.querySelector<HTMLButtonElement>(".setup-dialog__fen-thumbnail");

    expect(fenReadout?.hidden).toBe(true);
    expect(fenReadout?.textContent).toBe("4k3/8/8/8/8/8/8/4K3 b - - 0 1");
    expect(fenButton?.getAttribute("aria-expanded")).toBe("false");
  });

  it("toggles the sound and FEN controls inside the panel", () => {
    setSoundEnabledMock.mockImplementation((enabled: boolean) => {
      isSoundOnMock.mockReturnValue(enabled);
    });
    openGameInfoModal();

    const soundButtons = document.querySelectorAll<HTMLButtonElement>(".setup-dialog__sound-option");
    const initialSoundOnButton = document.querySelector<HTMLButtonElement>("[data-sound-state='on']");
    const initialSoundOffButton = document.querySelector<HTMLButtonElement>("[data-sound-state='off']");
    const fenButton = document.querySelector<HTMLButtonElement>(".setup-dialog__fen-thumbnail");
    const fenReadout = document.querySelector<HTMLElement>(".setup-dialog__fen-readout");

    if (!initialSoundOnButton || !initialSoundOffButton || !fenButton || !fenReadout) {
      throw new Error("Expected the game info controls to exist.");
    }

    expect(soundButtons).toHaveLength(2);
    expect(initialSoundOnButton.getAttribute("aria-pressed")).toBe("true");
    expect(initialSoundOffButton.getAttribute("aria-pressed")).toBe("false");

    initialSoundOffButton.click();

    const updatedSoundOnButton = document.querySelector<HTMLButtonElement>("[data-sound-state='on']");
    const updatedSoundOffButton = document.querySelector<HTMLButtonElement>("[data-sound-state='off']");

    expect(setSoundEnabledMock).toHaveBeenCalledTimes(1);
    expect(setSoundEnabledMock).toHaveBeenCalledWith(false);
    expect(toggleSoundEnabledMock).not.toHaveBeenCalled();
    expect(updatedSoundOnButton?.getAttribute("aria-pressed")).toBe("false");
    expect(updatedSoundOffButton?.getAttribute("aria-pressed")).toBe("true");

    expect(fenReadout.hidden).toBe(true);
    fenButton.click();

    const expandedFenButton = document.querySelector<HTMLButtonElement>(".setup-dialog__fen-thumbnail");

    expect(fenReadout.hidden).toBe(false);
    expect(expandedFenButton?.getAttribute("aria-expanded")).toBe("true");
    expect(expandedFenButton?.getAttribute("aria-label")).toBe("Hide FEN position");
  });

  it("shows the empty leaderboard state and closes when OK is pressed", () => {
    openGameInfoModal({
      leaderboardEntries: [],
    });

    expect(document.body.textContent).toContain("No named player wins have been recorded yet.");

    const okButton = Array.from(document.querySelectorAll<HTMLButtonElement>("button"))
      .find(button => button.textContent === "OK");

    if (!okButton) {
      throw new Error("Expected an OK button to exist.");
    }

    okButton.click();

    expect(document.querySelector("dialog")).toBeNull();
  });

  it("calls the open and close hooks for the game info modal", () => {
    const onOpen = vi.fn();
    const onClose = vi.fn();

    openGameInfoModal({
      onOpen,
      onClose,
    });

    expect(onOpen).toHaveBeenCalledTimes(1);

    const okButton = Array.from(document.querySelectorAll<HTMLButtonElement>("button"))
      .find(button => button.textContent === "OK");

    if (!okButton) {
      throw new Error("Expected an OK button to exist.");
    }

    okButton.click();

    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
