import type { ChessBoard } from "../board/ChessBoard.js";
import type { Move } from "../types/Move.js";
import { isTerminalGameResult } from "../types/GameResult.js";

// // Audio management for chess move events, including move 
// types and game end conditions
type SoundKey =
  | "capture"
  | "castling"
  | "check"
  | "checkmate"
  | "drawByFiftyMoveRule"
  | "drawByInsufficientMaterial"  
  | "drawByThreefoldRepetition"    
  | "enPassant"
  | "ordinaryMove"
  | "promotion"
  | "quitGame"
  | "stalemate";

const SOUND_PATHS: Record<SoundKey, string> = {
  capture: "/sounds/chesssounds_capture.mp3",
  castling: "/sounds/chesssounds_castling.mp3",
  check: "/sounds/chesssounds_check.mp3",
  checkmate: "/sounds/chesssounds_checkmate.mp3",
  drawByFiftyMoveRule: "/sounds/chesssounds_drawbyfiftymoverule.mp3",
  drawByInsufficientMaterial: "/sounds/chesssounds_drawbyinsufficientmaterial.mp3",
  drawByThreefoldRepetition: "/sounds/chesssounds_drawbythreefoldrepetition.mp3",
  enPassant: "/sounds/chesssounds_enpassant.mp3",
  ordinaryMove: "/sounds/chesssounds_ordinarymove.mp3",
  promotion: "/sounds/chesssounds_promotion.mp3",
  quitGame: "/sounds/chesssounds_quitgame.mp3",
  stalemate: "/sounds/chesssounds_stalemate.mp3",
};
// 
const audioCache: Partial<Record<SoundKey, HTMLAudioElement>> = {};

function getAudio(sound: SoundKey): HTMLAudioElement | null {
  if (typeof Audio === "undefined") {
    return null;
  }

  const cachedAudio = audioCache[sound];
  if (cachedAudio) {
    return cachedAudio;
  }

  const audio = new Audio(SOUND_PATHS[sound]);
  audio.preload = "auto";
  audioCache[sound] = audio;
  return audio;
}

function preloadAudio(sound: SoundKey): void {
  const audio = getAudio(sound);
  if (!audio) {
    return;
  }

  audio.load();
}

function playAudio(sound: SoundKey): void {
  const audio = getAudio(sound);
  if (!audio) {
    return;
  }

  audio.currentTime = 0;
  void audio.play().catch(() => {
    // Ignore autoplay interruptions; a later user gesture will allow playback.
  });
}

export function getDrawByFiftyMoveRuleAudio(): HTMLAudioElement | null {
  return getAudio("drawByFiftyMoveRule");
}

export function getDrawByThreefoldRepetitionAudio(): HTMLAudioElement | null {
  return getAudio("drawByThreefoldRepetition");
}

export function getDrawByInsufficientMaterialAudio(): HTMLAudioElement | null {
  return getAudio("drawByInsufficientMaterial");
}

export function getStalemateAudio(): HTMLAudioElement | null {
  return getAudio("stalemate");
}

export function isCastlingMove(board: ChessBoard, move: Move): boolean {
  const movingPiece = board.getSquare(move.fromRank, move.fromFile).piece;
  return movingPiece?.type === "king" && Math.abs(move.toFile - move.fromFile) === 2;
}

export function isPromotionMove(board: ChessBoard, move: Move): boolean {
  const movingPiece = board.getSquare(move.fromRank, move.fromFile).piece;
  if (movingPiece?.type !== "pawn") {
    return false;
  }

  const promotionRank = movingPiece.colour === "white" ? 7 : 0;
  return move.toRank === promotionRank;
}

export function isEnPassantMove(board: ChessBoard, move: Move): boolean {
  const movingPiece = board.getSquare(move.fromRank, move.fromFile).piece;
  if (movingPiece?.type !== "pawn") {
    return false;
  }

  if (move.fromFile === move.toFile) {
    return false;
  }

  return board.getSquare(move.toRank, move.toFile).piece === null;
}

