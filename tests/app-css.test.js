import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

describe("app.css (L3)", () => {
  it("index.html ładuje src/app.css zamiast inline <style>", () => {
    const html = readFileSync(join(root, "index.html"), "utf8");
    const css = readFileSync(join(root, "src/app.css"), "utf8");
    expect(html).not.toMatch(/<style>/);
    expect(html).toContain('href="/src/app.css"');
    expect(css).toContain("body.is-booting #toolbar");
    expect(css).toContain("#toolbar .toolbar-line");
    expect(css).toContain("#saveBadge");
    expect(css).toContain(".modal-bg");
    expect(css).toContain(".split-btn");
    expect(css).toContain(".tbtn.view-toggle");
    expect(css).toContain(".toolbar-menu");
    expect(css).toContain(".side-sec");
    expect(css).toContain("grid-template-columns: 204px 1fr");
    expect(css).toContain("#assistantPanel");
    expect(html).toContain('class="side-sec side-sec--grow"');
    expect(html).toContain('id="schCount"');
    expect(html).toContain('id="assistantPanel"');
    expect(html).toContain('id="btnAssistant"');
  });
});
