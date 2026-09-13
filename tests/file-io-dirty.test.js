// @vitest-environment jsdom

import { afterEach, describe, it, expect, vi } from "vitest";
import {
  markSheetDirty,
  clearSheetDirty,
  countDirtySheets,
  preserveDirtySheets,
  sheetKey,
} from "../src/sheet-persistence.js";
import { shouldWriteLibraryCache, libraryCacheScore } from "../src/boot-cache.js";
import { createFileIo } from "../src/file-io.js";
import { clearSettingsDirty, isSettingsDirty, markSettingsDirty } from "../src/project-dirty.js";

describe("sheet dirty / save guards", () => {
  it("markuje i liczy dirty arkusze", () => {
    const a = { name: "A.svg", dirty: false };
    const b = { name: "B.svg", dirty: false };
    markSheetDirty(a);
    expect(a.dirty).toBe(true);
    expect(countDirtySheets([a, b])).toBe(1);
    clearSheetDirty(a);
    expect(countDirtySheets([a, b])).toBe(0);
  });

  it("preserveDirtySheets zachowuje lokalne zmiany przy reload", () => {
    const prev = [{ name: "A.svg", relPath: "A.svg", dirty: true, id: "sch-1" }];
    const disk = [{ name: "A.svg", relPath: "A.svg", dirty: false, id: "sch-1" }];
    const out = preserveDirtySheets(prev, disk);
    expect(out[0]).toBe(prev[0]);
    expect(sheetKey(out[0])).toBe("A.svg");
  });
});

describe("shouldWriteLibraryCache", () => {
  it("nie nadpisuje pełnego cache pustym", () => {
    const full = { text: "<svg></svg>".repeat(20), savedAt: 2 };
    const empty = { text: "", savedAt: 0 };
    expect(shouldWriteLibraryCache(empty, full)).toBe(false);
    expect(shouldWriteLibraryCache(full, empty)).toBe(true);
  });

  it("uwzględnia scoreFloor", () => {
    const snap = { text: "abc", savedAt: 1 };
    expect(libraryCacheScore(snap)).toBeLessThan(1000);
    expect(shouldWriteLibraryCache(snap, null, 1000)).toBe(false);
  });
});

function mockWritable() {
  return {
    write: vi.fn(async () => {}),
    close: vi.fn(async () => {}),
  };
}

function mockHandle(name) {
  const writable = mockWritable();
  return {
    name,
    writable,
    createWritable: vi.fn(async () => writable),
    queryPermission: vi.fn(async () => "granted"),
    requestPermission: vi.fn(async () => "granted"),
  };
}

function grantedDir(handles = {}) {
  return {
    queryPermission: vi.fn(async () => "granted"),
    requestPermission: vi.fn(async () => "granted"),
    getFileHandle: vi.fn(async (name, opts) => {
      if (handles[name]) return handles[name];
      if (!opts?.create) throw new Error("missing " + name);
      const h = mockHandle(name);
      handles[name] = h;
      return h;
    }),
  };
}

function tinySvg() {
  return document.createElementNS("http://www.w3.org/2000/svg", "svg");
}

function fileIoFor(state, extras = {}) {
  return createFileIo({
    getState: () => state,
    setStatus: vi.fn(),
    inlineSheetDefs: () => ({}),
    flushLibrary: vi.fn(),
    flushDoc: vi.fn(),
    buildSymbolList: vi.fn(),
    syncListSelection: vi.fn(),
    idbSet: vi.fn(async () => {}),
    XLINK: "http://www.w3.org/1999/xlink",
    saveProjectSettings: vi.fn(async () => false),
    ...extras,
  });
}

