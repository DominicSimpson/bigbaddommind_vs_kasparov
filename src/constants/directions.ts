import type { Delta } from "../types/delta.js";

// // Direction permutations:

// These constants encode the geometry of how a piece is allowed to move,
// independently of the board. They are fixed and should never change (signified by all caps). 
// Each entry is a direction vector [dr, df] = delta rank, delta file
// For example, the knight moves in an L shape, so its directions are all the ways to move 2 in one direction and 1 in the other.

// Pawn directions are not included here because pawn movement depends on game state 
// (colour, starting rank, and special rules like en passant), so it cannot be represented purely as fixed 
// direction vectors like the other pieces.
// Other pieces → fixed geometry → constants
// Pawns → state-dependent behaviour → handled in code

// A knight always moves in a 2 + 1 pattern, with exactly 8 permutations of movement:
export const KNIGHT_DIRS: readonly Delta[] = [ // fixed jumps
  [-2, -1], // two ranks down, one file left
  [-2, +1], // two ranks down, one file right
  [-1, -2], // one rank down, two files left
  [-1, +2], // one rank down, two files right
  [+1, -2], // one rank up, two files left 
  [+1, +2], // one rank up, two files right  
  [+2, -1], // two ranks up, one file left
  [+2, +1]  // two ranks up, one file right
];

export const KING_DIRS: readonly Delta[] = [ // fixed steps
  [+1,  0], // north
  [+1, +1], // north-east 
  [ 0, +1], // east
  [-1, +1], // south-east
  [-1,  0], // south
  [-1, -1], // south-west
  [ 0, -1], // west
  [+1, -1], // north-west
];

export const ROOK_DIRS: readonly Delta[] = [ // orthogonal rays
  [+1,  0], // north
  [-1,  0], // south
  [ 0, +1], // east
  [ 0, -1], // west
];

export const BISHOP_DIRS: readonly Delta[] = [ // diagonal rays
  [+1, +1], // north-east
  [+1, -1], // north-west
  [-1, +1], // south-east
  [-1, -1], // south-west
];

// spread operator creates new array that contains (concatenates) all the elements of
// ROOK_DIRS, followed by all the elements of BISHOP_DIRS
export const QUEEN_DIRS: readonly Delta[] = [ // queen is both orthogonal and diagonal rays
  ...ROOK_DIRS,
  ...BISHOP_DIRS,
];