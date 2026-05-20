import { expect, test, type Page } from "@playwright/test";

const COMPUTER_TURN_TIMEOUT_MS = 10000;
const ALLOWED_LATENCY_DIFFERENCE_MS = 250;
const MAX_THINKING_STATE_ENTRY_MS = 350;
const CPU_THROTTLE_RATE = 6;

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

function getInfoIndicator(page: Page) {
  return page.locator(".team-mate-panel__row", { hasText: "Info" }).locator(".team-mate-panel__led");
}

// // This test suite focuses on measuring the latency of the computer player's 
// turn in a chess game. It includes tests to ensure that the latency is 
// consistent regardless of whether the computer is playing as white or black, 
// and that the computer enters the thinking state promptly even under CPU 
// throttling conditions. By annotating the test results with relevant metrics, 
// we can analyze the performance characteristics of the computer player's move 
// calculation and identify any potential issues with visual latency:
async function enableCpuThrottle(page: Page, rate: number): Promise<void> {
  const session = await page.context().newCDPSession(page);
  await session.send("Emulation.setCPUThrottlingRate", { rate });
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

test("computer turn enters the thinking state promptly under throttled CPU", async ({ page, browserName }) => {
  test.setTimeout(60000);

  test.skip(browserName !== "chromium", "CPU throttling via CDP is only supported in Chromium.");

  await enableCpuThrottle(page, CPU_THROTTLE_RATE);
  await startGame(page, "white");

  const teamMatePanel = page.locator(".team-mate-panel");

  await clickSquare(page, "e2");
  await clickSquare(page, "e4");

  const startedAt = Date.now();
  await expect(teamMatePanel).toHaveAttribute("data-state", "thinking", {
    timeout: MAX_THINKING_STATE_ENTRY_MS,
  });

  const thinkingStateEntryMs = Date.now() - startedAt;

  test.info().annotations.push(
    { type: "cpu-throttle-rate", description: String(CPU_THROTTLE_RATE) },
    { type: "thinking-state-entry-ms", description: String(thinkingStateEntryMs) },
  );

  expect(thinkingStateEntryMs).toBeLessThanOrEqual(MAX_THINKING_STATE_ENTRY_MS);
  await waitForPlayerControlsEnabled(page);
});

test("game info light toggles only while the Game Info modal is open", async ({ page }) => {
  await startGame(page, "white");

  const infoIndicator = getInfoIndicator(page);

  await expect(infoIndicator).not.toHaveClass(/is-active/);

  await page.getByRole("button", { name: "View game information" }).click();

  const gameInfoDialog = page.locator("dialog.setup-dialog--game-info[open]");
  await expect(gameInfoDialog).toBeVisible();
  await expect(infoIndicator).toHaveClass(/is-active/);

  await gameInfoDialog.getByRole("button", { name: "OK" }).click();

  await expect(gameInfoDialog).toHaveCount(0);
  await expect(infoIndicator).not.toHaveClass(/is-active/);
});
