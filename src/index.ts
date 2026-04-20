import { ChessBoard } from "./board/ChessBoard.js";
import { getAppElements } from "../ui/input.js";
import { renderBoard } from "../ui/renderBoard.js";
import { renderStatus } from "../ui/renderStatus.js";

const board = new ChessBoard();
const { boardRoot, status, turnBadge } = getAppElements();

renderBoard(board, boardRoot);
renderStatus(board, status, turnBadge);