describe("saveProjectToDisk — biblioteka dirty", () => {
  afterEach(() => {
    clearSettingsDirty();
  });

  it("lib.dirty === false i jest handle → writeHandle lib nie wołany", async () => {
    const libHandle = mockHandle("E-00_symbole.svg");
    const lib = { svg: tinySvg(), name: "E-00_symbole.svg", handle: libHandle, dirty: false };
    const dir = grantedDir({ "E-00_symbole.svg": libHandle });
    const state = { dir, lib, libHandle, sheets: [] };
    await fileIoFor(state).saveProjectToDisk();
    expect(libHandle.createWritable).not.toHaveBeenCalled();
    expect(lib.dirty).toBe(false);
  });

  it("lib.dirty === true → zapisuje i czyści dirty", async () => {
    const libHandle = mockHandle("E-00_symbole.svg");
    const lib = { svg: tinySvg(), name: "E-00_symbole.svg", handle: libHandle, dirty: true };
    const dir = grantedDir({ "E-00_symbole.svg": libHandle });
    const state = { dir, lib, libHandle, sheets: [] };
    await fileIoFor(state).saveProjectToDisk();
    expect(libHandle.createWritable).toHaveBeenCalledTimes(1);
    expect(lib.dirty).toBe(false);
  });

  it("po udanym zapisie JSON czyści settingsDirty", async () => {
    markSettingsDirty();
    const libHandle = mockHandle("E-00_symbole.svg");
    const lib = { svg: tinySvg(), name: "E-00_symbole.svg", handle: libHandle, dirty: false };
    const dir = grantedDir({ "E-00_symbole.svg": libHandle });
    const state = { dir, lib, libHandle, sheets: [] };
    await fileIoFor(state, { saveProjectSettings: vi.fn(async () => true) }).saveProjectToDisk();
    expect(isSettingsDirty()).toBe(false);
  });

  it("brak handle (pierwszy zapis) zapisuje nawet gdy dirty jest puste", async () => {
    const lib = { svg: tinySvg(), name: "E-00_symbole.svg", dirty: false };
    const created = {};
    const dir = grantedDir(created);
    const state = { dir, lib, libHandle: null, sheets: [] };
    await fileIoFor(state).saveProjectToDisk();
    expect(dir.getFileHandle).toHaveBeenCalledWith("E-00_symbole.svg", { create: true });
    expect(created["E-00_symbole.svg"].createWritable).toHaveBeenCalledTimes(1);
    expect(lib.dirty).toBe(false);
  });
});

describe("saveFile / saveAs — clearLibDirty", () => {
  it("saveFile biblioteki po sukcesie czyści lib.dirty", async () => {
    const libHandle = mockHandle("E-00_symbole.svg");
    const lib = { svg: tinySvg(), name: "E-00_symbole.svg", handle: libHandle, dirty: true };
    const state = { active: lib, lib, sheets: [] };
    await fileIoFor(state).saveFile();
    expect(libHandle.createWritable).toHaveBeenCalledTimes(1);
    expect(lib.dirty).toBe(false);
  });
});

describe("save() — mutex i jeden przebieg", () => {
  it("przy dir nie woła osobnego saveFile (arkusz zapisany raz)", async () => {
    const sheetHandle = mockHandle("A.svg");
    const libHandle = mockHandle("E-00_symbole.svg");
    const sheet = { svg: tinySvg(), name: "A.svg", handle: sheetHandle, dirty: true };
    const lib = { svg: tinySvg(), name: "E-00_symbole.svg", handle: libHandle, dirty: false };
    const dir = grantedDir({ "A.svg": sheetHandle, "E-00_symbole.svg": libHandle });
    const setStatus = vi.fn();
    const state = { dir, lib, libHandle, sheets: [sheet], active: sheet };
    await fileIoFor(state, { setStatus }).save();
    expect(sheetHandle.createWritable).toHaveBeenCalledTimes(1);
    expect(libHandle.createWritable).not.toHaveBeenCalled();
    expect(setStatus).toHaveBeenCalledTimes(1);
  });

  it("przy saving drugi save() nie pisze", async () => {
    let release;
    const gate = new Promise((resolve) => {
      release = resolve;
    });
    const sheetHandle = mockHandle("A.svg");
    sheetHandle.createWritable = vi.fn(async () => {
      await gate;
      return mockWritable();
    });
    const sheet = { svg: tinySvg(), name: "A.svg", handle: sheetHandle, dirty: true };
    const lib = { svg: tinySvg(), name: "E-00_symbole.svg", handle: mockHandle("E-00_symbole.svg"), dirty: false };
    const dir = grantedDir({ "A.svg": sheetHandle });
    const state = { dir, lib, libHandle: lib.handle, sheets: [sheet], active: sheet };
    const io = fileIoFor(state);
    const first = io.save();
    const second = io.save();
    expect(io.isSaving()).toBe(true);
    release();
    await Promise.all([first, second]);
    expect(sheetHandle.createWritable).toHaveBeenCalledTimes(1);
    expect(io.isSaving()).toBe(false);
  });

  it("blokuje #btnSave na czas zapisu", async () => {
    let release;
    const gate = new Promise((resolve) => {
      release = resolve;
    });
    const sheetHandle = mockHandle("A.svg");
    sheetHandle.createWritable = vi.fn(async () => {
      await gate;
      return mockWritable();
    });
    const sheet = { svg: tinySvg(), name: "A.svg", handle: sheetHandle, dirty: true };
    const lib = { svg: tinySvg(), name: "E-00.svg", handle: mockHandle("E-00.svg"), dirty: false };
    const dir = grantedDir({ "A.svg": sheetHandle });
    const btn = { disabled: false };
    const state = { dir, lib, libHandle: lib.handle, sheets: [sheet], active: sheet };
    const io = fileIoFor(state, {
      setSaveBusy: (on) => {
        btn.disabled = !!on;
      },
    });
    const p = io.save();
    expect(btn.disabled).toBe(true);
    release();
    await p;
    expect(btn.disabled).toBe(false);
  });
});
