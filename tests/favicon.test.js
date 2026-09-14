import { describe, it, expect } from "vitest";
import { existsSync, readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

describe("favicon", () => {
  it("linkuje ikony w index.html i trzyma pliki w public/", () => {
    const html = readFileSync(join(root, "index.html"), "utf8");
    expect(html).toContain('href="/favicon.svg"');
    expect(html).toContain('href="/favicon-32.png"');
    expect(html).toContain('href="/favicon.ico"');
    expect(html).toContain('href="/apple-touch-icon.png"');
    expect(html).toContain('name="theme-color"');
    expect(existsSync(join(root, "public/favicon.svg"))).toBe(true);
    expect(existsSync(join(root, "public/favicon-32.png"))).toBe(true);
    expect(existsSync(join(root, "public/favicon.ico"))).toBe(true);
    expect(existsSync(join(root, "public/apple-touch-icon.png"))).toBe(true);
  });
});
