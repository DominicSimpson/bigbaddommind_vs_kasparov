import { ChessBoard } from "../board/ChessBoard.js";
import type { Move } from "../types/Move.js";
import type { Colour } from "../types/colour.js";
import { Piece } from "../pieces/Piece.js";
import { FILES, RANKS } from "../types/coords.js";
import type { File, Rank } from "../types/coords.js";
import path from "path";


export class MoveGenerator { // pseudo-legal moves - obey piece movement rules
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
          case "pawn":
            this.addPawnMoves(board, rank, file, piece, moves);
            break;
          case "rook":
            this.addRookMoves(board, rank, file, piece, moves); 
            break;
          case "knight":
            this.addKnightMoves(board, rank, file, piece, moves);
            break;
          case "bishop":
            this.addBishopMoves(board, rank, file, piece, moves); 
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

    private static addPawnMoves(
      board: ChessBoard,
      fromRank: Rank,
      fromFile: File,
      piece: Piece,
      moves: Move[]
    ): void {
      
      // basic pawn support
      const dir = piece.colour === "white" ? 1: -1;
      const oneStepRank = fromRank + dir;

      // 1. Forward movement
      if (this.isOnBoard(oneStepRank, fromFile)) {
        const fwdSq = board.getSquare(oneStepRank as Rank, fromFile);
        if (!fwdSq.piece) {
          moves.push(this.makeMove(board, fromRank, fromFile, oneStepRank as Rank, fromFile));
        }
      }

      // 2. Captures (diagonals)
      for (const df of [-1, 1]) {
        const capFile = fromFile + df;
        const capRank = fromRank + dir;
        if (!this.isOnBoard(capRank, capFile)) continue;

        const capSq = board.getSquare(capRank as Rank, capFile as File);
        if (capSq.piece && capSq.piece.colour !== piece.colour) {
          moves.push(this.makeMove(board, fromRank, fromFile, capRank as Rank, capFile as File));
        }
      }
    }
  
    private static addRookMoves(
      board: ChessBoard,
      rank: Rank,
      file: File,
      piece: Piece,
      moves: Move[]
    ): void {
      this.addSlidingMoves(board, rank, file, piece, moves, ROOK_DIRS);
    }

    private static addKnightMoves(
      board: ChessBoard,
      fromRank: Rank,
      fromFile: File,
      piece: Piece,
      moves: Move[]
    ): void {
      const deltas: Array<[number, number]> = [
        [+1, +2],
        [+2, +1],
        [+2, -1],
        [+1, -2],
        [-1, -2],
        [-2, -1],
        [-2, +1],
        [-1, +2]
      ];

      for (const [df, dr] of deltas) {
        const toFile = fromFile + df;
        const toRank = fromRank + dr;

        if (!this.isOnBoard(toRank, toFile)) continue;

        const toSquare = board.getSquare(toRank as Rank, toFile as File);
        if (toSquare.piece && toSquare.piece.colour === piece.colour)

        moves.push(this.makeMove(board, fromRank, fromFile, toRank as Rank, toFile as File));
      }
    }
    
    private static addBishopMoves(
      board: ChessBoard,
      rank: Rank,
      file: File,
      piece: Piece,
      moves: Move[]
    ): void {
      this.addSlidingMoves(board, rank, file, piece, moves, BISHOP_DIRS);
    }

     private static addQueenMoves(
      board: ChessBoard,
      rank: Rank,
      file: File,
      piece: Piece,
      moves: Move[]
    ): void {
      this.addSlidingMoves(board, rank, file, piece, moves, QUEEN_DIRS);
    }

    private static addKingMoves(
      board: ChessBoard,
      rank: Rank,
      file: File,
      piece: Piece,
      moves: Move[]
    ): void {
      const deltas: Array<[number, number]> = [
        [-1, -1],
        [ 0, -1],
        [+1, -1],
        [-1,  0],
        [+1,  0],
        [-1, +1],
        [ 0, +1],
        [+1, +1]
      ];

      for (const [df, dr] of deltas) {
        const toFile = fromFile + df;
        const toRank = fromRank + dr;

        if (!this.isOnBoard(toRank, toFile)) continue;

        const toSquare = board.getSquare(toRank as Rank, toFile as File);
        if (toSquare.piece && toSquare.piece.colour === piece.colour) continue;

        moves.push(this.makeMove(board, fromRank, fromFile, toRank as Rank, toFile as File));
      }
    }


}