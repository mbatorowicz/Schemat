import { describe, it, expect } from "vitest";
import { resolveBootStatusMessage } from "../src/project-boot.js";

describe("resolveBootStatusMessage", () => {
  it("komunikat z dysku bez toastu", () => {
    const m = resolveBootStatusMessage({
      loadedFromDisk: true,
      sheetCount: 2,
      libraryLabel: "lib/E-00.svg",
      restoredFromCache: false,
      hasDir: true,
    });
    expect(m.toast).toBe(false);
    expect(m.message).toContain("Wczytano z dysku");
  });

  it("cache ostrzega o Przywróć dostęp", () => {
    const m = resolveBootStatusMessage({
      loadedFromDisk: false,
      sheetCount: 1,
      libraryLabel: "x",
      restoredFromCache: true,
      dirHint: "CS",
      hasDir: true,
    });
    expect(m.tone).toBe("warning");
    expect(m.message).toContain("Przywróć dostęp");
  });
});
