import type { Colour } from "../types/colour.js";
import type { Rank, File } from "../types/coords.js";
import type { Move } from "../types/Move.js";
import { RANKS, FILES } from "../types/coords.js";
import type { ChessBoard } from "../board/ChessBoard.js";

export class LegalMoveFilter {
    constructor(private board: ChessBoard) {}

    // Returns an array of legal moves for the piece on the given square:
    // enforceTurn logic: method should only allow moves for the side whose turn it currently is
    public getLegalMoves(fromRank: Rank, fromFile: File, enforceTurn = true): Move[] {
        const fromSq = this.board.getSquare(fromRank, fromFile);
        const piece = fromSq.piece;

        // If no piece on square, or if enforceTurn is true and piece is not of the colour to move, return empty array:
        if (!piece) return [];
        if (enforceTurn && piece.colour !== this.board.getSideToMove()) return []; // checks which side to move

        // colour of piece being moved, used for king-safety checks and castling rules:
        const moverColour = piece.colour;
        // get pseudo-legal moves for piece on square, then filter them for legality
        const pseudo = this.board.generatePseudoLegalMovesForFiltering(fromRank, fromFile);
        const legal: Move[] = []; // only the subset of truly legal moves that passes the king-safety test

        // iterates over pseudo-legal moves one by one, i.e. by movement alone without checking if king is left in check:
        for (const move of pseudo) {

            // Castling extra rules: can't castle out of check or through check:
            if (move.castle) {
                
                // Can't castle while king is in check, so skip move:
                if (this.board.isInCheck(moverColour)) continue;

                // enemy here is colour of opponent's piece
                // If moving king is white, then moverColour = "white": enemy = "black", and vice-versa
                // Ensures that a king may not castle through a square that is under attack by an enemy piece:
                const enemy = moverColour === "white" ? "black" : "white";

                // Can't castle THROUGH check: the square the king crosses must not be attacked
                // K-side crosses f-file (5), Q-side crosses d-file (3):
                const throughFile = (move.castle === "K" ? 5 : 3) as File;

                // Castling stays on same rank:
                const rank = fromRank;
                // Castling move is illegal if the "through" square is attacked by an enemy piece, so skip move:
                if (this.board.isSquareAttackedBy(rank, throughFile, enemy)) continue;
                // Castling move is illegal if the destination square is attacked by an enemy piece, so skip move:
                if (this.board.isSquareAttackedBy(rank, move.toFile, enemy)) continue;  
            }

            // Tracks whether makeMove actually ran, so only undoMove when needed:
            let moved = false;

            // for each attempted move, inspect board and undo move before continuing
            // while legality of move is checked (i.e. if king is in check):
            try {            
                this.board.makeMove(move, true); // temporarily apply candidate move without re-entering legality checks
                moved = true; // records if makeMove() succeeded and mutated the board

            // After makeMove, sideToMove has flipped, so check to see if player
            // who has just moved has left their own king in check
            // Core legality test in chess; if it's true, move is illegal
            
                // if false (king is not in check), move is fully legal and can be added to move array:
                if (!this.board.isInCheck(moverColour)) legal.push(move);
            } catch (err) {
                throw err; // if makeMove threw an error, re-throw it to be handled by caller (e.g. UI can show error message)
            } finally {
                if (moved) {
                    this.board.undoMove(); // add to undoMove record of moves
                }
            }
        }

        return legal; // return array of only legal moves
    }

    // True if colour has at least one legal move anywhere on the board:
    public hasAnyLegalMoves(colour: Colour): boolean {
        for (const r of RANKS) {
            for (const f of FILES) {
                const square = this.board.getSquare(r, f);
                const piece = square.piece;

                // If no piece on square, or if piece is not of the colour to move, skip square:
                if (!piece || piece.colour !== colour) continue;

                // If any piece has at least one legal move, return true:
                if (this.getLegalMoves(r, f, false).length > 0) return true;
            }
        }
        return false; // If nothing had a legal move
    } 

}
