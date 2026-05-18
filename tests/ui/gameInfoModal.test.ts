// @vitest-environment jsdom

import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

const {
  isSoundOnMock,
  toggleSoundEnabledMock,
} = vi.hoisted(() => ({
  isSoundOnMock: vi.fn<() => boolean>(),
  toggleSoundEnabledMock: vi.fn<() => boolean>(),
}));

vi.mock("../../src/audio/moveSound.js", () => ({
  isSoundOn: isSoundOnMock,
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
    toggleSoundEnabledMock.mockReturnValue(false);
    openGameInfoModal();

    const initialSoundButton = document.querySelector<HTMLButtonElement>(".setup-dialog__sound-thumbnail");
    const fenButton = document.querySelector<HTMLButtonElement>(".setup-dialog__fen-thumbnail");
    const fenReadout = document.querySelector<HTMLElement>(".setup-dialog__fen-readout");

    if (!initialSoundButton || !fenButton || !fenReadout) {
      throw new Error("Expected the game info controls to exist.");
    }

    expect(initialSoundButton.getAttribute("aria-pressed")).toBe("true");
    expect(initialSoundButton.textContent).toContain("On");

    initialSoundButton.click();

    const updatedSoundButton = document.querySelector<HTMLButtonElement>(".setup-dialog__sound-thumbnail");

    expect(toggleSoundEnabledMock).toHaveBeenCalledTimes(1);
    expect(updatedSoundButton?.getAttribute("aria-pressed")).toBe("false");
    expect(updatedSoundButton?.getAttribute("aria-label")).toBe("Turn sound on");
    expect(updatedSoundButton?.textContent).toContain("Off");

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
});
