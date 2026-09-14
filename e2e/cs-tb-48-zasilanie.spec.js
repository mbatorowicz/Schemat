import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { expect, test } from "@playwright/test";

const fixtures = join(dirname(fileURLToPath(import.meta.url)), "..", "tests", "fixtures");

function fixture(name) {
  return readFileSync(join(fixtures, name), "utf8");
}

test.describe("CS-TB-48 Zasilanie", () => {
  test("symbole G1 i F1 są widoczne po otwarciu projektu", async ({ page }) => {
    const files = {
      "Zasilanie.svg": fixture("Zasilanie.svg"),
      "E-00_symbole.svg": fixture("E-00_symbole.svg"),
      "projekt.json": JSON.stringify({ library: "E-00_symbole.svg", sheetConnections: {} }),
    };

    await page.addInitScript(
      ({ files: payload, dirName }) => {
        function fileHandle(name, text) {
          return {
            kind: "file",
            name,
            async getFile() {
              return new File([text], name, { type: "text/plain" });
            },
            async queryPermission() {
              return "granted";
            },
            async requestPermission() {
              return "granted";
            },
            async createWritable() {
              return {
                async write() {},
                async close() {},
              };
            },
          };
        }
        function dirHandle(name, children) {
          return {
            kind: "directory",
            name,
            async queryPermission() {
              return "granted";
            },
            async requestPermission() {
              return "granted";
            },
            async getFileHandle(fileName) {
              const h = children[fileName];
              if (!h || h.kind !== "file") throw new DOMException("Not found", "NotFoundError");
              return h;
            },
            async getDirectoryHandle(innerName) {
              const h = children[innerName];
              if (!h || h.kind !== "directory") throw new DOMException("Not found", "NotFoundError");
              return h;
            },
            async *entries() {
              for (const [key, value] of Object.entries(children)) yield [key, value];
            },
          };
        }
        const children = Object.fromEntries(
          Object.entries(payload).map(([name, text]) => [name, fileHandle(name, text)])
        );
        const root = dirHandle(dirName, children);
        window.showDirectoryPicker = async () => root;
      },
      { files, dirName: "CS-TB-48" }
    );

    await page.goto("/");
    await expect(page.locator("body")).not.toHaveClass(/is-booting/, { timeout: 15_000 });
    await page.locator("#btnOpen").click();
    await expect(page.locator("#schlist .sch-title")).toHaveText("Zasilanie", { timeout: 15_000 });

    await expect(page.locator("#stage use[data-ref='G1']")).toHaveCount(1);
    await expect(page.locator("#stage use[data-ref='F1']")).toHaveCount(1);
    await expect(page.locator("#stage text[data-owner-ref='G1']")).toHaveText("G1");
    await expect(page.locator("#stage text[data-owner-ref='F1']")).toHaveText("F1");
    await expect(page.locator("#stage defs #G")).toHaveCount(1);
    await expect(page.locator("#stage defs #F")).toHaveCount(1);

    const boxes = await page.evaluate(() => {
      const bb = (sel) => {
        const el = document.querySelector(sel);
        if (!el?.getBBox) return null;
        const b = el.getBBox();
        return { w: b.width, h: b.height };
      };
      return { g1: bb("#stage use[data-ref='G1']"), f1: bb("#stage use[data-ref='F1']") };
    });
    expect(boxes.g1?.w).toBeGreaterThan(0);
    expect(boxes.g1?.h).toBeGreaterThan(0);
    expect(boxes.f1?.w).toBeGreaterThan(0);
    expect(boxes.f1?.h).toBeGreaterThan(0);
  });
});
