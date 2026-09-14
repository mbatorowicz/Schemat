import { expect, test } from "@playwright/test";

test.describe("Pomocnik AI", () => {
  test("otwiera panel i pokazuje mockowaną odpowiedź ze strumienia", async ({ page }) => {
    await page.route("**/api/assistant", async (route) => {
      await route.fulfill({
        status: 200,
        headers: { "content-type": "text/event-stream; charset=utf-8" },
        body:
          'data: {"type":"text","delta":"Norma EN 60204-1."}\n\n' +
          'data: {"type":"proposals","items":[{"type":"highlight","refs":["WD1"],"summary":"Pokaż WD1"}]}\n\n' +
          'data: {"type":"done"}\n\n',
      });
    });

    await page.goto("/");
    await expect(page.locator("body")).not.toHaveClass(/is-booting/, { timeout: 15_000 });
    await page.locator("#btnAssistant").click();
    await expect(page.locator("#app")).toHaveClass(/assistant-open/);
    await expect(page.locator("#assistantPanel")).toBeVisible();
    await page.locator("#assistantInput").fill("Jaki symbol dla stycznika?");
    await page.locator("#btnAssistantSend").click();
    await expect(page.locator(".assistant-msg--assistant")).toContainText("Norma EN 60204-1", { timeout: 10_000 });
    await expect(page.locator(".assistant-proposal")).toContainText("Pokaż WD1");
    await expect(page.locator(".assistant-proposal button.primary")).toHaveText("Zastosuj");
  });
});
