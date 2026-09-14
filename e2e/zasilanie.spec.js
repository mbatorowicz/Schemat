import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { expect, test } from "@playwright/test";

const fixtures = join(dirname(fileURLToPath(import.meta.url)), "..", "tests", "fixtures");

function fixture(name) {
  return readFileSync(join(fixtures, name), "utf8");
}

function emptySheetSvg() {
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 1485 1050" width="1485" height="1050">
  <defs><style>.fr{fill:none;stroke:#0f172a;stroke-width:2;} .ttl{font:700 22px Arial,sans-serif;fill:#0f172a;}</style></defs>
  <g id="sch-1" data-sheet-title="Zasilanie">
    <rect class="fr" x="12" y="12" width="1461" height="1026"/>
    <text class="ttl" x="34" y="52">Zasilanie</text>
  </g>
</svg>`;
}

function sheetWithPointConnectors() {
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 1485 1050" width="1485" height="1050">
  <defs><style>.fr{fill:none;stroke:#0f172a;stroke-width:2;} .ttl{font:700 22px Arial,sans-serif;fill:#0f172a;}</style></defs>
  <g id="sch-1" data-sheet-title="Zasilanie">
    <rect class="fr" x="12" y="12" width="1461" height="1026"/>
    <text class="ttl" x="34" y="52">Zasilanie</text>
    <g data-role="conn" data-kind="point" data-ref="A1" data-pin="1" data-dir="E" data-joint-r="4">
      <line data-part="stub" class="conn-stub" x1="200" y1="200" x2="200" y2="200"/>
      <circle data-part="joint" class="conn-joint" cx="200" cy="200" r="4"/>
      <circle data-part="contact" data-contact="E" class="conn-contact" cx="204" cy="200" r="1.5"/>
      <circle data-part="contact" data-contact="W" class="conn-contact" cx="196" cy="200" r="1.5"/>
      <text data-part="label" class="pin" x="200" y="190">1</text>
    </g>
    <g data-role="conn" data-kind="point" data-ref="B1" data-pin="1" data-dir="W" data-joint-r="4">
      <line data-part="stub" class="conn-stub" x1="420" y1="280" x2="420" y2="280"/>
      <circle data-part="joint" class="conn-joint" cx="420" cy="280" r="4"/>
      <circle data-part="contact" data-contact="W" class="conn-contact" cx="416" cy="280" r="1.5"/>
      <circle data-part="contact" data-contact="E" class="conn-contact" cx="424" cy="280" r="1.5"/>
      <text data-part="label" class="pin" x="420" y="270">1</text>
    </g>
  </g>
</svg>`;
}

async function openMockProject(page, files) {
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
    { files, dirName: "projekt" }
  );

  await page.goto("/");
  await expect(page.locator("body")).not.toHaveClass(/is-booting/, { timeout: 15_000 });
  await page.locator("#btnOpen").click();
  await expect(page.locator("#schlist .sch-title")).toHaveText("Zasilanie", { timeout: 15_000 });
}

test.describe("Arkusz zasilania", () => {
  test("symbole G1 i F1 są widoczne po otwarciu projektu", async ({ page }) => {
    await openMockProject(page, {
      "Zasilanie.svg": fixture("Zasilanie.svg"),
      "symbole.svg": fixture("E-00_symbole.svg"),
      "projekt.json": JSON.stringify({ library: "symbole.svg", sheetConnections: {} }),
    });

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

  test("Szkic ze spisu rozstawia brakujące G1 i F1", async ({ page }) => {
    await openMockProject(page, {
      "Zasilanie.svg": emptySheetSvg(),
      "symbole.svg": fixture("E-00_symbole.svg"),
      "projekt.json": JSON.stringify({
        library: "symbole.svg",
        sheetConnections: {
          "Zasilanie.svg": [{ id: "1", from: "G1:L", to: "F1:1", net: "L", wire: "", length: "", notes: "" }],
        },
      }),
    });

    await expect(page.locator("#btnGenerateFromNetlist")).toBeEnabled({ timeout: 10_000 });
    await page.locator("#btnRouteMenu").click();
    await page.locator("#btnGenerateFromNetlist").click();

    await expect(page.locator("#stage use[data-ref='G1']")).toHaveCount(1, { timeout: 10_000 });
    await expect(page.locator("#stage use[data-ref='F1']")).toHaveCount(1);
    const pos = await page.evaluate(() => {
      const g = document.querySelector("#stage use[data-ref='G1']");
      const f = document.querySelector("#stage use[data-ref='F1']");
      return {
        gx: Number(g?.getAttribute("x")),
        gy: Number(g?.getAttribute("y")),
        fx: Number(f?.getAttribute("x")),
        fy: Number(f?.getAttribute("y")),
      };
    });
    expect(pos.gx % 5).toBe(0);
    expect(pos.gy % 5).toBe(0);
    expect(pos.fx % 5).toBe(0);
    expect(pos.gy).not.toBe(pos.fy);
  });

  test("Połącz rysuje trasę ortogonalną między pinami", async ({ page }) => {
    await openMockProject(page, {
      "Zasilanie.svg": sheetWithPointConnectors(),
      "symbole.svg": fixture("E-00_symbole.svg"),
      "projekt.json": JSON.stringify({
        library: "symbole.svg",
        sheetConnections: {
          "Zasilanie.svg": [{ id: "1", from: "A1:1", to: "B1:1", net: "L", wire: "", length: "", notes: "" }],
        },
      }),
    });

    await expect(page.locator("#netlistConn option[value='1']")).toHaveCount(1, { timeout: 10_000 });
    await page.locator("#netlistConn").selectOption("1");
    await expect(page.locator("#btnRouteConn")).toBeEnabled();
    await page.locator("#btnRouteConn").click();
    const wire = page.locator("#stage polyline[data-conn-id='1']").first();
    await expect(wire).toBeVisible({ timeout: 10_000 });
    const pts = await wire.evaluate((el) =>
      (el.getAttribute("points") || "")
        .trim()
        .split(/\s+/)
        .map((p) => p.split(",").map(Number))
    );
    expect(pts.length).toBeGreaterThanOrEqual(2);
    for (let i = 1; i < pts.length; i++) {
      expect(pts[i][0] === pts[i - 1][0] || pts[i][1] === pts[i - 1][1]).toBeTruthy();
    }
  });
});
