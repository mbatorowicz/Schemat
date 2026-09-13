// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { exportSymbolSvg } from "../src/defs-assembler.js";
import { SVGNS } from "../src/svg-constants.js";

function svgEl(tag, attrs = {}) {
  const el = document.createElementNS(SVGNS, tag);
  Object.entries(attrs).forEach(([k, v]) => el.setAttribute(k, v));
  return el;
}

describe("exportSymbolSvg", () => {
  it("składa defs z id symbolu i neutralizuje javascript:", () => {
    const libSvg = svgEl("svg");
    const libDefs = svgEl("defs");
    const style = svgEl("style");
    style.textContent = ".sym { stroke: #0f172a }";
    libDefs.appendChild(style);
    const wd = svgEl("g", { id: "WD" });
    wd.appendChild(svgEl("use", { href: "javascript:alert(1)" }));
    libDefs.appendChild(wd);
    libSvg.appendChild(libDefs);

    const markup = exportSymbolSvg({
      node: wd.cloneNode(true),
      libSvg,
      bbox: { x: 0, y: 0, width: 40, height: 20 },
    });

    expect(markup).toMatch(/<defs[\s>]/);
    expect(markup).toContain('id="WD"');
    expect(markup.toLowerCase()).not.toContain("javascript:");
    expect(markup).toContain("viewBox=");
  });
});