export function isOrdinaryMoveCandidate(board: ChessBoard, move: Move): boolean {
  return !move.isCapture
    && !isCastlingMove(board, move)
    && !isEnPassantMove(board, move)
    && !isPromotionMove(board, move);
}

export function isCaptureMove(board: ChessBoard, move: Move): boolean {
  return move.isCapture === true
    && !isEnPassantMove(board, move)
    && !isPromotionMove(board, move);
}

export function isOrdinaryMoveSoundState(board: ChessBoard): boolean {
  return !board.isInCheck("white") && !board.isInCheck("black");
}

export function isQuitGameSoundState(board: ChessBoard): boolean {
  return !isTerminalGameResult(board.getGameStatus());
}

export function isCheckSoundState(board: ChessBoard): boolean {
  return board.isInCheck(board.getSideToMove());
}

export function isCheckmateSoundState(board: ChessBoard): boolean {
  return board.isCheckmate(board.getSideToMove());
}

export function isCastlingSoundState(board: ChessBoard, move: Move): boolean {
  return isCastlingMove(board, move);
}

export function isEnPassantSoundState(board: ChessBoard, move: Move): boolean {
  return isEnPassantMove(board, move);
}

export function isPromotionSoundState(board: ChessBoard, move: Move): boolean {
  return isPromotionMove(board, move);
}

export function isDrawByFiftyMoveRuleSoundState(board: ChessBoard, move: Move): boolean {
  void move;
  return board.getGameStatus().status === "drawByFiftyMoveRule";
}

export function isStalemateSoundState(board: ChessBoard): boolean {
  return board.isStalemate(board.getSideToMove());
}

export function isDrawByThreefoldRepetitionSoundState(board: ChessBoard): boolean {
  return board.getGameStatus().status === "drawByRepetition";
}

export function isDrawByInsufficientMaterialSoundState(board: ChessBoard): boolean {
  return board.getGameStatus().status === "drawByInsufficientMaterial";
}

export function preloadOrdinaryMoveSound(): void {
  preloadAudio("ordinaryMove");
}

export function preloadCaptureSound(): void {
  preloadAudio("capture");
}

export function preloadCastlingSound(): void {
  preloadAudio("castling");
}

export function preloadCheckSound(): void {
  preloadAudio("check");
}

export function preloadEnPassantSound(): void {
  preloadAudio("enPassant");
}

export function preloadPromotionSound(): void {
  preloadAudio("promotion");
}

export function preloadCheckmateSound(): void {
  preloadAudio("checkmate");
}

export function preloadDrawByFiftyMoveRuleSound(): void {
  preloadAudio("drawByFiftyMoveRule");
}

export function preloadDrawByThreefoldRepetitionSound(): void {
  preloadAudio("drawByThreefoldRepetition");
}

export function preloadDrawByInsufficientMaterialSound(): void {
  preloadAudio("drawByInsufficientMaterial");
}

export function preloadStalemateSound(): void {
  preloadAudio("stalemate");
}

export function preloadQuitGameSound(): void {
  preloadAudio("quitGame");
}

export function playOrdinaryMoveSound(): void {
  playAudio("ordinaryMove");
}

export function playCaptureSound(): void {
  playAudio("capture");
}

export function playQuitGameSound(): void {
  playAudio("quitGame");
}

export function playCheckSound(): void {
  playAudio("check");
}

export function playCheckmateSound(): void {
  playAudio("checkmate");
}

export function playCastlingSound(): void {
  playAudio("castling");
}

export function playEnPassantSound(): void {
  playAudio("enPassant");
}

export function playPromotionSound(): void {
  playAudio("promotion");
}

export function playDrawByFiftyMoveRuleSound(): void {
  playAudio("drawByFiftyMoveRule");
}

export function playDrawByThreefoldRepetitionSound(): void {
  playAudio("drawByThreefoldRepetition");
}

export function playDrawByInsufficientMaterialSound(): void {
  playAudio("drawByInsufficientMaterial");
}

export function playStalemateSound(): void {
  playAudio("stalemate");
}
