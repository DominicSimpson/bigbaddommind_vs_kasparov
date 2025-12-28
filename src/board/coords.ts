import type { File, Rank } from "../types.js";

// this file defines what valid chess coordinates are  
// it is essentially the rulebook for the chess board's coordinate system,
// defining concrete values: rank and file are proper Rank/File types, rather than plain numbers
export const FILES = [0, 1, 2, 3, 4, 5, 6, 7] as const satisfies readonly File[]; 
export const RANKS = [0, 1, 2, 3, 4, 5, 6, 7] as const satisfies readonly Rank[];
// `as const satisifies readonly` freezes the value and validates shape,
// so that 0-7 are literal numbers: there are exactly 8 files/ranks and no others exist;
// each number is exact: 0 corresponds to 0, 1 to 1, etc.