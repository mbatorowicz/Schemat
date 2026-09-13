// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { applyColorAwareCss, isSafeSvgStyleSelector, sanitizeSvgStyleText } from "../src/svg-style.js";
import { parseSvg } from "../src/svg-utils.js";
import { assembleEditDefs, useColorAwareClone } from "../src/defs-assembler.js";
import { SVGNS } from "../src/svg-constants.js";

describe("sanitizeSvgStyleText", () => {
  it("zostawia klasy symboli i scope'uje do svg", () => {
    const out = sanitizeSvgStyleText(".sym{stroke:#0f172a;}.node{fill:#0f172a;}");
    expect(out).toContain("svg .sym{");
    expect(out).toContain("svg .node{");
    expect(out).toContain("stroke:#0f172a");
  });

  it("zostawia #SymbolId", () => {
    expect(sanitizeSvgStyleText("#WD{stroke:red}")).toBe("svg #WD{stroke:red}");
  });

  it("usuwa selektory strony i @import", () => {
    const out = sanitizeSvgStyleText(
      "@import url(https://evil.example/x.css); body{display:none} #toolbar{opacity:0} *{color:red} .sym{stroke:#111}"
    );
    expect(out).toBe("svg .sym{stroke:#111}");
    expect(out).not.toMatch(/body|#toolbar|\*|@import|evil/i);
  });

  it("usuwa url(javascript:) i data:", () => {
    const out = sanitizeSvgStyleText(".sym{stroke:#111;fill:url(javascript:alert(1));background:url(data:text/css,x)}");
    expect(out).toBe("svg .sym{stroke:#111}");
  });

  it("zostawia url(#fragment)", () => {
    expect(sanitizeSvgStyleText(".sym{fill:url(#grad1)}")).toBe("svg .sym{fill:url(#grad1)}");
  });

  it("odrzuca selektor typu i :hover", () => {
    expect(isSafeSvgStyleSelector("text")).toBe(false);
    expect(isSafeSvgStyleSelector(".sym:hover")).toBe(false);
    expect(isSafeSvgStyleSelector(".sym .pin")).toBe(true);
    expect(isSafeSvgStyleSelector("#G1.sym")).toBe(true);
    expect(isSafeSvgStyleSelector("#WD")).toBe(true);
    expect(isSafeSvgStyleSelector("#toolbar")).toBe(false);
  });
});

describe("useColorAwareClone / assembleEditDefs — style", () => {
  function svgEl(tag, attrs = {}) {
    const el = document.createElementNS(SVGNS, tag);
    Object.entries(attrs).forEach(([k, v]) => el.setAttribute(k, v));
    return el;
  }

  it("nie klonuje surowego style — nowy węzeł, bez body/#toolbar", () => {
    const src = svgEl("style");
    src.setAttribute("onclick", "alert(1)");
    src.textContent = "body{display:none}#toolbar{opacity:0}.sym{stroke:#0f172a}";
    const clone = useColorAwareClone(src);
    expect(clone).not.toBe(src);
    expect(clone.getAttribute("onclick")).toBeNull();
    expect(clone.textContent).not.toMatch(/body|#toolbar/i);
    expect(clone.textContent).toContain("svg .sym");
    expect(clone.textContent).toContain("var(--object-stroke");
  });

  it("assembleEditDefs nie wstawia selektorów chrome", () => {
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
    expect(css).toContain("svg .sym");
  });
});

describe("parseSvg czyści <style>", () => {
  it("po parse nie ma body ani @import", () => {
    const p = parseSvg(
      `<svg xmlns="http://www.w3.org/2000/svg"><defs><style>@import url(https://x);body{display:none}.sym{stroke:#111}</style></defs></svg>`
    );
    const css = p.svg.querySelector("style").textContent;
    expect(css).toBe("svg .sym{stroke:#111}");
  });
});

describe("applyColorAwareCss", () => {
  it("nie rusza stroke:none ani istniejącego var()", () => {
    const css = "svg .sym{stroke:none}svg .pin{fill:var(--object-stroke,#334155)}";
    expect(applyColorAwareCss(css)).toBe(css);
  });
});
