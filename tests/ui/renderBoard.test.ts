// @vitest-environment jsdom

import { describe, expect, it } from "vitest";
import { ChessBoard } from "../../src/board/ChessBoard.js";
import { renderBoard } from "../../ui/renderBoard.js";

function createRoot(): HTMLDivElement {
  const root = document.createElement("div");
  document.body.replaceChildren(root);
  return root;
}

describe("renderBoard", () => {
  it("renders an 8x8 board with coordinate labels", () => {
    const board = new ChessBoard();
    const root = createRoot();

    renderBoard(board, root);

    const squares = root.querySelectorAll<HTMLElement>(".square");

    expect(root.querySelector(".board-grid")).not.toBeNull();
    expect(squares).toHaveLength(64);
    expect(squares[0]?.dataset.coord).toBe("a8");
    expect(squares[63]?.dataset.coord).toBe("h1");
    expect(root.querySelectorAll(".square-label.rank")).toHaveLength(8);
    expect(root.querySelectorAll(".square-label.file")).toHaveLength(8);
    expect(root.querySelector<HTMLElement>('.square[data-coord="a8"] .square-label.rank')?.textContent).toBe("8");
    expect(root.querySelector<HTMLElement>('.square[data-coord="a1"] .square-label.file')?.textContent).toBe("a");
  });

  it("applies selection and legal move classes to the matching squares", () => {
    const board = new ChessBoard();
    const root = createRoot();

    renderBoard(board, root, {
      selectedCoord: "e2",
      legalMoveCoords: new Set(["e3", "e4"]),
      legalCaptureCoords: new Set(["d3"]),
    });

    expect(root.querySelector('.square[data-coord="e2"]')?.className).toContain("selected");
    expect(root.querySelector('.square[data-coord="e2"]')?.className).toContain("occupied");
    expect(root.querySelector('.square[data-coord="e3"]')?.className).toContain("legal-target");
    expect(root.querySelector('.square[data-coord="e4"]')?.className).toContain("legal-target");
    expect(root.querySelector('.square[data-coord="d3"]')?.className).toContain("legal-capture");
    expect(
      root.querySelector('.square[data-coord="e2"] .piece')?.getAttribute("aria-label"),
    ).toBe("white pawn on e2");
  });

  it("renders the computer move preview on the destination square and hides the origin piece", () => {
    const board = new ChessBoard();
    const root = createRoot();

    renderBoard(board, root, {
      computerMovingCoord: "e2",
      computerMovePreview: {
        originCoord: "e2",
        currentCoord: "e4",
        colour: "white",
        pieceType: "pawn",
      },
    });

    expect(root.querySelector('.square[data-coord="e2"] .piece')).toBeNull();
    expect(root.querySelector('.square[data-coord="e2"]')?.className).toContain("occupied");

    const previewPiece = root.querySelector<HTMLElement>('.square[data-coord="e4"] .piece');

    expect(previewPiece).not.toBeNull();
    expect(previewPiece?.className).toContain("piece--computer-moving");
    expect(previewPiece?.className).toContain("piece--computer-preview");
    expect(previewPiece?.getAttribute("aria-label")).toBe("white pawn moving through e4");
  });
});
