import { expect, test, type Locator, type Page } from "@playwright/test";

async function startGame(page: Page, playerColour: "white" | "black" = "white"): Promise<void> {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Start a new game" })).toBeVisible();
  await page.locator(`input[name="player-colour"][value="${playerColour}"]`).check();
  await page.locator('select[name="computer-difficulty"]').selectOption("easy");
  await page.locator("dialog.setup-dialog .setup-dialog__form").evaluate((formElement) => {
    (formElement as HTMLFormElement).requestSubmit();
  });
  await expect(page.locator("#chessboard")).toBeVisible();
}

function getTop(locator: Locator): Promise<number> {
  return locator.evaluate((element) => {
    const { top } = element.getBoundingClientRect();
    return top;
  });
}

function getLeft(locator: Locator): Promise<number> {
  return locator.evaluate((element) => {
    const { left } = element.getBoundingClientRect();
    return left;
  });
}

test.describe("responsive layout", () => {
  test("keeps the setup dialog scrollable on very small mobile viewports", async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 568 });
    await page.goto("/");

    const setupForm = page.locator("dialog.setup-dialog .setup-dialog__form").first();
    const startGameButton = page.getByRole("button", { name: "Start game" });

    await expect(page.getByRole("heading", { name: "Start a new game" })).toBeVisible();

    const scrollMetricsBefore = await setupForm.evaluate((element) => ({
      clientHeight: element.clientHeight,
      scrollHeight: element.scrollHeight,
      scrollTop: element.scrollTop,
    }));

    expect(scrollMetricsBefore.scrollHeight).toBeGreaterThan(scrollMetricsBefore.clientHeight);

    await setupForm.hover();
    await page.mouse.wheel(0, 480);

    await expect
      .poll(async () => setupForm.evaluate(element => element.scrollTop), { timeout: 3000 })
      .toBeGreaterThan(scrollMetricsBefore.scrollTop);

    await expect(startGameButton).toBeInViewport();
  });

  test("keeps the full board visible on very small mobile viewports", async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 568 });
    await startGame(page);

    const geometry = await page.evaluate(() => {
      const boardScreen = document.querySelector(".board-screen");
      const edgeSelectors = ["a1", "h1", "h8", "h2", "h7"];

      if (!(boardScreen instanceof HTMLElement)) {
        return null;
      }

      const screenRect = boardScreen.getBoundingClientRect();
      const squares = edgeSelectors.map((coord) => {
        const square = document.querySelector(`.square[data-coord="${coord}"]`);

        if (!(square instanceof HTMLElement)) {
          return null;
        }

        const rect = square.getBoundingClientRect();
        return {
          coord,
          left: rect.left,
          right: rect.right,
        };
      });

      return {
        screenLeft: screenRect.left,
        screenRight: screenRect.right,
        squares,
      };
    });

    if (!geometry) {
      throw new Error("Expected the board screen to exist.");
    }

    for (const square of geometry.squares) {
      if (!square) {
        throw new Error("Expected each edge square to exist.");
      }

      expect(square.left).toBeGreaterThanOrEqual(geometry.screenLeft - 1);
      expect(square.right).toBeLessThanOrEqual(geometry.screenRight + 1);
    }
  });

  test("stacks the sidebar and captured pieces beneath the board on narrow screens", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 640 });
    await startGame(page);

    const boardColumn = page.locator(".board-column");
    const panelSidebar = page.locator(".panel-sidebar");
    const capturedPiecesPanel = page.locator("#captured-pieces");

    const boardTop = await getTop(boardColumn);
    const sidebarTop = await getTop(panelSidebar);
    const capturedTop = await getTop(capturedPiecesPanel);

    expect(sidebarTop).toBeGreaterThan(boardTop + 20);
    expect(capturedTop).toBeGreaterThan(sidebarTop + 20);

    const boardLeft = await getLeft(boardColumn);
    const sidebarLeft = await getLeft(panelSidebar);
    const capturedLeft = await getLeft(capturedPiecesPanel);

    expect(Math.abs(sidebarLeft - boardLeft)).toBeLessThanOrEqual(2);
    expect(Math.abs(capturedLeft - boardLeft)).toBeLessThanOrEqual(2);
  });

  test("shows the mobile scroll cue on small viewports and advances the page when pressed", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 640 });
    await startGame(page);

    const scrollCue = page.locator("#mobile-scroll-cue");

    await expect(scrollCue).toBeVisible();
    await expect(page.locator("body")).toHaveClass(/has-scroll-cue/);

    const initialScrollY = await page.evaluate(() => window.scrollY);
    await scrollCue.click({ force: true });

    await expect
      .poll(async () => page.evaluate(() => window.scrollY), { timeout: 3000 })
      .toBeGreaterThan(initialScrollY);
  });

  test("keeps the mobile scroll cue hidden on desktop widths", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await startGame(page);

    await expect(page.locator("body")).not.toHaveClass(/has-scroll-cue/);

    const scrollCue = page.locator("#mobile-scroll-cue");
    await expect(scrollCue).toBeHidden();
  });
});
