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

// For UI:
export const pieceSymbols: Record<Colour, Record<PieceType, string>> = {
  white: {
    king: "♔",
    queen: "♕",
    rook: "♖",
    bishop: "♗",
    knight: "♘",
    pawn: "♙",
  },
  black: {
    king: "♚",
    queen: "♛",
    rook: "♜",
    bishop: "♝",
    knight: "♞",
    pawn: "♟",
  },
};

// render chess board
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

  const grid = document.createElement("div");
  grid.className = "board-grid";
  // visual effect for when player clicks on the selected piece:
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
      // when the player clicks on a piece, it highlights the square:
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
        // This is used to trigger the "moving..." visual effect on the 
        // piece that's about to move, while the computer is "thinking".
        // This helps the human player track the computer's move, because 
        // the move happens immediately after the computer "thinks",
        // with no visual transition or indication of which piece just moved:
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

  root.append(grid);
}
