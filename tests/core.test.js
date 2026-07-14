import { describe, it, expect } from "vitest";
import { parse, parseEndpoint, normalizeRef, compareIds, wireClass } from "../src/netlist-model.js";
import { sheetBasename, netlistNamesForSheet, pickNetlistForSheet, netlistsForSheet, librarySearchRelPaths } from "../src/project-files.js";
import { refBaseForSymbol, isValidInstanceRef } from "../src/instance-refs.js";
import { pickPointContactByToward } from "../src/conn-contact-pick.js";

describe("netlist-model", () => {
  it("parsuje endpoint z pinem", () => {
    const ep = parseEndpoint("G1:1");
    expect(ep.ref).toBe("G1");
    expect(ep.pin).toBe("1");
  });

  it("normalizuje ref bez myślnika", () => {
    expect(normalizeRef("-WD3")).toBe("WD3");
  });

  it("sortuje id połączeń", () => {
    expect(compareIds("2", "10")).toBeLessThan(0);
    expect(compareIds("10A", "10B")).toBeLessThan(0);
  });

  it("przypisuje klasę przewodu PE", () => {
    expect(wireClass({ net: "PE" })).toBe("wPE");
  });

  it("parsuje tabelę połączeń", () => {
    const md = `## 1. Zasilanie
| Nr | Od | Do | Sygnał | Oznacznik | Przewód | Uwagi |
|----|----|----|--------|-----------|---------|-------|
| 1 | G1:1 | F1:1 | L | \`L\` | YDY 3x1.5 | test |
`;
    const { connections } = parse(md);
    expect(connections).toHaveLength(1);
    expect(connections[0].from.ref).toBe("G1");
  });
});

describe("project-files", () => {
  it("usuwa rozszerzenie svg z nazwy arkusza", () => {
    expect(sheetBasename("E-01.svg")).toBe("E-01");
  });

  it("generuje nazwy spisu połączeń", () => {
    expect(netlistNamesForSheet("E-01.svg")).toContain("polaczenia_E-01.md");
  });

  it("dopasowuje spis do arkusza", () => {
    const netlists = [{ name: "polaczenia_E-01.md", relPath: "polaczenia_E-01.md" }];
    const sheet = { name: "E-01.svg", relPath: "project/E-01.svg" };
    expect(pickNetlistForSheet(netlists, sheet)?.name).toBe("polaczenia_E-01.md");
  });

  it("dopasowuje spis z polskimi znakami w nazwie pliku", async () => {
    const { foldFileName } = await import("../src/project-files.js");
    expect(foldFileName("Bezpieczeństwo")).toBe("bezpieczenstwo");
    const pick = pickNetlistForSheet(
      [{ name: "polaczenia_Bezpieczenstwo.md", relPath: "polaczenia_Bezpieczenstwo.md" }],
      { name: "Bezpieczenstwo.svg" }
    );
    expect(pick?.name).toBe("polaczenia_Bezpieczenstwo.md");
  });

  it("preferuje spis z tego samego folderu co arkusz", () => {
    const netlists = [
      { name: "polaczenia_E-01.md", relPath: "CS-TB-48/polaczenia_E-01.md" },
      { name: "polaczenia_E-02.md", relPath: "inny/polaczenia_E-02.md" },
    ];
    const sheet = { name: "E-01.svg", relPath: "CS-TB-48/E-01.svg" };
    expect(netlistsForSheet(netlists, sheet).map((f) => f.name)).toEqual(["polaczenia_E-01.md"]);
  });

  it("szuka biblioteki w projekcie i folderach nadrzędnych", () => {
    const paths = librarySearchRelPaths("../../lib/E-00_symbole.svg");
    expect(paths[0]).toBe("../../lib/E-00_symbole.svg");
    expect(paths).toContain("lib/E-00_symbole.svg");
  });
});

