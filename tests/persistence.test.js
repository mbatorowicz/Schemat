// @vitest-environment jsdom
import "fake-indexeddb/auto";
import { afterEach, describe, it, expect, beforeEach, vi } from "vitest";
import { pickJsonCache, readJsonCache, writeJsonCache, idbSet, clearEditorCache } from "../src/persistence.js";
import { shouldWriteProjectCache } from "../src/boot-cache.js";

describe("pickJsonCache", () => {
  it("preferuje pełniejszy snapshot nad pustym localStorage", () => {
    expect(pickJsonCache({ sheets: [] }, { sheets: [{ id: "sch-old", text: "<svg/>" }] })).toEqual({
      sheets: [{ id: "sch-old", text: "<svg/>" }],
    });
  });

  it("preferuje localStorage gdy jest pełniejszy", () => {
    expect(pickJsonCache({ from: "ls", sheets: [{ text: "aaa" }] }, { from: "idb", sheets: [] })).toEqual({
      from: "ls",
      sheets: [{ text: "aaa" }],
    });
  });

  it("fallback do IndexedDB gdy localStorage pusty", () => {
    expect(pickJsonCache(null, { from: "idb" })).toEqual({ from: "idb" });
  });
});

describe("readJsonCache", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("integracyjnie preferuje pełniejszy cache nad pustym LS", async () => {
    await idbSet("project", { from: "idb", sheets: [{ id: "sch-old", text: "<svg/>" }] });
    localStorage.setItem("edytor.project", JSON.stringify({ from: "ls", sheets: [] }));
    const result = await readJsonCache("project", "edytor.project");
    expect(result.from).toBe("idb");
    expect(result.sheets).toHaveLength(1);
  });

  it("writeJsonCache + readJsonCache roundtrip przez localStorage", async () => {
    const snap = { sheets: [{ id: "sch-1", name: "E-01.svg" }], settings: { library: "lib.svg" } };
    writeJsonCache("project", "edytor.project", snap);
    const result = await readJsonCache("project", "edytor.project");
    expect(result).toEqual(snap);
  });

  it("shouldWriteProjectCache chroni przed pustym nadpisaniem", () => {
    expect(shouldWriteProjectCache({ sheets: [] }, { sheets: [{ id: "a", text: "x" }] })).toBe(false);
    expect(shouldWriteProjectCache({ sheets: [{ id: "b", text: "yy" }] }, { sheets: [{ id: "a", text: "x" }] })).toBe(
      true
    );
  });
});

describe("clearEditorCache / quota", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
  });

  it("clear zostawia puste klucze settings/prefs", async () => {
    localStorage.setItem("edytor.settings", '{"x":1}');
    localStorage.setItem("edytor.prefs", '{"y":1}');
    localStorage.setItem("edytor.project", "{}");
    localStorage.setItem("edytor.lib", "{}");
    await clearEditorCache();
    expect(localStorage.getItem("edytor.settings")).toBeNull();
    expect(localStorage.getItem("edytor.prefs")).toBeNull();
    expect(localStorage.getItem("edytor.project")).toBeNull();
    expect(localStorage.getItem("edytor.lib")).toBeNull();
  });

  it("write z pełnym mockiem quota → ok: false", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      const e = new Error("exceeded");
      e.name = "QuotaExceededError";
      throw e;
    });
    const res = writeJsonCache("project", "edytor.project", { sheets: [{ text: "x" }] });
    expect(res).toEqual({ ok: false, reason: "quota" });
  });
});
