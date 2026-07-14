import { describe, it, expect } from "vitest";
import {
  sheetBaseNameFromInput,
  libraryFileNameFromInput,
  projectFolderNameFromInput,
} from "../src/resource-rename.js";

describe("resource-rename validation", () => {
  it("waliduje nazwę schematu bez .svg", () => {
    expect(sheetBaseNameFromInput("E-01").ok).toBe(true);
    expect(sheetBaseNameFromInput("E-01.svg").ok).toBe(true);
    expect(sheetBaseNameFromInput("").ok).toBe(false);
    expect(sheetBaseNameFromInput("bad/name").ok).toBe(false);
  });

  it("wymaga rozszerzenia .svg dla biblioteki", () => {
    expect(libraryFileNameFromInput("E-00_symbole.svg").ok).toBe(true);
    expect(libraryFileNameFromInput("lib.svg").ok).toBe(true);
    expect(libraryFileNameFromInput("lib").ok).toBe(false);
  });

  it("odrzuca ukośniki w nazwie projektu", () => {
    expect(projectFolderNameFromInput("CS-TB-48").ok).toBe(true);
    expect(projectFolderNameFromInput("bad/name").ok).toBe(false);
  });
});
