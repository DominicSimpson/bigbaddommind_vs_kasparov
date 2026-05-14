import { expect, test, type Page } from "@playwright/test";

const COMPUTER_TURN_TIMEOUT_MS = 10000;
const ALLOWED_LATENCY_DIFFERENCE_MS = 250;

async function startGame(page: Page, playerColour: "white" | "black"): Promise<void> {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Start a new game" })).toBeVisible();
  await page.locator(`input[name="player-colour"][value="${playerColour}"]`).check();
  await page.locator('select[name="computer-difficulty"]').selectOption("easy");
  await page.getByRole("button", { name: "Start game" }).click();
}

async function clickSquare(page: Page, coord: string): Promise<void> {
  await page.locator(`.square[data-coord="${coord}"]`).click();
}

async function waitForPlayerControlsEnabled(page: Page): Promise<void> {
  await expect(page.locator("#move-entry-submit-button")).toBeEnabled({
    timeout: COMPUTER_TURN_TIMEOUT_MS,
  });
}

async function measureComputerReplyMs(
  page: Page,
  originCoord: string,
  destinationCoord: string,
): Promise<number> {
  const submitButton = page.locator("#move-entry-submit-button");

  const startedAt = Date.now();
  await clickSquare(page, originCoord);
  await clickSquare(page, destinationCoord);

  await expect(submitButton).toBeDisabled({
    timeout: 1000,
  });
  await expect(submitButton).toBeEnabled({
    timeout: COMPUTER_TURN_TIMEOUT_MS,
  });

  return Date.now() - startedAt;
}

test("computer reply latency stays close for white-side and black-side play", async ({ page }) => {
  test.setTimeout(60000);

  await startGame(page, "white");
  const blackComputerReplyMs = await measureComputerReplyMs(page, "e2", "e4");

  await startGame(page, "black");
  await waitForPlayerControlsEnabled(page);
  const whiteComputerReplyMs = await measureComputerReplyMs(page, "e7", "e5");

  const latencyDifferenceMs = Math.abs(blackComputerReplyMs - whiteComputerReplyMs);

  test.info().annotations.push(
    { type: "black-computer-reply-ms", description: String(blackComputerReplyMs) },
    { type: "white-computer-reply-ms", description: String(whiteComputerReplyMs) },
    { type: "latency-difference-ms", description: String(latencyDifferenceMs) },
  );

  expect(latencyDifferenceMs).toBeLessThanOrEqual(ALLOWED_LATENCY_DIFFERENCE_MS);
});
