import type { Delta } from "../types/delta.js";

export const ROOK_DIRS: readonly Delta[] = [
  [+1, 0],
  [-1, 0],
  [0, +1],
  [0, -1],
];

export const BISHOP_DIRS: readonly Delta[] = [
  [+1, +1],
  [+1, -1],
  [-1, +1],
  [-1, -1],
];

export const QUEEN_DIRS: readonly Delta[] = [
  ...ROOK_DIRS,
  ...BISHOP_DIRS,
];