import { describe, it, expect } from "vitest";
import {
  uniqueFileName,
  uniqueLibraryFileName,
  nextSheetGroupId,
  libraryRelPathInProject,
  projectSettingsForNewProject,
  emptySvgMarkup,
} from "../src/document-scaffold.js";

describe("document-scaffold", () => {
  it("uniqueFileName unika kolizji", () => {
    expect(uniqueFileName(["Schemat.svg"], "Schemat")).toBe("Schemat-2.svg");
    expect(uniqueFileName([], "Arkusz")).toBe("Arkusz.svg");
  });

  it("uniqueLibraryFileName preferuje symbole.svg", () => {
    expect(uniqueLibraryFileName([])).toBe("symbole.svg");
    expect(uniqueLibraryFileName(["symbole.svg"])).toBe("symbole-elek.svg");
    expect(uniqueLibraryFileName(["symbole.svg", "symbole-elek.svg", "E-00_symbole.svg", "E-00.svg"])).toBe(
      "symbole-2.svg"
    );
  });

  it("nextSheetGroupId zwiększa numer", () => {
    expect(nextSheetGroupId(["sch-1", "sch-2"], null)).toBe("sch-3");
  });

  it("libraryRelPathInProject i projectSettingsForNewProject", () => {
    expect(libraryRelPathInProject()).toBe("symbole.svg");
    const cfg = projectSettingsForNewProject("Maszyna-01");
    expect(cfg.library).toBe("symbole.svg");
    expect(cfg.doc).toBe("Maszyna-01");
  });

  it("emptySvgMarkup zawiera defs/style", () => {
    expect(emptySvgMarkup(".sym{}")).toContain("<defs><style>.sym{}</style></defs>");
  });
});
