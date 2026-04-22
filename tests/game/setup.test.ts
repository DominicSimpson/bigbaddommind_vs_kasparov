import { describe, expect, it } from "vitest";
import { createGameSetup, getOpponentColour } from "../../src/game/setup.js";

describe("game setup", () => {
  it("assigns black to the computer when the player chooses white", () => {
    expect(createGameSetup("white", "medium", "Alice")).toEqual({
      playerColour: "white",
      computerColour: "black",
      computerDifficulty: "medium",
      playerName: "Alice",
      sideLabels: {
        white: "Alice",
        black: "Computer",
      },
    });
  });

  it("assigns white to the computer when the player chooses black", () => {
    expect(createGameSetup("black", "hard")).toEqual({
      playerColour: "black",
      computerColour: "white",
      computerDifficulty: "hard",
      playerName: null,
      sideLabels: {
        white: "Computer",
        black: "Black",
      },
    });
  });

  it("trims the optional player name before tying it to the selected colour", () => {
    expect(createGameSetup("black", "easy", "  Beth  ").sideLabels.black).toBe("Beth");
    expect(createGameSetup("black", "easy", "   ").playerName).toBeNull();
  });

  it("returns the opposite colour for either side", () => {
    expect(getOpponentColour("white")).toBe("black");
    expect(getOpponentColour("black")).toBe("white");
  });
});
