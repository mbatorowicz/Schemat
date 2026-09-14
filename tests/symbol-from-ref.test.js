// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { catalogFromLibrary, matchSymbolsForRef, symbolChoiceLabel } from "../src/symbol-from-ref.js";

describe("symbol-from-ref", () => {
  it("catalogFromLibrary czyta prefix i nazwę", () => {
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    const defs = document.createElementNS("http://www.w3.org/2000/svg", "defs");
    const wd = document.createElementNS("http://www.w3.org/2000/svg", "g");
    wd.id = "WD";
    wd.setAttribute("data-inst-prefix", "WD");
    wd.setAttribute("data-symbol-name", "Wyłącznik");
    const x = document.createElementNS("http://www.w3.org/2000/svg", "g");
    x.id = "X-3";
    x.setAttribute("data-inst-prefix", "X");
    x.setAttribute("data-symbol-name", "Listwa");
    defs.appendChild(wd);
    defs.appendChild(x);
    svg.appendChild(defs);
    const cat = catalogFromLibrary(svg);
    expect(cat.map((c) => c.id)).toEqual(["WD", "X-3"]);
    expect(cat[0].prefix).toBe("WD");
    expect(cat[1].prefix).toBe("X");
    expect(cat[0].name).toBe("Wyłącznik");
  });

  it("WD1 → unikalny symbol o id WD", () => {
    const catalog = [
      { id: "WD", prefix: "WD", name: "Wyłącznik" },
      { id: "WD-24", prefix: "WD", name: "24V" },
    ];
    const m = matchSymbolsForRef("WD1", catalog);
    expect(m.status).toBe("unique");
    expect(m.matches).toEqual([{ id: "WD", prefix: "WD", name: "Wyłącznik" }]);
  });

  it("X1 przy dwóch listwach jest niejednoznaczne", () => {
    const catalog = [
      { id: "X-3", prefix: "X", name: "3P" },
      { id: "X-4", prefix: "X", name: "4P" },
    ];
    const m = matchSymbolsForRef("X1", catalog);
    expect(m.status).toBe("ambiguous");
    expect(m.matches).toHaveLength(2);
  });

  it("brak kandydata → none", () => {
    const m = matchSymbolsForRef("ZZ9", [{ id: "WD", prefix: "WD" }]);
    expect(m.status).toBe("none");
    expect(m.prefix).toBe("ZZ");
    expect(m.matches).toEqual([]);
  });

  it("G1 trafia w symbol o id G1 (pełne oznaczenie, nie tylko prefix)", () => {
    const m = matchSymbolsForRef("G1", [
      { id: "G1", prefix: "G1", name: "Zasilacz" },
      { id: "F1", prefix: "F1" },
    ]);
    expect(m.status).toBe("unique");
    expect(m.matches[0].id).toBe("G1");
  });

  it("jedyny prefix bez dokładnego id jest unique", () => {
    const m = matchSymbolsForRef("G1", [{ id: "PSU", prefix: "G", name: "Zasilacz" }]);
    expect(m.status).toBe("unique");
    expect(m.matches[0].id).toBe("PSU");
  });

  it("symbolChoiceLabel składa id i nazwę", () => {
    expect(symbolChoiceLabel({ id: "WD", name: "Wyłącznik" })).toBe("WD · Wyłącznik");
    expect(symbolChoiceLabel({ id: "SK" })).toBe("SK");
  });
});
