import type { Move } from "./Move.js";
import type { Piece } from "../pieces/Piece.js";
import type { Rank, File } from "./coords.js";
import type { Colour } from "./colour.js";
import type { CastlingRights } from "./CastlingRights.js";

export interface UndoRecord { // state delta recorder
    // Before making a move, take a snapshot of everything that will change
    // Store it in a stack
    // Then undo by restoring that snapshot exactly
    move: Move;

    // pieces
    movedPiece: Piece; // the exact piece object that moved
    capturedPiece: Piece | null;  // stores which piece was captured (or en passant victim)

    // special-case squares
    capturedSquare?: { rank: Rank, file: File } | null; // en passant capture only
    // stores where the captured pawn was 
    // Example: pawn moves e5 → d6 en passant; captured pawn is on d5, not d6

    // state before the move
    sideToMoveBefore: Colour; // makeMove() flips the turn; undoMove() must restore it exactly
    castlingRightsBefore: CastlingRights; // castling rights are historical rather than positional,
    // i.e. they cannot be inferred just from looking at the board
    // for example, a rook may be on h1, but if it moved earlier, castling is then illegal
    // Therefore a snapshot needs to be taken
    enPassantTargetBefore: { rank: Rank, file: File } | null; //en passant eligibility lasts 
    // exactly one move
    halfmoveClockBefore: number; // 50-move rule (which I didn't know existed beforehand!) preventing infinite games:
    // if 50 consecutive moves by each player occur with no pawn move or no capture, either player 
    // may claim a draw
    // counter resets to zero when any pawn moves or there is a capture of a piece
    fullmoveNumberBefore: number; // In chess notation, a full move means:
    // one move by white + one move by black
    // white move on its own or vice versa on its own doesn't increment full move number

    // // For castling rook move:
    // castling is two moves disguised as one, and this snapshots rook identity -
    // where it moved from and to, and which one (a-file or h-file)
    // king's piece is not ambigious, so is not required here
    rookFrom?: { rank: Rank; file: File } | null;
    rookTo?: { rank: Rank; file: File } | null;
    rookMove?: Piece | null;

    // for promotion (so undo can restore the pawn cleanly):
    promotedTo?: Piece | null;
}
