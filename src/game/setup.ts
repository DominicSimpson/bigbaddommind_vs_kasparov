import type { ComputerDifficulty } from "../player/ComputerPlayer.js";
import type { Colour } from "../types/colour.js";

export type SideLabels = Record<Colour, string>;
const COMPUTER_NAME = "DomDeepBlue";

export type GameSetup = {
  playerColour: Colour;
  computerColour: Colour;
  computerDifficulty: ComputerDifficulty;
  playerName: string | null;
  sideLabels: SideLabels;
};

export function getOpponentColour(colour: Colour): Colour {
  return colour === "white" ? "black" : "white";
}

export function createGameSetup(
  playerColour: Colour,
  computerDifficulty: ComputerDifficulty,
  playerName: string | null = null,
): GameSetup {
  const computerColour = getOpponentColour(playerColour);
  const normalizedPlayerName = playerName?.trim() || null;

  const sideLabels: SideLabels = {
    white: playerColour === "white"
      ? normalizedPlayerName ?? "White"
      : COMPUTER_NAME,
    black: playerColour === "black"
      ? normalizedPlayerName ?? "Black"
      : COMPUTER_NAME,
  };

  return {
    playerColour,
    computerColour,
    computerDifficulty,
    playerName: normalizedPlayerName,
    sideLabels,
  };
}
