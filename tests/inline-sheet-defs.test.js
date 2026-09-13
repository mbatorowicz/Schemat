// @vitest-environment jsdom
import { readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { describe, expect, it } from "vitest";
import { useColorAwareClone } from "../src/defs-assembler.js";
import { createLibraryRecord, prepareLibrarySvg } from "../src/library-loader.js";
import { inlineSheetDefsSafe } from "../src/sheet-persistence.js";
import { SVGNS } from "../src/svg-constants.js";
import { firstSchId, parseSvg } from "../src/svg-utils.js";
import { collectUsedSymbolIds, resolveLibSymbol, resolveSheetSymbol } from "../src/symbol-service.js";

const fixtures = join(dirname(fileURLToPath(import.meta.url)), "fixtures");

function openFixture(name) {
  return parseSvg(readFileSync(join(fixtures, name), "utf8"));
}

describe("inlineSheetDefsSafe (integracja)", () => {
  it("po otwarciu fixture arkusza zostawia <defs> z użytymi symbolami", () => {
    const sheetParsed = openFixture("Zasilanie.svg");
    expect(sheetParsed).toBeTruthy();
    const id = firstSchId(sheetParsed.svg);
    expect(id).toBe("sch-1");
    const sheet = {
      name: "Zasilanie.svg",
      relPath: "Zasilanie.svg",
      svg: sheetParsed.svg,
      doc: sheetParsed.doc,
      id,
    };

    const libParsed = openFixture("E-00_symbole.svg");
    expect(libParsed).toBeTruthy();
    prepareLibrarySvg(libParsed, SVGNS);
    const lib = createLibraryRecord(libParsed, "E-00_symbole.svg", null);

    const result = inlineSheetDefsSafe(sheet, {
      svgNs: SVGNS,
      libSvg: lib.svg,
      resolveLibSymbol,
      resolveSheetSymbol,
      useColorAwareClone,
      collectUsedSymbols: (rootNode, sheetSvg) => collectUsedSymbolIds(rootNode, lib.svg, sheetSvg),
    });

    expect(result.ok).toBe(true);
    const defs = sheet.svg.querySelector("defs");
    expect(defs).toBeTruthy();
    expect(defs.querySelector("#G1")).toBeTruthy();
    expect(defs.querySelector("#F1")).toBeTruthy();
    expect(result.updated).toEqual(expect.arrayContaining(["G1", "F1"]));
  });
});
