import { FILES, RANKS } from "../src/types/coords.js";
import type { ChessBoard } from "../src/board/ChessBoard.js";
import type { PieceType } from "../src/pieces/Piece.js";
import type { Colour } from "../src/types/colour.js";

// // Types related to rendering the chess board and pieces, and the computer 
// move animation:
export type ComputerMovePreview = {
  originCoord: string;
  currentCoord: string;
  colour: Colour;
  pieceType: PieceType;
};

// // Board rendering logic, which converts the ChessBoard state into HTML elements, 
// and also defines the piece symbols and other UI-related types:
export type BoardRenderState = {
  selectedCoord?: string | null;
  computerMovingCoord?: string | null;
  computerMovePreview?: ComputerMovePreview | null;
  legalMoveCoords?: ReadonlySet<string>;
  legalCaptureCoords?: ReadonlySet<string>;
};

// For UI: mapping from piece types and colours to their corresponding 
// Unicode symbols for display purposes:
export const pieceSymbols: Record<Colour, Record<PieceType, string>> = {
  white: {
    king: "\u2654",
    queen: "\u2655",
    rook: "\u2656",
    bishop: "\u2657",
    knight: "\u2658",
    pawn: "\u2659",
  },
  black: {
    king: "\u265A",
    queen: "\u265B",
    rook: "\u265C",
    bishop: "\u265D",
    knight: "\u265E",
    pawn: "\u265F",
  },
};

// Render chess board:
export function renderBoard(
  board: ChessBoard,
  root: HTMLElement,
  {
    selectedCoord = null,
    computerMovingCoord = null,
    computerMovePreview = null,
    legalMoveCoords = new Set<string>(),
    legalCaptureCoords = new Set<string>(),
  }: BoardRenderState = {},
): void {
  root.replaceChildren();

  const boardShell = document.createElement("div");
  boardShell.className = "board-shell";

  const leftAxis = document.createElement("div");
  leftAxis.className = "board-axis board-axis--left";

  for (const rank of [...RANKS].reverse()) {
    const axisCell = document.createElement("div");
    axisCell.className = "board-axis__cell";

    const tick = document.createElement("span");
    tick.className = "board-axis__tick";
    axisCell.append(tick);

    const label = document.createElement("span");
    label.className = "board-axis__label";
    label.textContent = String(rank + 1);
    axisCell.append(label);

    leftAxis.append(axisCell);
  }

  const boardScreen = document.createElement("div");
  boardScreen.className = "board-screen";

  const grid = document.createElement("div");
  grid.className = "board-grid";
  

  for (const rank of [...RANKS].reverse()) {
    for (const file of FILES) {
      const square = board.getSquare(rank, file);
      const squareElement = document.createElement("div");
      const classes = [
        "square",
        square.isLight ? "light" : "dark",
      ];

      if (square.piece) {
        classes.push("occupied");
      }

      if (square.coord === selectedCoord) {
        classes.push("selected");
      }

      if (legalMoveCoords.has(square.coord)) {
        classes.push("legal-target");
      }

      if (legalCaptureCoords.has(square.coord)) {
        classes.push("legal-capture");
      }

      squareElement.className = classes.join(" ");
      squareElement.setAttribute("data-coord", square.coord);
      squareElement.setAttribute("aria-label", square.coord);

      if (file === 0) {
        const rankLabel = document.createElement("span");
        rankLabel.className = "square-label rank";
        rankLabel.textContent = String(rank + 1);
        squareElement.append(rankLabel);
      }

      if (rank === 0) {
        const fileLabel = document.createElement("span");
        fileLabel.className = "square-label file";
        fileLabel.textContent = "abcdefgh"[file];
        squareElement.append(fileLabel);
      }

      const previewOccupiesSquare = (
        computerMovePreview
        && square.coord === computerMovePreview.currentCoord
        && square.coord !== computerMovePreview.originCoord
      );
      const hideOriginalPiece = (
        computerMovePreview
        && square.coord === computerMovePreview.originCoord
        && computerMovePreview.currentCoord !== computerMovePreview.originCoord
      );

      if (square.piece && !previewOccupiesSquare && !hideOriginalPiece) {
        const pieceElement = document.createElement("span");
        const pieceClasses = ["piece"];

        if (square.coord === computerMovingCoord) {
          pieceClasses.push("piece--computer-moving");
        }

        pieceElement.className = pieceClasses.join(" ");
        pieceElement.textContent = pieceSymbols[square.piece.colour][square.piece.type];
        pieceElement.setAttribute(
          "aria-label",
          `${square.piece.colour} ${square.piece.type} on ${square.coord}`,
        );
        squareElement.append(pieceElement);
      }

      if (
        computerMovePreview
        && square.coord === computerMovePreview.currentCoord
        && computerMovePreview.currentCoord !== computerMovePreview.originCoord
      ) {
        const previewPieceElement = document.createElement("span");
        previewPieceElement.className = "piece piece--computer-moving piece--computer-preview";
        previewPieceElement.textContent = pieceSymbols[computerMovePreview.colour][computerMovePreview.pieceType];
        previewPieceElement.setAttribute(
          "aria-label",
          `${computerMovePreview.colour} ${computerMovePreview.pieceType} moving through ${computerMovePreview.currentCoord}`,
        );
        squareElement.append(previewPieceElement);
      }

      grid.append(squareElement);
    }
  }

  boardScreen.append(grid);

  const bottomAxis = document.createElement("div");
  bottomAxis.className = "board-axis board-axis--bottom";

  for (const file of FILES) {
    const axisCell = document.createElement("div");
    axisCell.className = "board-axis__cell";

    const label = document.createElement("span");
    label.className = "board-axis__label";
    label.textContent = "abcdefgh"[file];
    axisCell.append(label);

    const tick = document.createElement("span");
    tick.className = "board-axis__tick";
    axisCell.append(tick);

    bottomAxis.append(axisCell);
  }

  boardShell.append(leftAxis, boardScreen, bottomAxis);
  root.append(boardShell);
}
