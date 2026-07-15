import { describe, it, expect } from "vitest";
import {
  defaultLibraryRelPath,
  libraryDiscoveryRelPaths,
  existingLibrarySvgNames,
  sheetRelPathSet,
} from "../src/project-paths.js";

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
