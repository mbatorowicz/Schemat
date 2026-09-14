import { describe, it, expect, vi } from "vitest";
import {
  defaultLibraryRelPath,
  libraryDiscoveryRelPaths,
  existingLibrarySvgNames,
  sheetRelPathSet,
} from "../src/project-paths.js";
import {
  getFileHandleByPath,
  isAllowedLibraryParentPath,
  isLikelyLibraryFileName,
  relinkExistingFileHandle,
  resolvePathViaParents,
} from "../src/project-files.js";

describe("project-paths", () => {
  it("defaultLibraryRelPath — plik w katalogu projektu", () => {
    expect(defaultLibraryRelPath()).toBe("symbole.svg");
  });

  it("libraryDiscoveryRelPaths — płasko, lib/, ../lib/", () => {
    const paths = libraryDiscoveryRelPaths("shared/symbole.svg");
    expect(paths[0]).toBe("shared/symbole.svg");
    expect(paths).toContain("symbole.svg");
    expect(paths).toContain("lib/symbole.svg");
    expect(paths).toContain("../lib/symbole.svg");
    expect(paths).toContain("E-00_symbole.svg");
    expect(paths).toContain("../lib/E-00_symbole.svg");
  });

  it("existingLibrarySvgNames pomija schematy", () => {
    const files = [
      { name: "symbole.svg", relPath: "symbole.svg" },
      { name: "Arkusz.svg", relPath: "arkusze/Arkusz.svg" },
    ];
    const sheets = new Set(["arkusze/Arkusz.svg"]);
    expect(existingLibrarySvgNames(files, sheets)).toEqual(["symbole.svg"]);
  });

  it("isLikelyLibraryFileName rozpoznaje domyślne i legacy nazwy", () => {
    expect(isLikelyLibraryFileName("symbole.svg")).toBe(true);
    expect(isLikelyLibraryFileName("symbole-elek.svg")).toBe(true);
    expect(isLikelyLibraryFileName("E-00_symbole.svg")).toBe(true);
    expect(isLikelyLibraryFileName("Arkusz.svg")).toBe(false);
  });

  it("sheetRelPathSet", () => {
    expect(sheetRelPathSet([{ relPath: "a/x.svg", name: "x.svg" }])).toEqual(new Set(["a/x.svg"]));
  });
});

describe("relinkExistingFileHandle", () => {
  it("szuka pliku bez create: true", async () => {
    const dir = {};
    const getByPath = vi.fn(async () => ({ name: "A.svg" }));
    const h = await relinkExistingFileHandle(dir, "arkusze/A.svg", "A.svg", getByPath);
    expect(getByPath).toHaveBeenCalledWith(dir, "arkusze/A.svg", false);
    expect(h).toEqual({ name: "A.svg" });
  });

  it("brak pliku → handle = null (nie tworzy)", async () => {
    const dir = {
      getFileHandle: vi.fn(async () => {
        throw new Error("not found");
      }),
    };
    const getByPath = vi.fn(async () => {
      throw new Error("not found");
    });
    expect(await relinkExistingFileHandle(dir, "Ghost.svg", "Ghost.svg", getByPath)).toBe(null);
    expect(await relinkExistingFileHandle(dir, "", "Ghost.svg")).toBe(null);
    expect(dir.getFileHandle).toHaveBeenCalledWith("Ghost.svg");
  });
});

describe("getFileHandleByPath — granice grantu", () => {
  it("rzuca przy ../x i nie woła handle", async () => {
    const dir = {
      getDirectoryHandle: vi.fn(),
      getFileHandle: vi.fn(),
    };
    await expect(getFileHandleByPath(dir, "../x")).rejects.toThrow(/escapes/);
    await expect(getFileHandleByPath(dir, "foo/./bar.svg")).rejects.toThrow(/escapes/);
    expect(dir.getFileHandle).not.toHaveBeenCalled();
    expect(dir.getDirectoryHandle).not.toHaveBeenCalled();
  });

  it("przechodzi zwykłą ścieżkę w projekcie", async () => {
    const file = { name: "A.svg" };
    const sub = { getFileHandle: vi.fn(async () => file) };
    const dir = { getDirectoryHandle: vi.fn(async () => sub) };
    await expect(getFileHandleByPath(dir, "arkusze/A.svg")).resolves.toBe(file);
  });
});

describe("resolvePathViaParents", () => {
  it("pozwala tylko na ../lib biblioteki i nie tworzy pliku", async () => {
    expect(isAllowedLibraryParentPath("../lib/symbole.svg")).toBe(true);
    expect(isAllowedLibraryParentPath("../lib/E-00_symbole.svg")).toBe(true);
    expect(isAllowedLibraryParentPath("../secret.txt")).toBe(false);
    const file = { name: "symbole.svg" };
    const libDir = {
      getFileHandle: vi.fn(async (n, opts) => {
        expect(opts).toBeUndefined();
        return file;
      }),
    };
    const parent = { getDirectoryHandle: vi.fn(async () => libDir) };
    const dir = { getParent: vi.fn(async () => parent) };
    const r = await resolvePathViaParents(dir, "../lib/symbole.svg");
    expect(r.handle).toBe(file);
    expect(parent.getDirectoryHandle).toHaveBeenCalledWith("lib");
    expect(await resolvePathViaParents(dir, "../secret.txt")).toBe(null);
    expect(dir.getParent).toHaveBeenCalledTimes(1);
  });
});
