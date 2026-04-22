import type { ComputerDifficulty } from "../src/player/ComputerPlayer.js";
import type { Colour } from "../src/types/colour.js";

export type SelectedGameOptions = {
  playerColour: Colour;
  computerDifficulty: ComputerDifficulty;
  playerName: string | null;
};

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

    const cancelButton = document.createElement("button");
    cancelButton.className = "setup-dialog__button setup-dialog__button--secondary";
    cancelButton.type = "button";
    cancelButton.textContent = "Cancel";
    cancelButton.addEventListener("click", () => {
      dialog.close("cancel");
    });

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
