import type { ComputerDifficulty } from "../player/ComputerPlayer.js";
import type { Colour } from "../types/colour.js";

// Computer player's name:
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

  // If human player doesn't input a name (optional), default their name
  // to whatever the colour is that they have chosen:
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