describe("sheet-persistence", () => {
  it("zachowuje niezapisany arkusz przy przeładowaniu z dysku", async () => {
    const { preserveDirtySheets, sheetKey } = await import("../src/sheet-persistence.js");
    const mem = { name: "E-01.svg", relPath: "CS-TB-48/E-01.svg", id: "sch-1", dirty: true, svg: { tag: "mem" } };
    const disk = { name: "E-01.svg", relPath: "CS-TB-48/E-01.svg", id: "sch-1", dirty: false, svg: { tag: "disk" } };
    const out = preserveDirtySheets([mem], [disk]);
    expect(out[0].svg.tag).toBe("mem");
    expect(sheetKey(mem)).toBe("CS-TB-48/E-01.svg");
  });
});

describe("symbol-resolver", () => {
  it("mapuje SK1 na symbol SK (alias)", async () => {
    const { canonicalSymbolId } = await import("../src/symbol-aliases.js");
    expect(canonicalSymbolId("SK1")).toBe("SK");
    expect(canonicalSymbolId("sk1")).toBe("SK");
  });
});

describe("instance-refs", () => {
  it("waliduje oznaczenie instancji", () => {
    expect(isValidInstanceRef("G1")).toBe(true);
    expect(isValidInstanceRef("")).toBe(false);
  });

  it("czyta prefix z węzła symbolu", () => {
    const node = {
      getAttribute(n) {
        if (n === "data-inst-prefix") return "WD";
        if (n === "data-inst-numbered") return "1";
        if (n === "data-inst-start") return "2";
        return null;
      },
    };
    expect(refBaseForSymbol("foo", node)).toEqual({ base: "WD", numbered: true, start: 2 });
  });

  it("rozpoznaje PSU jako G", () => {
    expect(refBaseForSymbol("PSU").base).toBe("G");
  });

  it("używa id symbolu jako base gdy brak atrybutów numeracji", () => {
    const node = { id: "B", getAttribute: () => null };
    expect(refBaseForSymbol("B", node)).toEqual({ base: "B", numbered: true, start: 1 });
  });
});

describe("conn-contact-pick", () => {
  it("wybiera styk E gdy drugi koniec jest na wschód", () => {
    const contacts = [
      { x: 0, y: -4, dir: "N" },
      { x: 4, y: 0, dir: "E" },
      { x: 0, y: 4, dir: "S" },
      { x: -4, y: 0, dir: "W" },
    ];
    const pick = pickPointContactByToward(contacts, { x: 0, y: 0 }, { x: 20, y: 0 });
    expect(pick.dir).toBe("E");
    expect(pick.x).toBe(4);
  });

  it("wybiera styk N gdy drugi koniec jest na północ", () => {
    const center = { x: 10, y: 10 };
    const contacts = [
      { x: center.x, y: center.y - 4, dir: "N" },
      { x: center.x + 4, y: center.y, dir: "E" },
      { x: center.x, y: center.y + 4, dir: "S" },
      { x: center.x - 4, y: center.y, dir: "W" },
    ];
    const pick = pickPointContactByToward(contacts, center, { x: 10, y: -30 });
    expect(pick.dir).toBe("N");
  });
});

describe("symbol-aliases", () => {
  it("mapuje stare id symbolu na kanoniczne", async () => {
    const { canonicalSymbolId } = await import("../src/symbol-aliases.js");
    expect(canonicalSymbolId("Przylacze")).toBe("WD");
    expect(canonicalSymbolId("Xx-3")).toBe("X-3");
    expect(canonicalSymbolId("sk1")).toBe("SK");
    expect(canonicalSymbolId("SK1")).toBe("SK");
    expect(canonicalSymbolId("Q")).toBe("Q");
  });

  it("mapuje stare oznaczenie instancji", async () => {
    const { canonicalInstanceRef } = await import("../src/symbol-aliases.js");
    expect(canonicalInstanceRef("Przyłącze")).toBe("WD1");
    expect(canonicalInstanceRef("G1")).toBe("G1");
  });
});

describe("instance-refs X-3", () => {
  it("numeruje listwę X-3 od X1", () => {
    expect(refBaseForSymbol("X-3").base).toBe("X");
    expect(refBaseForSymbol("X-3").numbered).toBe(true);
  });
});

