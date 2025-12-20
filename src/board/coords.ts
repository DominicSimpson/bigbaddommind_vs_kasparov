import type { File, Rank } from "../types.js";

// this file defines what valid chess coordinates are  
// it is essentially the rulebook for the chess board's coordinate system,
// defining concrete values: rank and file are proper Rank/File types, rather than plain numbers
export const FILES: File[] = [0, 1, 2, 3, 4, 5, 6, 7];
export const RANKS: Rank[] = [0, 1, 2, 3, 4, 5, 6, 7];