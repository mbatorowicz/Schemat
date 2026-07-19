import { describe, it, expect } from "vitest";
import { buildAlignUnits, resolveAlignElements, unionBox, computeAlignDeltas } from "../src/selection-align.js";

describe("selection-align", () => {
  it("buildAlignUnits grupuje po ref gdy ≥2 różne ref", () => {
    const a = { id: "a" };
    const b = { id: "b" };
    const c = { id: "c" };
    const units = buildAlignUnits([a, b, c], (el) => (el.id === "c" ? "K2" : "K1"));
    expect(units).toHaveLength(2);
    const k1 = units.find((u) => u.ref === "K1");
    expect(k1.members).toEqual([a, b]);
    expect(units.find((u) => u.ref === "K2").members).toEqual([c]);
  });

  it("buildAlignUnits nie scala etykiet jednego ref — każdy element osobno", () => {
    const t1 = { id: "t1" };
    const t2 = { id: "t2" };
    const t3 = { id: "t3" };
    const units = buildAlignUnits([t1, t2, t3], () => "Q1");
    expect(units).toHaveLength(3);
    expect(units.every((u) => u.members.length === 1)).toBe(true);
  });

  it("resolveAlignElements expanduje tylko przy wielu ref", () => {
    const a = { id: "a" };
    const b = { id: "b" };
    const expand = (node, els) => [...els, { id: "extra" }];
    const same = resolveAlignElements([a, b], {
      node: {},
      instanceRefOf: () => "Q1",
      expandToInstanceMembers: expand,
    });
    expect(same).toEqual([a, b]);

    const multi = resolveAlignElements([a, b], {
      node: {},
      instanceRefOf: (el) => (el.id === "a" ? "Q1" : "Q2"),
      expandToInstanceMembers: expand,
    });
    expect(multi.map((e) => e.id)).toEqual(["a", "b", "extra"]);
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
