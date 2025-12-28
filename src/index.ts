import { ChessBoard } from "./board/ChessBoard.js";

const board = new ChessBoard();

console.log(board.getSquare(1, 4).piece);


board.movePiece({
                fromRank: 1,
                fromFile: 2,
                toRank: 3,
                toFile: 4
});

console.log(board.getSquare(3, 4).piece);





