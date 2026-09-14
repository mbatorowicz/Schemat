import { describe, it, expect } from "vitest";
import { sheetContentBounds, laneRects, snapToGrid, laneOverlapsTitleBlock } from "../src/sheet-lanes.js";

describe("sheet-lanes", () => {
  it("snapToGrid zaokrągla do kroku", () => {
    expect(snapToGrid(12, 5)).toBe(10);
    expect(snapToGrid(13, 5)).toBe(15);
  });

  it("pole rysunku nie nachodzi na tabelkę A4 landscape", () => {
    const b = sheetContentBounds("landscape");
    expect(b.pageWidth).toBe(1485);
    expect(b.pageHeight).toBe(1050);
    expect(b.y + b.height).toBeLessThanOrEqual(b.titleBlockY);
    expect(b.x).toBeGreaterThan(0);
  });

  it("pasy mieszczą się nad tabelką i nie nachodzą na siebie", () => {
    const b = sheetContentBounds("landscape");
    const lanes = laneRects(b, 5);
    const cols = [lanes.power, lanes.control, lanes.drive, lanes.terminals];
    cols.forEach((lane) => {
      expect(laneOverlapsTitleBlock(lane, b.titleBlockY)).toBe(false);
      expect(lane.y).toBeGreaterThanOrEqual(b.y);
      expect(lane.y + lane.height).toBeLessThanOrEqual(b.titleBlockY);
    });
    expect(lanes.rails.y).toBe(b.y);
    expect(lanes.power.x).toBeLessThan(lanes.control.x);
    expect(lanes.control.x).toBeLessThan(lanes.drive.x);
    expect(lanes.drive.x).toBeLessThan(lanes.terminals.x);
    const right = lanes.terminals.x + lanes.terminals.width;
    expect(right).toBeCloseTo(b.x + b.width, 5);
  });

  it("portrait ma inną ramkę", () => {
    const b = sheetContentBounds("portrait");
    expect(b.pageWidth).toBe(1050);
    expect(b.pageHeight).toBe(1485);
    expect(b.y + b.height).toBeLessThanOrEqual(b.titleBlockY);
  });
});
