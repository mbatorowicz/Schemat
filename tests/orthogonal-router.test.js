import { describe, it, expect } from "vitest";
import { simplify, escapePoint, route, countTurns } from "../src/orthogonal-router.js";

function pathHitsRect(path, rect) {
  for (let i = 1; i < path.length; i++) {
    const a = path[i - 1];
    const b = path[i];
    const steps = 20;
    for (let s = 1; s < steps; s++) {
      const t = s / steps;
      const x = a.x + (b.x - a.x) * t;
      const y = a.y + (b.y - a.y) * t;
      if (x > rect.x && x < rect.x + rect.width && y > rect.y && y < rect.y + rect.height) return true;
    }
  }
  return false;
}

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
      end: { x: 40, y: 30 },
      startDir: "E",
      endDir: "W",
      step: 5,
      obstacles: [],
    });
    expect(path).toBeTruthy();
    expect(path.length).toBeGreaterThanOrEqual(2);
    expect(path[0]).toEqual({ x: 0, y: 0 });
    expect(path[path.length - 1]).toEqual({ x: 40, y: 30 });
  });

  it("1 łamanie: startDir=E, endDir=N", () => {
    // Pin u dołu patrzy w górę (N) — podejście z góry; jedno L wystarczy
    const path = route({
      start: { x: 0, y: 0 },
      end: { x: 40, y: 30 },
      startDir: "E",
      endDir: "N",
      step: 5,
      obstacles: [],
    });
    expect(path).toBeTruthy();
    expect(countTurns(path)).toBe(1);
  });

  it("early-align: bez zbędnego jogu down-then-up przed pinem", () => {
    const path = route({
      start: { x: 20, y: 40 },
      end: { x: 50, y: 40 },
      startDir: "E",
      endDir: "W",
      step: 5,
      obstacles: [],
    });
    expect(path).toBeTruthy();
    expect(path[0]).toEqual({ x: 20, y: 40 });
    expect(path[path.length - 1]).toEqual({ x: 50, y: 40 });
    const ys = path.map((p) => p.y);
    expect(Math.max(...ys) - Math.min(...ys)).toBeLessThanOrEqual(0.01);
    expect(countTurns(path)).toBe(0);
  });

  it("nie zwraca ścieżki przez środek przeszkody (null lub omija)", () => {
    const wall = { x: 15, y: -5, width: 10, height: 50 };
    const path = route({
      start: { x: 0, y: 20 },
      end: { x: 50, y: 20 },
      startDir: "E",
      endDir: "W",
      step: 5,
      obstacles: [wall],
    });
    if (path) {
      expect(pathHitsRect(path, { x: 18, y: 10, width: 4, height: 20 })).toBe(false);
    } else {
      expect(path).toBeNull();
    }
  });

  it("offset lane: omija korytarz obcego przewodu", () => {
    // Pionowy korytarz na x=20 (jak trasa L) — N musi iść bokiem
    const corridor = { x: 17, y: 0, width: 6, height: 100 };
    const path = route({
      start: { x: 0, y: 10 },
      end: { x: 0, y: 80 },
      startDir: "S",
      endDir: "N",
      step: 5,
      obstacles: [corridor],
    });
    // Ta geometria nie przecina korytarza — drugi przypadek:
    const path2 = route({
      start: { x: 0, y: 50 },
      end: { x: 60, y: 50 },
      startDir: "E",
      endDir: "W",
      step: 5,
      obstacles: [corridor],
    });
    expect(path2).toBeTruthy();
    expect(pathHitsRect(path2, { x: 18, y: 45, width: 4, height: 10 })).toBe(false);
    const midYs = path2.filter((p) => p.x > 10 && p.x < 50).map((p) => p.y);
    // równoległy przebieg z offsetem ≠ 50 albo omija łukiem
    expect(path2.some((p) => Math.abs(p.y - 50) >= 5) || countTurns(path2) >= 1).toBe(true);
    expect(path === null || !pathHitsRect(path, corridor)).toBe(true);
  });

  it("countTurns liczy zakręty", () => {
    expect(
      countTurns([
        { x: 0, y: 0 },
        { x: 10, y: 0 },
        { x: 10, y: 10 },
      ])
    ).toBe(1);
  });

  it("pin w bbox symbolu — nadal znajduje trasę (regresja 0/16)", () => {
    // Jak na arkuszu: pin na brzegu symbolu + pad keep-out; escape musi wyjść z tunelu
    const path = route({
      start: { x: 10, y: 20 },
      end: { x: 80, y: 20 },
      startDir: "E",
      endDir: "W",
      step: 5,
      obstacles: [
        { x: 0, y: 0, width: 28, height: 40 },
        { x: 70, y: 0, width: 28, height: 40 },
      ],
    });
    expect(path).toBeTruthy();
    expect(path[0]).toEqual({ x: 10, y: 20 });
    expect(path[path.length - 1]).toEqual({ x: 80, y: 20 });
  });
});
