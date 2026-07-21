// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import {
  authoredStrokeWidth,
  authoredStrokeColor,
  createWireStrokeOverlay,
  highlightWireByConnId,
  clearWireConnHighlight,
} from "../src/wire-highlight.js";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

describe("wire-highlight", () => {
  it("authoredStrokeWidth czyta inline/atrybut, nie highlight CSS", () => {
    const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
    line.style.strokeWidth = "1.2";
    line.classList.add("conn-route-hl");
    expect(authoredStrokeWidth(line)).toBeCloseTo(1.2);
    line.style.strokeWidth = "";
    line.setAttribute("stroke-width", "2.8");
    expect(authoredStrokeWidth(line)).toBeCloseTo(2.8);
    expect(authoredStrokeWidth(line)).not.toBe(2.6);
  });

  it("authoredStrokeColor preferuje inline nad atrybutem", () => {
    const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
    line.setAttribute("stroke", "#111111");
    line.style.stroke = "#0f172a";
    const c = authoredStrokeColor(line);
    expect(c === "#0f172a" || c === "rgb(15, 23, 42)").toBe(true);
  });

  it("createWireStrokeOverlay nie mutuje oryginalnej trasy", () => {
    const poly = document.createElementNS("http://www.w3.org/2000/svg", "polyline");
    poly.setAttribute("points", "0,0 10,0");
    poly.setAttribute("data-conn-id", "3");
    poly.style.strokeWidth = "1.5";
    poly.style.stroke = "#0f172a";
    const before = poly.style.stroke;
    const hl = createWireStrokeOverlay(poly, { active: true, fmt: String });
    expect(hl.getAttribute("data-role")).toBe("wire-hl");
    expect(hl.getAttribute("stroke")).toBe("#2563eb");
    expect(parseFloat(hl.getAttribute("stroke-width"))).toBeGreaterThan(1.5);
    expect(poly.style.strokeWidth).toBe("1.5");
    expect(poly.style.stroke).toBe(before);
    expect(poly.classList.contains("conn-route-hl")).toBe(false);
  });

  it("highlightWireByConnId nie ustawia klasy mutującej stroke", () => {
    const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
    const poly = document.createElementNS("http://www.w3.org/2000/svg", "polyline");
    poly.setAttribute("points", "0,0 20,0");
    poly.setAttribute("data-conn-id", "9");
    poly.style.strokeWidth = "1.2";
    g.appendChild(poly);
    const found = highlightWireByConnId(g, "9");
    expect(found).toBe(poly);
    expect(poly.classList.contains("conn-route-hl")).toBe(false);
    expect(authoredStrokeWidth(poly)).toBeCloseTo(1.2);
  });

  it("clearWireConnHighlight usuwa legacy klasę", () => {
    const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
    const poly = document.createElementNS("http://www.w3.org/2000/svg", "polyline");
    poly.setAttribute("data-conn-id", "1");
    poly.classList.add("conn-route-hl");
    g.appendChild(poly);
    clearWireConnHighlight(g);
    expect(poly.classList.contains("conn-route-hl")).toBe(false);
  });

  it("smoke: CSS nie wymusza już stroke-width na .conn-route-hl", () => {
    const html = readFileSync(join(root, "index.html"), "utf8");
    expect(html).not.toMatch(/\.conn-route-hl\s*\{[^}]*stroke-width\s*:\s*2\.6/s);
  });
});
