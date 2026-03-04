// Establishes the type for a move delta, which is a 
// tuple of two numbers representing the change in rank (dr) and file (df) 
// when moving from one square to another on a chessboard. 
// The 'readonly' modifier indicates that the values in the tuple cannot be modified after they are created.
// Comments throughout the codebase provide a clear explanation of the purpose and structure of the Delta type, 
// making it easier for developers to understand its usage in the context of chess move calculations.
export type Delta = readonly [dr: number, df: number];