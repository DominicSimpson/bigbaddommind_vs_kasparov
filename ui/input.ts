export type AppElements = {
  boardRoot: HTMLDivElement;
  status: HTMLParagraphElement;
  turnBadge: HTMLDivElement;
};

function requireElement<T extends Element>(selector: string): T {
  const element = document.querySelector<T>(selector);

  if (!element) {
    throw new Error(`Expected element "${selector}" to exist.`);
  }

  return element;
}

export function getAppElements(): AppElements {
  return {
    boardRoot: requireElement<HTMLDivElement>("#chessboard"),
    status: requireElement<HTMLParagraphElement>("#status"),
    turnBadge: requireElement<HTMLDivElement>("#turn-badge"),
  };
}
