import { ChessBoard } from "../board/ChessBoard.js";
import type { Move } from "../types/Move.js";
import type { Colour } from "../types/colour.js";
import { Piece } from "../pieces/Piece.js";
import { FILES, RANKS } from "../types/coords.js";
import type { File, Rank } from "../types/coords.js";


class MoveGenerator { // pseudo-legal moves - obey piece movement rules
  // but do not yet check whether king is in check/checkmate (obviously illegal in real chess)
  // or if promotions/en passant/castling has happened
  static getPseudoLegalMoves(board: ChessBoard): Move[] {
    const moves: Move[] = [];
    const sideToMove = board.getSideToMove();
    // if piece belongs to sideToMove
    // generate moves based on piece type

    for (const rank of RANKS) { // loop through board squares
      for (const file of FILES) {
        const square = board.getSquare(rank, file);
        const piece = square.piece;

        if (!piece) continue;
        if (piece.colour !== sideToMove) continue;

        switch (piece.type) { // switch statement for pieces
          case "knight":
            this.addKnightMoves(board, rank, file, piece, moves);
            break;
          case "pawn":
            this.addPawnMoves(board, rank, file, piece, moves);
            break;
          case "bishop":
            this.addBishopMoves(board, rank, file, piece, moves); 
            break;
          case "rook":
            this.addRookMoves(board, rank, file, piece, moves); 
            break;
          case "queen":
            this.addQueenMoves(board, rank, file, piece, moves);
            break;
          case "king":
            this.addKingMoves(board, rank, file, piece, moves);
        }
      }
    }

    return moves;
  }


  // -------------------------
    // Piece-specific helpers
  // -------------------------


}