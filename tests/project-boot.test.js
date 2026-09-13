import { describe, it, expect } from "vitest";
import { resolveBootStatusMessage, setBootLock, BOOT_LOADING_STATUS } from "../src/project-boot.js";

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

  it("setBootLock stawia i zdejmuje is-booting oraz status Wczytywanie…", () => {
    const classes = new Set();
    const body = {
      classList: {
        toggle(name, on) {
          if (on) classes.add(name);
          else classes.delete(name);
        },
      },
    };
    const statusNode = { textContent: "" };
    expect(setBootLock(true, { body, statusEl: statusNode }).locked).toBe(true);
    expect(classes.has("is-booting")).toBe(true);
    expect(statusNode.textContent).toBe(BOOT_LOADING_STATUS);
    expect(setBootLock(false, { body, statusEl: statusNode }).locked).toBe(false);
    expect(classes.has("is-booting")).toBe(false);
  });
});
