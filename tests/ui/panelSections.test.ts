// @vitest-environment jsdom

import { readFileSync } from "node:fs";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { getAppElements } from "../../ui/input.js";

function loadIndexMarkup(): void {
  const indexPath = path.resolve(process.cwd(), "index.html");
  const html = readFileSync(indexPath, "utf8");
  const parsed = new DOMParser().parseFromString(html, "text/html");

  document.head.innerHTML = parsed.head.innerHTML;
  document.body.innerHTML = parsed.body.innerHTML;
}

describe("app panel sections", () => {
  afterEach(() => {
    document.head.innerHTML = "";
    document.body.innerHTML = "";
  });

  it("keeps the captured pieces panel as a dedicated left-hand panel", () => {
    loadIndexMarkup();

    const capturedPanel = document.querySelector<HTMLElement>("#captured-pieces");

    expect(capturedPanel).not.toBeNull();
    expect(capturedPanel?.classList.contains("captured-panel")).toBe(true);
    expect(capturedPanel?.classList.contains("captured-panel--left")).toBe(true);
    expect(capturedPanel?.parentElement?.classList.contains("board-layout")).toBe(true);
  });

  it("keeps the promotion choices inside the move-entry form and the homage panel outside it", () => {
    loadIndexMarkup();

    const moveEntryForm = document.querySelector<HTMLFormElement>("#move-entry-form");
    const promotionChoicePanel = document.querySelector<HTMLElement>("#promotion-choice-panel");
    const homagePanel = document.querySelector<HTMLElement>(".promotion-homage-panel");

    expect(moveEntryForm).not.toBeNull();
    expect(promotionChoicePanel).not.toBeNull();
    expect(homagePanel).not.toBeNull();
    expect(moveEntryForm?.contains(promotionChoicePanel as Node)).toBe(true);
    expect(moveEntryForm?.contains(homagePanel as Node)).toBe(false);
    expect(homagePanel?.previousElementSibling).toBe(moveEntryForm);
  });

  it("renders the standalone homage panel with four dots and a Kasparov-style badge", () => {
    loadIndexMarkup();

    const homagePanel = document.querySelector<HTMLElement>(".promotion-homage-panel");
    const dots = document.querySelectorAll(".promotion-homage-panel__dot");
    const logo = document.querySelector<HTMLElement>(".promotion-homage-panel__logo");

    expect(homagePanel).not.toBeNull();
    expect(dots).toHaveLength(4);
    expect(logo?.textContent?.trim()).toBe("DomDeepBlue");
  });

  it("still exposes the required app elements when the full page markup is loaded", () => {
    loadIndexMarkup();

    const elements = getAppElements();

    expect(elements.boardRoot.id).toBe("chessboard");
    expect(elements.capturedPieces.id).toBe("captured-pieces");
    expect(elements.moveEntryForm.id).toBe("move-entry-form");
    expect(elements.promotionChoicePanel.id).toBe("promotion-choice-panel");
    expect(elements.promotionChoiceButtons).toHaveLength(4);
  });
});
