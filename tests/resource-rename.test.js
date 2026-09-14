import { describe, it, expect } from "vitest";
import {
  sheetBaseNameFromInput,
  libraryFileNameFromInput,
  projectFolderNameFromInput,
} from "../src/resource-rename.js";

describe("resource-rename validation", () => {
  it("waliduje nazwę schematu bez .svg", () => {
    expect(sheetBaseNameFromInput("Arkusz").ok).toBe(true);
    expect(sheetBaseNameFromInput("Arkusz.svg").ok).toBe(true);
    expect(sheetBaseNameFromInput("").ok).toBe(false);
    expect(sheetBaseNameFromInput("bad/name").ok).toBe(false);
  });

  it("wymaga rozszerzenia .svg dla biblioteki", () => {
    expect(libraryFileNameFromInput("symbole.svg").ok).toBe(true);
    expect(libraryFileNameFromInput("lib.svg").ok).toBe(true);
    expect(libraryFileNameFromInput("lib").ok).toBe(false);
  });

  it("odrzuca ukośniki w nazwie projektu", () => {
    expect(projectFolderNameFromInput("Maszyna-01").ok).toBe(true);
    expect(projectFolderNameFromInput("bad/name").ok).toBe(false);
  });
});
