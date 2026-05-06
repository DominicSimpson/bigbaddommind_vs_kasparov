// This file is essentially the bridge between the TS UI code and
// the actual HTML page, looking up the DOM of that page:
export type AppElements = {
  boardRoot: HTMLDivElement; // board container
  status: HTMLParagraphElement; // a paragraph for status text
  turnBadge: HTMLDivElement; // a div showing whose turn it is
  capturedPieces: HTMLElement; // captured pieces panel
  newGameButton: HTMLButtonElement; // starts a brand-new game flow
};

// generic helper that returns element from document.querySelector:
function requireElement<T extends Element>(selector: string): T {
  const element = document.querySelector<T>(selector);

  if (!element) {
    throw new Error(`Expected element "${selector}" to exist.`);
  }

  return element;
}

// Gathers required elements by ID and returns them as 
// one typed object - otherwise the app fails:
export function getAppElements(): AppElements {
  return {
    boardRoot: requireElement<HTMLDivElement>("#chessboard"),
    status: requireElement<HTMLParagraphElement>("#status"),
    turnBadge: requireElement<HTMLDivElement>("#turn-badge"),
    capturedPieces: requireElement<HTMLElement>("#captured-pieces"),
    newGameButton: requireElement<HTMLButtonElement>('button[aria-label="New Game"]'),
  };
}
