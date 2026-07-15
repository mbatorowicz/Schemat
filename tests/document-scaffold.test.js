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
    expect(uniqueFileName([], "Zasilanie")).toBe("Zasilanie.svg");
  });

  it("uniqueLibraryFileName preferuje E-00_symbole.svg", () => {
    expect(uniqueLibraryFileName([])).toBe("E-00_symbole.svg");
    expect(uniqueLibraryFileName(["E-00_symbole.svg"])).toBe("E-00.svg");
  });

  it("nextSheetGroupId zwiększa numer", () => {
    expect(nextSheetGroupId(["sch-1", "sch-2"], null)).toBe("sch-3");
  });

  it("libraryRelPathInProject i projectSettingsForNewProject", () => {
    expect(libraryRelPathInProject()).toBe("E-00_symbole.svg");
    const cfg = projectSettingsForNewProject("CS-TB-48");
    expect(cfg.library).toBe("E-00_symbole.svg");
    expect(cfg.doc).toBe("CS-TB-48");
  });

  it("emptySvgMarkup zawiera defs/style", () => {
    expect(emptySvgMarkup(".sym{}")).toContain("<defs><style>.sym{}</style></defs>");
  });
});
