import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import {
  W,
  BANNED_UI_TERMS,
  collectWordingStrings,
  symbolSelectionSummary,
  resourceNameLabel,
  saveFileLabel,
  saveActionTip,
  paramsSaveTip,
} from "../src/ui-wording.js";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

describe("ui-wording SSOT", () => {
  it("nie zawiera zakazanych terminów w eksporcie", () => {
    const all = collectWordingStrings().join("\n");
    for (const banned of BANNED_UI_TERMS) {
      expect(all).not.toContain(banned);
    }
  });

  it("main.js nie zawiera zakazanych etykiet UI (bez nazw plików/projektów)", () => {
    const main = readFileSync(join(root, "src/main.js"), "utf8");
    const labelBans = BANNED_UI_TERMS.filter(
      (t) => !["CS-TB", "Zasilanie", "E-01", "E-00_symbole", "Transporter boczny"].includes(t)
    );
    for (const banned of labelBans) {
      expect(main).not.toContain(banned);
    }
  });

  it("symbolSelectionSummary jest zwięzłe", () => {
    expect(symbolSelectionSummary("Stycznik", "SK")).toBe("Stycznik · SK");
    expect(symbolSelectionSummary("", "SK")).toBe(W.selection.pickSymbol);
  });

  it("resourceNameLabel zwraca etykiety pól zasobów", () => {
    expect(resourceNameLabel("sheet")).toBe(W.field.sheetName);
    expect(resourceNameLabel("library")).toBe(W.field.libraryName);
    expect(resourceNameLabel("project")).toBe(W.field.projectName);
  });

  it("saveActionTip zależy od kontekstu projektu", () => {
    expect(saveActionTip({ hasDir: true })).toBe(W.saveTip.unifiedProject);
    expect(saveActionTip({ hasDir: false, fileName: "a.svg" })).toContain("a.svg");
  });

  it("rozróżnia zapis pliku od zapisu parametrów", () => {
    expect(saveFileLabel({ onLib: true, onSheet: false })).toBe(W.save.fileLib);
    expect(paramsSaveTip("symbol")).toBe(W.saveTip.symbol);
    expect(paramsSaveTip("sheet")).toBe(W.saveTip.sheet);
  });
});
