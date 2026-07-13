import { expect, test, type Page } from "@playwright/test";

declare global {
  interface Window {
    __asciiflow__: {
      getCommittedText(): string;
      getCommittedSize(): number;
    };
  }
}

async function openCleanEditor(page: Page): Promise<void> {
  await page.goto("/");
  await page.evaluate(() => localStorage.clear());
  await page.goto("/#/local/e2e");
  await expect(page.getByText("WASM OK", { exact: true })).toBeVisible();
}

async function committedText(page: Page): Promise<string> {
  return page.evaluate(() => window.__asciiflow__.getCommittedText());
}

async function canvasCenter(page: Page): Promise<{ x: number; y: number }> {
  const box = await page.locator("#ascii-canvas").boundingBox();
  if (!box) throw new Error("Canvas is not visible");
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
}

test("starts with an empty canvas and a ready WASM renderer", async ({ page }) => {
  await openCleanEditor(page);

  await expect(page).toHaveTitle("svgbob GUI");
  await expect(page.locator("#ascii-canvas")).toBeVisible();
  await expect(page.getByLabel("svgbob SVG preview")).toBeVisible();
  expect(await committedText(page)).toBe("");
});

test("persists editing across reload and supports undo and redo", async ({ page }) => {
  await openCleanEditor(page);
  await page.getByTestId("tool-boxes").click();
  const center = await canvasCenter(page);
  await page.mouse.move(center.x - 36, center.y - 32);
  await page.mouse.down();
  await page.mouse.move(center.x + 36, center.y + 32, { steps: 5 });
  await page.mouse.up();

  await expect.poll(() => committedText(page)).not.toBe("");
  const drawn = await committedText(page);
  await page.getByTitle("Undo").click();
  await expect.poll(() => committedText(page)).toBe("");
  await page.getByTitle("Redo").click();
  await expect.poll(() => committedText(page)).toBe(drawn);

  await page.reload();
  await expect(page.getByText("WASM OK", { exact: true })).toBeVisible();
  await expect.poll(() => committedText(page)).toBe(drawn);
});

test("edits raw ASCII in a real editor and commits one canvas undo step", async ({ page }) => {
  await openCleanEditor(page);
  await page.getByTestId("tool-raw").click();

  const editor = page.getByRole("textbox", { name: "Raw ASCII source" });
  await expect(editor).toBeVisible();
  await expect(page.locator("#ascii-canvas")).toHaveCount(0);

  await editor.fill("ABCD");
  await expect.poll(() => committedText(page)).toBe("ABCD");
  await expect(page.getByLabel("svgbob SVG preview").locator("svg")).toBeVisible();

  await editor.press("Home");
  await editor.press("ArrowRight");
  await editor.press("Shift+ArrowRight");
  await editor.press("Control+x");
  await expect.poll(() => committedText(page)).toBe("ACD");

  await editor.press("Control+z");
  await expect.poll(() => committedText(page)).toBe("ABCD");

  await page.getByTestId("tool-boxes").click();
  await expect(page.locator("#ascii-canvas")).toBeVisible();
  await page.getByTitle("Undo").click();
  await expect.poll(() => committedText(page)).toBe("");
  await page.getByTitle("Redo").click();
  await expect.poll(() => committedText(page)).toBe("ABCD");
});

test("places a 3x pipeline and downloads its SVG", async ({ page }) => {
  await openCleanEditor(page);
  await page.getByTestId("snippets-button").click();
  await page.getByRole("button", { name: "3x", exact: true }).click();
  await page.getByPlaceholder("Search blocks").fill("pipeline");
  await page.getByRole("button", { name: "Pipeline", exact: true }).click();
  const center = await canvasCenter(page);
  await page.mouse.click(center.x, center.y);

  await expect.poll(() => committedText(page)).toContain("STAGE 1");
  await expect(page.getByLabel("svgbob SVG preview").locator("svg")).toBeVisible();
  const downloadPromise = page.waitForEvent("download");
  await page.getByTitle("Download diagram.svg").click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe("diagram.svg");
});

test("restores a local drawing from a backup", async ({ page }) => {
  await openCleanEditor(page);
  await page.getByTestId("file-button").click();
  const backup = JSON.stringify({
    version: 1,
    exportedAt: new Date(0).toISOString(),
    drawings: [{ name: "e2e", ascii: '"A" ----> "B"' }],
  });
  await page.locator('input[type="file"]').setInputFiles({
    name: "backup.json",
    mimeType: "application/json",
    buffer: Buffer.from(backup),
  });

  await expect(page.getByText("1 drawings restored", { exact: true })).toBeVisible();
  await expect.poll(() => committedText(page)).toBe('"A" ----> "B"');
});

test("rejects malformed links and hides developer review routes", async ({ page }) => {
  await page.goto("/#/bob/not-valid-base64");
  await expect(page.getByRole("alert")).toContainText("invalid or too large");

  await page.goto("/#/share/not-a-drawing");
  await expect(page.getByRole("alert")).toContainText("invalid or too large");

  await page.goto("/#/review/blocks/2/inspect");
  await expect(page.locator("#ascii-canvas")).toHaveCount(0);
  await expect(page.getByText("Export CSV", { exact: true })).toHaveCount(0);
});
