import type { ComputerDifficulty } from "../src/player/ComputerPlayer.js";
import type { Colour } from "../src/types/colour.js";
import type { PromotionPiece } from "../src/types/Move.js";

export type SelectedGameOptions = {
  playerColour: Colour;
  computerDifficulty: ComputerDifficulty;
  playerName: string | null;
};

// Promotion options for when a pawn reaches the final rank:
const PROMOTION_OPTIONS: ReadonlyArray<{
  value: PromotionPiece;
  label: string;
  description: string;
}> = [
  { value: "queen", label: "Queen", description: "Strongest all-round option." },
  { value: "rook", label: "Rook", description: "Straight-line power and pressure." },
  { value: "bishop", label: "Bishop", description: "Diagonal control across the board." },
  { value: "knight", label: "Knight", description: "L-shaped moves for tricky forks." },
];


// checkboxes
function createRadioOption(
  name: string,
  value: string,
  label: string,
  checked = false,
): HTMLLabelElement {
  const option = document.createElement("label");
  option.className = "setup-dialog__choice";

  const input = document.createElement("input");
  input.type = "radio";
  input.name = name;
  input.value = value;
  input.checked = checked;

  const text = document.createElement("span");
  text.textContent = label;

  option.append(input, text);

  return option;
}

// Options in pop-up modal window before game starts
export function chooseGameOptions(): Promise<SelectedGameOptions> {
  return new Promise<SelectedGameOptions>((resolve, reject) => {
    const dialog = document.createElement("dialog");
    dialog.className = "setup-dialog";

    const form = document.createElement("form");
    form.className = "setup-dialog__form";
    form.method = "dialog";

    const title = document.createElement("h2");
    title.className = "setup-dialog__title";
    title.textContent = "Start a new game";

    const description = document.createElement("p");
    description.className = "setup-dialog__description";
    description.textContent =
      "Choose your side and the engine strength before the first move.";

    const colourSection = document.createElement("fieldset");
    colourSection.className = "setup-dialog__section";
    // player chooses their pawn colour
    const colourLegend = document.createElement("legend");
    colourLegend.textContent = "Which colour would you like to play?";

    const colourChoices = document.createElement("div");
    colourChoices.className = "setup-dialog__choices";
    colourChoices.append(
      createRadioOption("player-colour", "white", "White", true),
      createRadioOption("player-colour", "black", "Black"),
    );

    colourSection.append(colourLegend, colourChoices);

    const difficultySection = document.createElement("label");
    difficultySection.className = "setup-dialog__section";
    // Game difficulty level
    const difficultyLabel = document.createElement("span");
    difficultyLabel.className = "setup-dialog__label";
    difficultyLabel.textContent = "Computer difficulty";

    const difficultySelect = document.createElement("select");
    difficultySelect.className = "setup-dialog__select";
    difficultySelect.name = "computer-difficulty";

    const difficultyOptions: Array<{
      value: ComputerDifficulty;
      label: string;
    }> = [
      { value: "easy", label: "Easy" },
      { value: "medium", label: "Medium" },
      { value: "hard", label: "Hard" },
    ];

    for (const optionData of difficultyOptions) {
      const option = document.createElement("option");
      option.value = optionData.value;
      option.textContent = optionData.label;
      difficultySelect.append(option);
    }

    difficultySelect.value = "medium";
    difficultySection.append(difficultyLabel, difficultySelect);

    const playerNameSection = document.createElement("label");
    playerNameSection.className = "setup-dialog__section";
    // Player's name (not mandatory to fill in):
    const playerNameLabel = document.createElement("span");
    playerNameLabel.className = "setup-dialog__label";
    playerNameLabel.textContent = "Your name (optional)";

    const playerNameInput = document.createElement("input");
    playerNameInput.className = "setup-dialog__input";
    playerNameInput.name = "player-name";
    playerNameInput.type = "text";
    playerNameInput.maxLength = 40;
    playerNameInput.placeholder = "Enter your name";
    playerNameInput.setAttribute("autocomplete", "nickname");

    playerNameSection.append(playerNameLabel, playerNameInput);

    const actions = document.createElement("div");
    actions.className = "setup-dialog__actions";
    // if player wants to cancel game:
    const cancelButton = document.createElement("button");
    cancelButton.className = "setup-dialog__button setup-dialog__button--secondary";
    cancelButton.type = "button";
    cancelButton.textContent = "Cancel";
    cancelButton.addEventListener("click", () => {
      dialog.close("cancel");
    });
    // start game:
    const submitButton = document.createElement("button");
    submitButton.className = "setup-dialog__button setup-dialog__button--primary";
    submitButton.type = "submit";
    submitButton.textContent = "Start game";

    actions.append(cancelButton, submitButton);
    form.append(
      title,
      description,
      colourSection,
      difficultySection,
      playerNameSection,
      actions,
    );
    dialog.append(form);
    document.body.append(dialog);

    const cleanup = (): void => {
      dialog.remove();
    };

    dialog.addEventListener("cancel", (event) => {
      event.preventDefault();
      dialog.close("cancel");
    });

    dialog.addEventListener("close", () => {
      if (dialog.returnValue === "cancel") {
        cleanup();
        reject(new Error("Player colour selection was cancelled."));
        return;
      }

      const selectedColour = form.querySelector<HTMLInputElement>(
        'input[name="player-colour"]:checked',
      )?.value;
      const selectedDifficulty = difficultySelect.value;
      const trimmedPlayerName = playerNameInput.value.trim();

      if (
        (selectedColour !== "white" && selectedColour !== "black")
        || (
          selectedDifficulty !== "easy"
          && selectedDifficulty !== "medium"
          && selectedDifficulty !== "hard"
        )
      ) {
        cleanup();
        reject(new Error("Game setup could not be completed."));
        return;
      }

      cleanup();
      resolve({
        playerColour: selectedColour,
        computerDifficulty: selectedDifficulty,
        playerName: trimmedPlayerName.length > 0 ? trimmedPlayerName : null,
      });
    }, { once: true });

    dialog.showModal();
  });
}

