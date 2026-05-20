// @vitest-environment jsdom

import { describe, expect, it } from "vitest";
import { ChessBoard } from "../../src/board/ChessBoard.js";
import { renderStatus } from "../../ui/renderStatus.js";

function createStatusElements(): {
  status: HTMLParagraphElement;
  turnBadge: HTMLDivElement;
} {
  const status = document.createElement("p");
  const turnBadge = document.createElement("div");
  document.body.replaceChildren(status, turnBadge);
  return { status, turnBadge };
}

describe("renderStatus", () => {
  it("marks the Team-Mate panel as thinking while the computer is thinking", () => {
    const board = new ChessBoard();
    const { status, turnBadge } = createStatusElements();

    renderStatus(board, status, turnBadge, { white: "White", black: "Black" }, {
      isComputerThinking: true,
    });

    expect(
      turnBadge.querySelector<HTMLElement>('.team-mate-panel')?.dataset.state,
    ).toBe("thinking");
  });

  it("marks the Team-Mate panel as idle when the computer is not thinking", () => {
    const board = new ChessBoard();
    const { status, turnBadge } = createStatusElements();

    renderStatus(board, status, turnBadge, { white: "White", black: "Black" });

    expect(
      turnBadge.querySelector<HTMLElement>('.team-mate-panel')?.dataset.state,
    ).toBe("idle");
  });

  it("lights the Info indicator only while the game info modal is active", () => {
    const board = new ChessBoard();
    const { status, turnBadge } = createStatusElements();

    renderStatus(board, status, turnBadge, { white: "White", black: "Black" }, {
      isGameInfoOpen: true,
    });

    const rows = Array.from(turnBadge.querySelectorAll<HTMLElement>(".team-mate-panel__row"));
    const infoRow = rows.find(row => row.textContent?.includes("Info"));

    expect(infoRow?.querySelector(".team-mate-panel__led")?.className).toContain("is-active");

    renderStatus(board, status, turnBadge, { white: "White", black: "Black" }, {
      isGameInfoOpen: false,
    });

    const updatedRows = Array.from(turnBadge.querySelectorAll<HTMLElement>(".team-mate-panel__row"));
    const updatedInfoRow = updatedRows.find(row => row.textContent?.includes("Info"));

    expect(updatedInfoRow?.querySelector(".team-mate-panel__led")?.className).not.toContain("is-active");
  });
});
