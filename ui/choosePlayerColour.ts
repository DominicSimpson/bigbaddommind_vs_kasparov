import type { Colour } from "../src/types/colour.js";

const PLAYER_COLOUR_PROMPT =
  'Please choose a player colour: "white" or "black".';

export function choosePlayerColour(): Colour {
  while (true) {
    const response = window.prompt(PLAYER_COLOUR_PROMPT, "white");

    if (response === null) {
      throw new Error("Player colour selection was cancelled.");
    }

    const normalizedResponse = response.trim().toLowerCase();

    if (normalizedResponse === "white" || normalizedResponse === "black") {
      return normalizedResponse;
    }

    window.alert('Player colour must be "white" or "black".');
  }
}