// // When a pawn reaches the final rank, this pop-up modal prompts the player 
// to choose which piece they want to promote to. The function returns a 
// Promise that resolves to the chosen promotion piece, or rejects if the 
// selection is cancelled. The UI is built using a <dialog> element, 
// with buttons for each promotion option, and appropriate event listeners 
// for handling user interactions:
export function choosePromotionPiece(colour: Colour): Promise<PromotionPiece> {
  return new Promise<PromotionPiece>((resolve, reject) => {
    const dialog = document.createElement("dialog");
    dialog.className = "setup-dialog";

    const form = document.createElement("form");
    form.className = "setup-dialog__form";
    form.method = "dialog";

    const title = document.createElement("h2");
    title.className = "setup-dialog__title";
    title.textContent = "Choose a promotion";

    const description = document.createElement("p");
    description.className = "setup-dialog__description";
    description.textContent = `${colour === "white" ? "White" : "Black"} pawn reached the final rank. Pick the piece to promote to.`;

    const section = document.createElement("fieldset");
    section.className = "setup-dialog__section";

    const legend = document.createElement("legend");
    legend.textContent = "Promotion piece";

    const choices = document.createElement("div");
    choices.className = "setup-dialog__promotion-grid";

    for (const optionData of PROMOTION_OPTIONS) {
      const button = document.createElement("button");
      button.className = "setup-dialog__promotion-option";
      button.type = "button";
      button.value = optionData.value;

      const label = document.createElement("span");
      label.className = "setup-dialog__promotion-name";
      label.textContent = optionData.label;

      const detail = document.createElement("span");
      detail.className = "setup-dialog__promotion-detail";
      detail.textContent = optionData.description;

      button.append(label, detail);
      button.addEventListener("click", () => {
        cleanup();
        resolve(optionData.value);
      });
      choices.append(button);
    }

    section.append(legend, choices);
    form.append(title, description, section);
    dialog.append(form);
    document.body.append(dialog);

    const cleanup = (): void => {
      dialog.remove();
    };

    dialog.addEventListener("cancel", (event) => {
      event.preventDefault();
      cleanup();
      reject(new Error("Promotion selection was cancelled."));
    }, { once: true });

    dialog.showModal();
  });
}
