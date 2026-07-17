import { describe, it, expect } from "vitest";
import { summarizeNetlistHealth, routeBlockReason } from "../src/netlist-validate.js";

describe("summarizeNetlistHealth", () => {
  it("liczy OK i błędy", () => {
    const netlist = {
      connections: [{ id: "A" }, { id: "B" }, { id: "C" }],
    };
    const diag = (r) =>
      r.id === "B" ? { ok: false, reason: "brak pinu" } : { ok: true, reason: "" };
    const h = summarizeNetlistHealth(netlist, diag);
    expect(h.total).toBe(3);
    expect(h.ok).toBe(2);
    expect(h.bad).toBe(1);
    expect(h.issues[0].id).toBe("B");
    expect(h.summary).toContain("1/3");
  });

  it("pusty spis", () => {
    const h = summarizeNetlistHealth({ connections: [] }, () => ({ ok: true }));
    expect(h.summary).toMatch(/Brak połączeń/);
  });
});

describe("routeBlockReason", () => {
  it("zwraca powód gdy niespójne", () => {
    expect(routeBlockReason({ id: "X" }, () => ({ ok: false, reason: "brak" }))).toBe("brak");
    expect(routeBlockReason({ id: "X" }, () => ({ ok: true }))).toBe("");
  });
});
