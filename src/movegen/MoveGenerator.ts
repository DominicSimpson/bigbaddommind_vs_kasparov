import { ChessBoard } from "../board/ChessBoard.js";
import type { Move } from "../types/Move.js";
import { Piece } from "../pieces/Piece.js";
import { FILES, RANKS } from "../types/coords.js";
import type { File, Rank } from "../types/coords.js";


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
        if (piece.colour !== sideToMove) continue; // side to move logic

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

    // dr = delta rank - change in rank (first number)
    // df = delta file - change in file (second number)
    // // Array of 2-element tuples below <[number, number]>:
    // first number → delta file (df)
    // second number → delta rank (dr)

    
    // pawn movement
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

      // 2. Captures (diagonals left or right)
      for (const df of [-1, 1]) {
        const capFile = fromFile + df;
        const capRank = fromRank + dir;
        // if potential destination square is not on board, skip it
        if (!this.isOnBoard(capRank, capFile)) continue;

        const capSq = board.getSquare(capRank as Rank, capFile as File);
        if (capSq.piece && capSq.piece.colour !== piece.colour) {
          moves.push(this.makeMove(board, fromRank, fromFile, capRank as Rank, capFile as File));
        }
      }
    }
  
    // rook movement
    private static addRookMoves(
      board: ChessBoard,
      rank: Rank,
      file: File,
      piece: Piece,
      moves: Move[]
    ): void {
      this.addSlidingMoves(board, rank, file, piece, moves, ROOK_DIRS);
    }

    // knight movement
    private static addKnightMoves(
      board: ChessBoard,
      fromRank: Rank,
      fromFile: File,
      piece: Piece,
      moves: Move[]
    ): void {
      const deltas: Array<[number, number]> = [
        [+1, +2], // one rank up, two files right 
        [+2, +1], // two ranks up, one file right
        [+2, -1], // two ranks up, one file left
        [+1, -2], // one rank up, two files left 
        [-1, -2], // one rank down, two files left
        [-2, -1], // two ranks down, one file left
        [-2, +1], // two ranks down, one file right
        [-1, +2]  // one rank down, two files right
      ];

      for (const [df, dr] of deltas) {
        const toFile = fromFile + df;
        const toRank = fromRank + dr;

        // if potential destination square is not on board, skip it
        if (!this.isOnBoard(toRank, toFile)) continue;

        // stops a knight from capturing one of its own pieces (self-capture)
        const toSquare = board.getSquare(toRank as Rank, toFile as File);
        if (toSquare.piece && toSquare.piece.colour === piece.colour) continue;

        moves.push(this.makeMove(board, fromRank, fromFile, toRank as Rank, toFile as File));
      }
    }
    
    // bishop movement
    private static addBishopMoves(
      board: ChessBoard,
      rank: Rank,
      file: File,
      piece: Piece,
      moves: Move[]
    ): void {
      this.addSlidingMoves(board, rank, file, piece, moves, BISHOP_DIRS);
    }

    // queen movement
    private static addQueenMoves(
      board: ChessBoard,
      rank: Rank,
      file: File,
      piece: Piece,
      moves: Move[]
    ): void {
      this.addSlidingMoves(board, rank, file, piece, moves, QUEEN_DIRS);
    }

    // king movement
    private static addKingMoves(
      board: ChessBoard,
      rank: Rank,
      file: File,
      piece: Piece,
      moves: Move[]
    ): void {
      const deltas: Array<[number, number]> = [
        [-1, -1], // south-west
        [ 0, -1], // west
        [+1, -1], // north-west
        [-1,  0], // south
        [+1,  0], // north
        [-1, +1], // south-east
        [ 0, +1], // east
        [+1, +1]  // north-east
      ];

      for (const [df, dr] of deltas) {
        const toFile = file + df;
        const toRank = rank + dr;

        // if potential destination square is not on board, skip it
        if (!this.isOnBoard(toRank, toFile)) continue;

        const toSquare = board.getSquare(toRank as Rank, toFile as File);
        if (toSquare.piece && toSquare.piece.colour === piece.colour) continue;

        moves.push(this.makeMove(board, rank, file, toRank as Rank, toFile as File));
      }
    }


    // // //Helper function for ray-based sliding logic:
    // pieces that move by repeated steps in a straight line until something stops them
    // (either another piece or the end of the board), with each direction one ray (like a laser beam!)
    // //Pieces:
    // Rook → straight lines
    // Bishop → diagonals
    // Queen → straight lines + diagonals  
    private static addSlidingMoves(
      board: ChessBoard,
      fromRank: Rank,
      fromFile: File,
      piece: Piece,
      moves: Move[],
      directions: Array<[number, number]>
    ): void {
      for (const [df, dr] of directions) {
        let file = fromFile + df;
        let rank = fromRank + dr;

        while (this.isOnBoard(rank, file)) {
          const targetSquare = board.getSquare(rank as Rank, file as File);

          // own piece blocks: a piece cannot move onto a square occupied by one of its own pieces
          if (targetSquare.piece && targetSquare.piece.colour === piece.colour) break;

          // can move (empty or capture)
          moves.push(this.makeMove(board, fromRank, fromFile, rank as Rank, file as File));

            // capture blocks further sliding
          if (targetSquare.piece && targetSquare.piece.colour !== piece.colour) break;

          file += df;
          rank += dr;
        }
      }
    }

  // -----------------------
    // Utilities
  // -----------------------

    // constructs a Move object in exactly one consistent way - a single source of truth for move creation.
    // packages intent
    private static makeMove(
      board: ChessBoard,
      fromRank: Rank,
      fromFile: File,
      toRank: Rank,
      toFile: File
    ): Move {
      const toSquare = board.getSquare(toRank, toFile);

      const move: Move = {
        fromRank,
        fromFile,
        toRank,
        toFile,
      };

      if (toSquare.piece) move.isCapture = true;

      return move;
    };
    

    private static isOnBoard(rank: number, file: number): boolean {
      return rank >= 0 && rank <= 7 && file >= 0 && file <= 7;
    }

}

// These constants encode the geometry of how a piece is allowed to move,
// independently of the board. They are fixed and should never change. 
// Each entry is a direction vector [df, dr] = delta file, delta rank

const ROOK_DIRS: Array <[number, number]> = [
  [+1,  0], // north
  [-1,  0], // south
  [ 0, +1], // east
  [ 0, -1], // west
];

const BISHOP_DIRS: Array <[number, number]> = [
  [+1, +1], // north-east
  [+1, -1], // north-west
  [-1, +1], // south-east
  [-1, -1], // south-west
];

// spread operator creates new array that contains (concatenates) all the elements of
// ROOK_DIRS, followed by all the elements of BISHOP_DIRS
const QUEEN_DIRS: Array<[number, number]> = [
  ...ROOK_DIRS,
  ...BISHOP_DIRS,
];