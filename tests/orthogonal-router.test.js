import { describe, it, expect } from "vitest";
import { simplify, escapePoint, route } from "../src/orthogonal-router.js";

describe("orthogonal-router", () => {
  it("upraszcza współliniowe punkty", () => {
    const pts = simplify([
      { x: 0, y: 0 },
      { x: 10, y: 0 },
      { x: 20, y: 0 },
    ]);
    expect(pts).toEqual([
      { x: 0, y: 0 },
      { x: 20, y: 0 },
    ]);
  });

  it("escapePoint przesuwa w kierunku E", () => {
    expect(escapePoint({ x: 0, y: 0 }, "E", 10)).toEqual({ x: 10, y: 0 });
  });

  it("route zwraca ortogonalną ścieżkę bez przeszkód", () => {
    const path = route({
      start: { x: 0, y: 0 },
      end: { x: 20, y: 20 },
      startDir: "E",
      endDir: "W",
      step: 5,
      obstacles: [],
    });
    expect(path.length).toBeGreaterThanOrEqual(2);
    expect(path[0]).toEqual({ x: 0, y: 0 });
    expect(path[path.length - 1]).toEqual({ x: 20, y: 20 });
  });
});
