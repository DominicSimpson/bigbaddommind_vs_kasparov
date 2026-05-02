import type { ChessBoard } from "../src/board/ChessBoard.js";
import type { PieceType } from "../src/pieces/Piece.js";
import { pieceSymbols } from "./renderBoard.js";

// // This module handles rendering the pieces that have been captured 
// during the game, grouped by colour. It collects captured pieces from 
// the board's move history, 
// sorts them by type, and renders them in a dedicated panel in the UI:
const DISPLAY_ORDER: PieceType[] = ["queen", "rook", "bishop", "knight", "pawn"];

type CapturedGroup = {
  white: PieceType[];
  black: PieceType[];
};

// This function iterates through the move history of the board to collect
// all captured pieces, grouping them by colour. It returns an object with 
// two arrays: one for white pieces and one for black pieces, each containing 
// the types of the captured pieces:
function collectCapturedPieces(board: ChessBoard): CapturedGroup {
  const captured: CapturedGroup = {
    white: [],
    black: [],
  };

  for (const entry of board.getMoveHistory()) {
    if (!entry.capturedPiece) {
      continue;
    }

    captured[entry.capturedPiece.colour].push(entry.capturedPiece.type);
  }

  return captured;
}

// This helper function creates a row in the captured pieces panel for a given
// colour. It takes a title (e.g. "White pieces"), the colour of the pieces, 
// and an array of piece types that have been captured for that colour. It 
// returns a DOM element representing the row, which includes the title and 
// symbols for each captured piece (or "None" if no pieces have been captured):
function createCapturedRow(
  title: string,
  colour: "white" | "black",
  pieceTypes: PieceType[],
): HTMLElement {
  const row = document.createElement("div");
  row.className = "captured-panel__row";

  const label = document.createElement("span");
  label.className = "captured-panel__label";
  label.textContent = title;

  const symbols = document.createElement("div");
  symbols.className = "captured-panel__symbols";

  if (pieceTypes.length === 0) {
    const emptyState = document.createElement("span");
    emptyState.className = "captured-panel__empty";
    emptyState.textContent = "None";
    symbols.append(emptyState);
  } else {
    for (const pieceType of pieceTypes) {
      const piece = document.createElement("span");
      piece.className = "captured-panel__piece";
      piece.textContent = pieceSymbols[colour][pieceType];
      piece.setAttribute("aria-label", `${colour} ${pieceType} captured`);
      symbols.append(piece);
    }
  }

  row.append(label, symbols);
  return row;
}

// This is the main function exported by the module, responsible for 
// rendering the captured pieces panel. It collects the captured pieces 
// from the board, sorts them by type, and updates the DOM to display them 
// in a structured format:
export function renderCapturedPieces(
  board: ChessBoard,
  root: HTMLElement,
): void {
  const captured = collectCapturedPieces(board);
  const sortedWhite = DISPLAY_ORDER.flatMap(pieceType => (
    captured.white.filter(capturedType => capturedType === pieceType)
  ));
  const sortedBlack = DISPLAY_ORDER.flatMap(pieceType => (
    captured.black.filter(capturedType => capturedType === pieceType)
  ));

  const title = document.createElement("h3");
  title.className = "captured-panel__title";
  title.textContent = "Captured pieces";

  root.replaceChildren(
    title,
    createCapturedRow("White pieces", "white", sortedWhite),
    createCapturedRow("Black pieces", "black", sortedBlack),
  );
}
