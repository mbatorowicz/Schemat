// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { prepareCaptureSvg, STAGE_LAYER_ATTR } from "../src/assistant-capture.js";

describe("assistant-capture", () => {
  it("usuwa siatkę, zaznaczenie i uchwyty", () => {
    const stage = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    stage.setAttribute("width", "200");
    stage.setAttribute("height", "100");
    const world = document.createElementNS("http://www.w3.org/2000/svg", "g");
    world.id = "world";
    const grid = document.createElementNS("http://www.w3.org/2000/svg", "g");
    grid.setAttribute(STAGE_LAYER_ATTR, "grid");
    const host = document.createElementNS("http://www.w3.org/2000/svg", "g");
    host.setAttribute(STAGE_LAYER_ATTR, "host");
    const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
    host.appendChild(line);
    const sel = document.createElementNS("http://www.w3.org/2000/svg", "g");
    sel.setAttribute(STAGE_LAYER_ATTR, "sel");
    const handles = document.createElementNS("http://www.w3.org/2000/svg", "g");
    handles.setAttribute(STAGE_LAYER_ATTR, "handles");
    world.append(grid, host, sel, handles);
    stage.appendChild(world);
    const clone = prepareCaptureSvg(stage);
    expect(clone).toBeTruthy();
    expect(clone.querySelector(`[${STAGE_LAYER_ATTR}="grid"]`)).toBeNull();
    expect(clone.querySelector(`[${STAGE_LAYER_ATTR}="sel"]`)).toBeNull();
    expect(clone.querySelector(`[${STAGE_LAYER_ATTR}="handles"]`)).toBeNull();
    expect(clone.querySelector(`[${STAGE_LAYER_ATTR}="host"] line`)).toBeTruthy();
    expect(clone.getAttribute("xmlns")).toBe("http://www.w3.org/2000/svg");
  });

  it("odrzuca nie-SVG", () => {
    expect(prepareCaptureSvg(document.createElement("div"))).toBeNull();
    expect(prepareCaptureSvg(null)).toBeNull();
  });
});
