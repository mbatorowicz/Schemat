import { describe, it, expect, afterEach } from "vitest";
import { resolveSaveBadgeState } from "../src/save-badge.js";
import {
  markLibDirty,
  clearLibDirty,
  markSettingsDirty,
  clearSettingsDirty,
  getDirtyMap,
  countDirtyAll,
} from "../src/project-dirty.js";

describe("resolveSaveBadgeState", () => {
  it("priorytet: brak uprawnień gdy jest folder", () => {
    const s = resolveSaveBadgeState({ dirtyN: 2, needPerm: true, hasDir: true });
    expect(s.kind).toBe("perm");
    expect(s.actionable).toBe(true);
  });

  it("pokazuje dirty gdy są niezapisane arkusze", () => {
    const s = resolveSaveBadgeState({ dirtyN: 3, needPerm: false, hasDir: true });
    expect(s.kind).toBe("dirty");
    expect(s.label).toContain("3");
  });

  it("ok gdy projekt czysty", () => {
    const s = resolveSaveBadgeState({ dirtyN: 0, needPerm: false, hasDir: true });
    expect(s.kind).toBe("ok");
  });

  it("idle bez projektu", () => {
    const s = resolveSaveBadgeState({ dirtyN: 0, needPerm: false, hasDir: false });
    expect(s.kind).toBe("idle");
  });

  it("settingsDirty przy 0 arkuszach → badge dirty", () => {
    const s = resolveSaveBadgeState({
      dirtyN: 0,
      needPerm: false,
      hasDir: true,
      settingsDirty: true,
    });
    expect(s.kind).toBe("dirty");
    expect(s.label).toBe("Niezapisane");
    expect(s.actionable).toBe(false);
  });

  it("libDirty przy 0 arkuszach → badge dirty (jak settings)", () => {
    const s = resolveSaveBadgeState({
      dirtyN: 0,
      needPerm: false,
      hasDir: true,
      hasLibDirty: true,
    });
    expect(s.kind).toBe("dirty");
    expect(s.label).toBe("Niezapisane");
  });
});

describe("getDirtyMap / countDirtyAll", () => {
  afterEach(() => {
    clearSettingsDirty();
  });

  it("liczy arkusze + lib + settings", () => {
    const lib = { dirty: false };
    const state = { sheets: [{ dirty: true }, { dirty: false }], lib };
    expect(getDirtyMap(state)).toEqual({
      sheetsDirty: 1,
      libDirty: false,
      settingsDirty: false,
    });
    expect(countDirtyAll(state)).toBe(1);

    markLibDirty(lib);
    markSettingsDirty();
    expect(getDirtyMap(state)).toEqual({
      sheetsDirty: 1,
      libDirty: true,
      settingsDirty: true,
    });
    expect(countDirtyAll(state)).toBe(3);

    clearLibDirty(lib);
    clearSettingsDirty();
    expect(countDirtyAll(state)).toBe(1);
  });

  it("settingsDirty przy 0 arkuszach daje countDirtyAll = 1", () => {
    markSettingsDirty();
    const state = { sheets: [], lib: { dirty: false } };
    expect(getDirtyMap(state).settingsDirty).toBe(true);
    expect(countDirtyAll(state)).toBe(1);
    const badge = resolveSaveBadgeState({
      dirtyN: 0,
      needPerm: false,
      hasDir: true,
      settingsDirty: getDirtyMap(state).settingsDirty,
    });
    expect(badge.kind).toBe("dirty");
  });
});
