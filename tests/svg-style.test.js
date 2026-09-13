// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import {
  applyColorAwareCss,
  EDITOR_STYLE_SCOPE,
  finalizeSvgStyleText,
  isSafeSvgStyleSelector,
  migrateSvgDocumentStyle,
  sanitizeSvgStyleText,
} from "../src/svg-style.js";
import { parseSvg } from "../src/svg-utils.js";
import { assembleEditDefs, useColorAwareClone } from "../src/defs-assembler.js";
import { SVGNS } from "../src/svg-constants.js";

describe("sanitizeSvgStyleText", () => {
  it("zostawia klasy symboli bez prefiksu svg (use shadow tree)", () => {
    const out = sanitizeSvgStyleText(".sym{stroke:#0f172a;}.node{fill:#0f172a;}");
    expect(out).toContain(".sym{");
    expect(out).toContain(".node{");
    expect(out).not.toMatch(/svg\s+\.sym/);
    expect(out).toContain("stroke:#0f172a");
  });

  it("zdejmuje błędny prefiks svg .klasa — odtwarza style po złym zapisie", () => {
    expect(sanitizeSvgStyleText("svg .sym{stroke:#111}svg .fr{fill:none}")).toBe(
      ".sym{stroke:#111}\n.fr{fill:none}"
    );
  });

  it("zostawia #SymbolId", () => {
    expect(sanitizeSvgStyleText("#WD{stroke:red}")).toBe("#WD{stroke:red}");
  });

  it("zostawia selektory typu SVG", () => {
    const out = sanitizeSvgStyleText("path,line,text,rect{fill:none;stroke:#111}");
    expect(out).toMatch(/\bpath\b/);
    expect(out).toMatch(/\bline\b/);
    expect(out).toMatch(/\btext\b/);
    expect(out).toMatch(/\brect\b/);
    expect(out).toContain("fill:none");
  });

  it("na klonie ogranicz typy do sceny, nie do ikon toolbara", () => {
    const out = sanitizeSvgStyleText("path{fill:none}", { scopeTypes: EDITOR_STYLE_SCOPE });
    expect(out).toContain("#stage path");
    expect(out).toContain("#sidebarSymbolDefs path");
    expect(out).toContain("{fill:none}");
    expect(out).not.toMatch(/(^|,)path{/);
  });

  it("usuwa selektory strony i @import", () => {
    const out = sanitizeSvgStyleText(
      "@import url(https://evil.example/x.css); body{display:none} #toolbar{opacity:0} *{color:red} .sym{stroke:#111}"
    );
    expect(out).toBe(".sym{stroke:#111}");
    expect(out).not.toMatch(/body|#toolbar|\*|@import|evil/i);
  });

  it("usuwa url(javascript:) i data:", () => {
    const out = sanitizeSvgStyleText(".sym{stroke:#111;fill:url(javascript:alert(1));background:url(data:text/css,x)}");
    expect(out).toBe(".sym{stroke:#111}");
  });

  it("zostawia url(#fragment)", () => {
    expect(sanitizeSvgStyleText(".sym{fill:url(#grad1)}")).toBe(".sym{fill:url(#grad1)}");
  });

  it("odrzuca body i :hover, zostawia text SVG i klasy", () => {
    expect(isSafeSvgStyleSelector("text")).toBe(true);
    expect(isSafeSvgStyleSelector("body")).toBe(false);
    expect(isSafeSvgStyleSelector(".sym:hover")).toBe(false);
    expect(isSafeSvgStyleSelector(".sym .pin")).toBe(true);
    expect(isSafeSvgStyleSelector("#G1.sym")).toBe(true);
    expect(isSafeSvgStyleSelector("#WD")).toBe(true);
    expect(isSafeSvgStyleSelector("#toolbar")).toBe(false);
    expect(isSafeSvgStyleSelector("#stage")).toBe(false);
    expect(isSafeSvgStyleSelector("#stage path")).toBe(true);
  });
});

describe("finalizeSvgStyleText", () => {
  it("uzupełnia .sym i .fr gdy sanityzacja opróżniła styl", () => {
    const out = finalizeSvgStyleText("body{display:none}");
    expect(out).toContain(".sym{");
    expect(out).toContain(".fr{");
  });
});

describe("useColorAwareClone / assembleEditDefs — style", () => {
  function svgEl(tag, attrs = {}) {
    const el = document.createElementNS(SVGNS, tag);
    Object.entries(attrs).forEach(([k, v]) => el.setAttribute(k, v));
    return el;
  }

  it("nie klonuje surowego style — nowy węzeł, bez body/#toolbar, klasy bez svg ", () => {
    const src = svgEl("style");
    src.setAttribute("onclick", "alert(1)");
    src.textContent = "body{display:none}#toolbar{opacity:0}.sym{stroke:#0f172a}";
    const clone = useColorAwareClone(src);
    expect(clone).not.toBe(src);
    expect(clone.getAttribute("onclick")).toBeNull();
    expect(clone.textContent).not.toMatch(/body|#toolbar/i);
    expect(clone.textContent).toContain(".sym{");
    expect(clone.textContent).not.toMatch(/svg\s+\.sym/);
    expect(clone.textContent).toContain("var(--object-stroke");
  });

  it("assembleEditDefs nie wstawia selektorów chrome i nie psuje .sym", () => {
    const libSvg = svgEl("svg");
    const defs = svgEl("defs");
    const style = svgEl("style");
    style.textContent = "body{display:none}.sym{stroke:#111}";
    const wd = svgEl("g", { id: "WD" });
    defs.append(style, wd);
    libSvg.appendChild(defs);
    const sheetNode = svgEl("g");
    sheetNode.appendChild(svgEl("use", { href: "#WD" }));
    const editDefs = svgEl("defs");
    assembleEditDefs(editDefs, {
      libSvg,
      sheetSvg: null,
      sheetNode,
      xlinkNs: "http://www.w3.org/1999/xlink",
    });
    const css = editDefs.querySelector("style")?.textContent || "";
    expect(css).not.toMatch(/body/i);
    expect(css).toContain(".sym{");
    expect(css).not.toMatch(/svg\s+\.sym/);
  });
});

describe("parseSvg odtwarza styl dokumentu", () => {
  it("po parse nie ma body ani @import, jest .sym bez prefiksu svg", () => {
    const p = parseSvg(
      `<svg xmlns="http://www.w3.org/2000/svg"><defs><style>@import url(https://x);body{display:none}.sym{stroke:#111}.fr{fill:none}</style></defs></svg>`
    );
    const css = p.svg.querySelector("style").textContent;
    expect(css).toContain(".sym{stroke:#111}");
    expect(css).toContain(".fr{fill:none}");
    expect(css).not.toMatch(/svg\s+\.sym/);
    expect(css).not.toMatch(/body|@import/i);
  });

  it("puste style po ataku dostaje .sym i .fr", () => {
    const p = parseSvg(
      `<svg xmlns="http://www.w3.org/2000/svg"><defs><style>body{display:none}</style></defs><rect class="fr"/><path class="sym"/></svg>`
    );
    const css = p.svg.querySelector("style").textContent;
    expect(css).toContain(".sym{");
    expect(css).toContain(".fr{");
  });
});

describe("migrateSvgDocumentStyle", () => {
  it("zdejmuje svg .klasa i uzupełnia .fr", () => {
    const svg = document.createElementNS(SVGNS, "svg");
    const defs = document.createElementNS(SVGNS, "defs");
    const style = document.createElementNS(SVGNS, "style");
    style.textContent = "svg .sym{stroke:#111}";
    defs.appendChild(style);
    svg.appendChild(defs);
    expect(migrateSvgDocumentStyle(svg, SVGNS)).toBe(true);
    expect(style.textContent).toContain(".sym{");
    expect(style.textContent).not.toMatch(/svg\s+\.sym/);
    expect(style.textContent).toContain(".fr{");
    expect(migrateSvgDocumentStyle(svg, SVGNS)).toBe(false);
  });

  it("tworzy style gdy go nie ma", () => {
    const svg = document.createElementNS(SVGNS, "svg");
    expect(migrateSvgDocumentStyle(svg, SVGNS)).toBe(true);
    const css = svg.querySelector("defs style").textContent;
    expect(css).toContain(".sym{");
    expect(css).toContain(".fr{");
  });
});

describe("applyColorAwareCss", () => {
  it("nie rusza stroke:none ani istniejącego var()", () => {
    const css = ".sym{stroke:none}.pin{fill:var(--object-stroke,#334155)}";
    expect(applyColorAwareCss(css)).toBe(css);
  });
});
