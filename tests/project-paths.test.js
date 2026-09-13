import { describe, it, expect, vi } from "vitest";
import {
  defaultLibraryRelPath,
  libraryDiscoveryRelPaths,
  existingLibrarySvgNames,
  sheetRelPathSet,
} from "../src/project-paths.js";
import { relinkExistingFileHandle } from "../src/project-files.js";

describe("project-paths", () => {
  it("defaultLibraryRelPath — plik w katalogu projektu", () => {
    expect(defaultLibraryRelPath()).toBe("E-00_symbole.svg");
  });

  it("libraryDiscoveryRelPaths — płasko, lib/, ../lib/", () => {
    const paths = libraryDiscoveryRelPaths("shared/symbole.svg");
    expect(paths[0]).toBe("shared/symbole.svg");
    expect(paths).toContain("E-00_symbole.svg");
    expect(paths).toContain("lib/E-00_symbole.svg");
    expect(paths).toContain("../lib/E-00_symbole.svg");
  });

  it("existingLibrarySvgNames pomija schematy", () => {
    const files = [
      { name: "E-00_symbole.svg", relPath: "E-00_symbole.svg" },
      { name: "Zasilanie.svg", relPath: "arkusze/Zasilanie.svg" },
    ];
    const sheets = new Set(["arkusze/Zasilanie.svg"]);
    expect(existingLibrarySvgNames(files, sheets)).toEqual(["E-00_symbole.svg"]);
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