describe("element-styles", () => {
  it("nie nadpisuje font-size bez force", async () => {
    const { applyTextStyle, readFontSizePx } = await import("../src/element-styles.js");
    const el = { style: { fontSize: "14px", fontWeight: "600", fill: "#111" } };
    applyTextStyle(el, { fontSize: 9, fontWeight: 400, strokeColor: "#000" });
    expect(el.style.fontSize).toBe("14px");
    expect(readFontSizePx(el)).toBe(14);
  });

  it("ustawia font-size z force", async () => {
    const { applyTextStyle } = await import("../src/element-styles.js");
    const el = { style: { fontSize: "14px", fontWeight: "", fill: "" } };
    applyTextStyle(el, { fontSize: 11, fontWeight: 700, strokeColor: "#222" }, { force: true });
    expect(el.style.fontSize).toBe("11px");
    expect(el.style.fontWeight).toBe("700");
  });
});

describe("project-migrate", () => {
  it("migrateProject nie rzuca gdy stripSheetEmbeddedSymbols dostępne", async () => {
    const { createProjectMigrator } = await import("../src/project-migrate.js");
    const state = {
      lib: { svg: { querySelector: () => null, children: [] } },
      sheets: [],
    };
    const m = createProjectMigrator({
      state,
      SVGNS: "http://www.w3.org/2000/svg",
      XLINK: "http://www.w3.org/1999/xlink",
      normalizeLibLayout: () => {},
      stripSymPrefixInSvg: () => false,
      rewriteSymbolIdRefs: () => {},
      migrateConnModel: () => false,
      buildSymbolList: () => {},
      flushLibrary: () => {},
      markDirty: () => {},
    });
    expect(() => m.migrateProject()).not.toThrow();
  });
});

describe("symbol-service", () => {
  it("kanonizuje href SK1 → SK", async () => {
    const { parseUseHref, resolveSymbolDef } = await import("../src/symbol-service.js");
    const use = {
      getAttribute(n) {
        if (n === "href") return "#SK1";
        if (n === "data-sym") return "SK1";
        return null;
      },
      getAttributeNS() {
        return null;
      },
    };
    expect(parseUseHref(use)).toBe("SK1");
    const symEl = { tagName: "g", id: "SK" };
    const defs = { children: [symEl] };
    const lib = {
      querySelector(sel) {
        return sel === "defs" ? defs : null;
      },
    };
    expect(resolveSymbolDef(lib, null, parseUseHref(use))?.id).toBe("SK");
  });
});

describe("stage-layers", () => {
  it("hostRootFrom zwraca firstElementChild hosta", async () => {
    const { hostRootFrom } = await import("../src/stage-layers.js");
    const host = { firstElementChild: { id: "clone" } };
    expect(hostRootFrom(() => host)).toEqual({ id: "clone" });
    expect(hostRootFrom(host)).toEqual({ id: "clone" });
    expect(hostRootFrom(() => null)).toBeNull();
  });
});

describe("render-pipeline", () => {
  it("mapuje element src na klon po indeksie children", async () => {
    const { createRenderPipeline } = await import("../src/render-pipeline.js");
    const node = {
      children: [{ id: "a" }, { id: "b" }],
    };
    node.children[0].parentNode = node;
    node.children[1].parentNode = node;
    const hostRoot = { children: [{ id: "ca" }, { id: "cb" }] };
    const p = createRenderPipeline({
      state: {},
      XLINK: "http://www.w3.org/1999/xlink",
      createSVGPoint: () => ({ x: 0, y: 0, matrixTransform: () => ({ x: 0, y: 0 }) }),
      resolveLibSymbolNode: () => null,
      isSheetActive: () => false,
      currentSymNode: () => node,
    });
    const pair = p.childPair(node, node.children[1], hostRoot);
    expect(pair.index).toBe(1);
    expect(pair.src.id).toBe("b");
    expect(pair.cel.id).toBe("cb");
  });

});
