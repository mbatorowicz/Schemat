import { describe, it, expect, vi, afterEach } from "vitest";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { readLocalJson, reportRecoverableError, WARN_TOAST } from "../src/recoverable-error.js";
import { persistEditorCache } from "../src/persist-cache.js";
import { relinkLibraryHandles } from "../src/relink-handles.js";
import { status } from "../src/ui-wording.js";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

afterEach(() => {
  vi.restoreAllMocks();
});

describe("reportRecoverableError", () => {
  it("woła console.warn i toast ostrzegawczy", () => {
    const err = new Error("boom");
    const warn = vi.fn();
    const setStatus = vi.fn();
    reportRecoverableError(err, "Nie udało się.", setStatus, warn);
    expect(warn).toHaveBeenCalledWith(err);
    expect(setStatus).toHaveBeenCalledWith("Nie udało się.", WARN_TOAST);
  });
});

describe("readLocalJson", () => {
  it("parsuje poprawny JSON", () => {
    const storage = { getItem: () => '{"a":1}' };
    expect(readLocalJson("k", "msg", vi.fn(), storage)).toEqual({ a: 1 });
  });

  it("pusty klucz → null bez ostrzeżenia", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const setStatus = vi.fn();
    const storage = { getItem: () => null };
    expect(readLocalJson("k", "msg", setStatus, storage)).toBeNull();
    expect(warn).not.toHaveBeenCalled();
    expect(setStatus).not.toHaveBeenCalled();
  });

  it("uszkodzony JSON → warn + toast + null", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const setStatus = vi.fn();
    const storage = { getItem: () => "{nie-json" };
    expect(readLocalJson("k", status.cacheProjectUnreadable, setStatus, storage)).toBeNull();
    expect(warn).toHaveBeenCalled();
    expect(setStatus).toHaveBeenCalledWith(status.cacheProjectUnreadable, WARN_TOAST);
  });
});

describe("persistEditorCache", () => {
  it("przy noSave nic nie pisze", () => {
    const writeProjectCache = vi.fn();
    persistEditorCache({
      noSave: true,
      projectSnapshot: () => ({ generation: 1, sheets: [{ text: "x" }] }),
      writeProjectCache,
    });
    expect(writeProjectCache).not.toHaveBeenCalled();
  });

  it("uszkodzony cache projektu: warn + toast, potem zapis", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const setStatus = vi.fn();
    const writeProjectCache = vi.fn(() => ({ ok: true }));
    persistEditorCache({
      projectSnapshot: () => ({ generation: 2, sheets: [{ text: "nowy" }] }),
      storage: { getItem: (k) => (k === "edytor.project" ? "{zły" : null) },
      writeProjectCache,
      setStatus,
    });
    expect(warn).toHaveBeenCalled();
    expect(setStatus).toHaveBeenCalledWith(status.cacheProjectUnreadable, WARN_TOAST);
    expect(writeProjectCache).toHaveBeenCalled();
  });

  it("wyjątek snapshotu: warn + toast, bez rzutu", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const setStatus = vi.fn();
    expect(() =>
      persistEditorCache({
        projectSnapshot: () => {
          throw new Error("snap");
        },
        writeProjectCache: vi.fn(),
        setStatus,
      })
    ).not.toThrow();
    expect(warn).toHaveBeenCalled();
    expect(setStatus).toHaveBeenCalledWith(status.cacheProjectFailed, WARN_TOAST);
  });

  it("quota → toast z ui-wording", () => {
    const setStatus = vi.fn();
    persistEditorCache({
      projectSnapshot: () => ({ generation: 1, sheets: [{ text: "x" }] }),
      writeProjectCache: () => ({ ok: false, reason: "quota" }),
      setStatus,
    });
    expect(setStatus).toHaveBeenCalledWith(status.cacheQuota, { toast: true, tone: "warning" });
  });

  it("uszkodzony cache biblioteki: warn + toast", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const setStatus = vi.fn();
    persistEditorCache({
      projectSnapshot: () => ({ generation: 1, sheets: [{ text: "x" }] }),
      lib: { svg: {} },
      libSnapshot: () => ({ text: "<svg/>", savedAt: 1 }),
      storage: {
        getItem: (k) => (k === "edytor.lib" ? "{zły" : JSON.stringify({ generation: 0, sheets: [] })),
      },
      writeProjectCache: () => ({ ok: true }),
      writeLibCache: () => ({ ok: true }),
      setStatus,
    });
    expect(warn).toHaveBeenCalled();
    expect(setStatus).toHaveBeenCalledWith(status.cacheLibraryUnreadable, WARN_TOAST);
  });
});

describe("relinkLibraryHandles", () => {
  it("sukces wspólnej biblioteki nie woła ścieżki settings", async () => {
    const getByPath = vi.fn();
    const setStatus = vi.fn();
    const shared = { handle: { name: "lib.svg" }, relPath: "lib.svg" };
    const out = await relinkLibraryHandles("dir", "lib.svg", {
      resolveShared: async () => shared,
      getByPath,
      setStatus,
    });
    expect(out).toEqual({ shared });
    expect(getByPath).not.toHaveBeenCalled();
    expect(setStatus).not.toHaveBeenCalled();
  });

  it("błąd wspólnej biblioteki: warn + toast, potem fallback ścieżki", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const setStatus = vi.fn();
    const handle = { name: "lib.svg" };
    const out = await relinkLibraryHandles("dir", "lib.svg", {
      resolveShared: async () => {
        throw new Error("shared-fail");
      },
      getByPath: async () => handle,
      setStatus,
    });
    expect(out).toEqual({ handle });
    expect(warn).toHaveBeenCalled();
    expect(setStatus).toHaveBeenCalledWith(status.relinkSharedLibraryFailed, WARN_TOAST);
  });

  it("błąd ścieżki biblioteki: warn + toast", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const setStatus = vi.fn();
    const out = await relinkLibraryHandles("dir", "lib.svg", {
      resolveShared: async () => null,
      getByPath: async () => {
        throw new Error("missing");
      },
      setStatus,
    });
    expect(out).toEqual({});
    expect(warn).toHaveBeenCalled();
    expect(setStatus).toHaveBeenCalledWith(status.relinkLibraryFailed, WARN_TOAST);
  });
});

describe("main.js — persistCache / relinkHandles", () => {
  it("nie mają pustych catch; wołają wyodrębnione helpery", () => {
    const main = readFileSync(join(root, "src/main.js"), "utf8");
    expect(main).toContain("persistEditorCache(");
    expect(main).toContain("relinkLibraryHandles(");
    const persist = main.slice(main.indexOf("function persistCache"), main.indexOf("function flushDoc"));
    const relink = main.slice(
      main.indexOf("async function relinkHandles"),
      main.indexOf("async function reloadSheetsFromDir")
    );
    expect(persist).not.toMatch(/catch\s*\([^)]*\)\s*\{\s*\}/);
    expect(relink).not.toMatch(/catch\s*\([^)]*\)\s*\{\s*\}/);
  });
});
