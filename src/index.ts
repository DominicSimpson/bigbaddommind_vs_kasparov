import { ChessBoard } from "./board/ChessBoard.js";

const board = new ChessBoard();


board.movePiece({ // e2 > e4
                fromRank: 1,
                fromFile: 4,
                toRank: 3,
                toFile: 4
});

console.log(board.getSquare(1, 4).piece);
console.log(board.getSquare(3, 4).piece);





