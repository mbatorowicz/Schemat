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
  status,
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

  it("zbiera statusy otwarcia, importu, ustawień i anulowania rysowania", () => {
    const all = collectWordingStrings();
    [
      status.folderReadFailed,
      status.invalidSvg,
      status.invalidSvgFile,
      status.settingsSavedToJson,
      status.settingsSavedNeedPerm,
      status.settingsSavedNoProject,
      status.drawCancelled,
      status.breakCancelled,
      status.cacheProjectUnreadable,
      status.cacheProjectFailed,
      status.cacheLibraryUnreadable,
      status.relinkSharedLibraryFailed,
      status.relinkLibraryFailed,
    ].forEach((s) => expect(all).toContain(s));
    expect(status.importedLoose("a.svg")).toContain("a.svg");
    expect(status.projectOpenFailed("x")).toContain("x");
  });

  it("zbiera statusy zapisu, quota i błędu bootu", () => {
    const all = collectWordingStrings();
    [status.saveNeedProject, status.saveNeedPerm, status.cacheQuota, status.savedProject()].forEach((s) =>
      expect(all).toContain(s)
    );
    expect(status.savedLibrary("a.svg")).toBe("Zapisano bibliotekę a.svg");
    expect(status.savedSheet("b.svg", status.missingSymbolsWarn(["X"]))).toContain("brak symboli X");
    expect(status.savedAs("c.svg")).toContain("c.svg");
    expect(status.downloaded("d.svg")).toBe("Pobrano d.svg.");
    expect(status.savedProject({ savedLib: true, savedSheets: 2, settingsOk: true })).toBe(
      "Zapisano projekt (biblioteka, 2 schematów, projekt.json)"
    );
    expect(status.savedProject({ savedSheets: 1 })).toBe("Zapisano projekt (1 schemat)");
    expect(status.accessRestored(3, status.netlistCountSuffix(4))).toContain("3 schemat");
    expect(status.initFailed("x")).toContain("x");
    expect(status.loadFailed("y")).toContain("y");
  });

  it("zapis i boot nie składają setStatus z gołych stringów", () => {
    const fileIo = readFileSync(join(root, "src/file-io.js"), "utf8");
    const persist = readFileSync(join(root, "src/persist-cache.js"), "utf8");
    const main = readFileSync(join(root, "src/main.js"), "utf8");
    expect(fileIo).not.toMatch(/setStatus\(\s*["'`]/);
    expect(persist).not.toMatch(/setStatus\(\s*["'`]/);
    expect(main).toContain("status.accessRestored");
    expect(main).toContain("status.initFailed");
    expect(main).toContain("status.loadFailed");
    expect(main).not.toContain("Przywrócono dostęp i zsynchronizowano");
  });
});
