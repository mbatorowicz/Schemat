// @vitest-environment jsdom

import { describe, it, expect } from "vitest";
import { sanitizeSvgText, parseSvg } from "../src/svg-utils.js";
import { cssEsc, qsById } from "../src/dom-selectors.js";

describe("svg-utils sanitize", () => {
  it("usuwa tag script z SVG", () => {
    const raw = '<svg><script>alert(1)</script><rect id="a"/></svg>';
    expect(sanitizeSvgText(raw)).not.toMatch(/<script/i);
    expect(sanitizeSvgText(raw)).toContain('id="a"');
  });

  it("usuwa atrybuty onload", () => {
    const raw = '<svg><rect id="a" onload="alert(1)"/></svg>';
    expect(sanitizeSvgText(raw)).not.toMatch(/onload/i);
  });

  it("neutralizuje javascript: i data: w href", () => {
    const js = '<svg><use href="javascript:alert(1)"/></svg>';
    const data = '<svg><image xlink:href="data:text/html,x"/></svg>';
    expect(sanitizeSvgText(js)).not.toMatch(/javascript:/i);
    expect(sanitizeSvgText(data)).not.toMatch(/data:text/i);
  });
});

describe("parseSvg sanitizeSvgDom", () => {
  function hrefOf(svg) {
    const el = svg.querySelector("[href], use, image, a");
    return el?.getAttribute("href") || el?.getAttribute("xlink:href") || "";
  }

  it("neutralizuje href z encją &#106;avascript", () => {
    const p = parseSvg('<svg xmlns="http://www.w3.org/2000/svg"><use href="&#106;avascript:alert(1)"/></svg>');
    expect(p).toBeTruthy();
    expect(hrefOf(p.svg)).not.toMatch(/javascript/i);
    expect(p.svg.querySelector("use")).toBeTruthy();
  });

  it("usuwa niezamknięty script", () => {
    const p = parseSvg('<svg xmlns="http://www.w3.org/2000/svg"><script src="evil.js"><rect id="a"/></svg>');
    expect(p).toBeTruthy();
    expect(p.svg.querySelector("script")).toBeNull();
  });

  it("usuwa set z attributeName=onclick", () => {
    const p = parseSvg(
      '<svg xmlns="http://www.w3.org/2000/svg"><rect id="a"/><set attributeName="onclick" to="alert(1)"/></svg>'
    );
    expect(p).toBeTruthy();
    expect(p.svg.querySelector("set")).toBeNull();
    expect(p.svg.querySelector("#a")).toBeTruthy();
  });

  it("usuwa animate z attributeName=href", () => {
    const p = parseSvg(
      '<svg xmlns="http://www.w3.org/2000/svg"><use href="#G1"/><animate attributeName="href" values="javascript:alert(1)"/></svg>'
    );
    expect(p).toBeTruthy();
    expect(p.svg.querySelector("animate")).toBeNull();
    expect(p.svg.querySelector("use").getAttribute("href")).toBe("#G1");
  });
});

describe("dom-selectors", () => {
  it("cssEsc działa bez globalnego CSS (Node)", () => {
    expect(cssEsc('a"b')).toBe('a\\"b');
  });

  it("qsById zwraca null dla brakującego root", () => {
    expect(qsById(null, "x")).toBeNull();
  });
});
