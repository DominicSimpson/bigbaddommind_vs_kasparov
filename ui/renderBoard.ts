import { FILES, RANKS } from "../src/types/coords.js";
import type { ChessBoard } from "../src/board/ChessBoard.js";
import type { PieceType } from "../src/pieces/Piece.js";
import type { Colour } from "../src/types/colour.js";

// For UI:
const pieceSymbols: Record<Colour, Record<PieceType, string>> = {
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

export function renderBoard(board: ChessBoard, root: HTMLElement): void {
  root.replaceChildren();

  const grid = document.createElement("div");
  grid.className = "board-grid";

  for (const rank of [...RANKS].reverse()) {
    for (const file of FILES) {
      const square = board.getSquare(rank, file);
      const squareElement = document.createElement("div");
      squareElement.className = `square ${square.isLight ? "light" : "dark"}`;
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

      if (square.piece) {
        const pieceElement = document.createElement("span");
        pieceElement.className = "piece";
        pieceElement.textContent = pieceSymbols[square.piece.colour][square.piece.type];
        pieceElement.setAttribute(
          "aria-label",
          `${square.piece.colour} ${square.piece.type} on ${square.coord}`,
        );
        squareElement.append(pieceElement);
      }

      grid.append(squareElement);
    }
  }

  root.append(grid);
}
