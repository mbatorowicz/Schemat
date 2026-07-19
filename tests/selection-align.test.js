import { describe, it, expect } from "vitest";
import { buildAlignUnits, unionBox, computeAlignDeltas } from "../src/selection-align.js";

describe("selection-align", () => {
  it("buildAlignUnits grupuje po ref", () => {
    const a = { id: "a" };
    const b = { id: "b" };
    const c = { id: "c" };
    const units = buildAlignUnits([a, b, c], (el) => (el.id === "c" ? "" : "K1"));
    expect(units).toHaveLength(2);
    const inst = units.find((u) => u.ref === "K1");
    expect(inst.members).toEqual([a, b]);
    expect(units.find((u) => !u.ref).members).toEqual([c]);
  });

  it("computeAlignDeltas left / top", () => {
    const deltas = computeAlignDeltas(
      [
        { id: "1", box: { x: 10, y: 20, width: 10, height: 10 } },
        { id: "2", box: { x: 40, y: 50, width: 10, height: 10 } },
      ],
      "left"
    );
    expect(deltas).toEqual([{ id: "2", dx: -30, dy: 0 }]);

    const top = computeAlignDeltas(
      [
        { id: "1", box: { x: 10, y: 20, width: 10, height: 10 } },
        { id: "2", box: { x: 40, y: 50, width: 10, height: 10 } },
      ],
      "top"
    );
    expect(top).toEqual([{ id: "2", dx: 0, dy: -30 }]);
  });

  it("unionBox łączy prostokąty", () => {
    expect(
      unionBox([
        { x: 0, y: 0, width: 10, height: 10 },
        { x: 20, y: 5, width: 10, height: 10 },
      ])
    ).toEqual({ x: 0, y: 0, width: 30, height: 15 });
  });
});
