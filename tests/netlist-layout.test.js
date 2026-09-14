// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { createNetlistLayout } from "../src/netlist-layout.js";

describe("netlist-layout", () => {
  it("przerywa gdy brak spisu", async () => {
    const setStatus = vi.fn();
    const api = createNetlistLayout({
      state: { netlist: { connections: [] }, lib: null, step: 5 },
      setStatus,
      currentSymNode: () => null,
      targetSheet: () => null,
    });
    const out = await api.generateSketchFromNetlist();
    expect(out).toBeNull();
    expect(setStatus).toHaveBeenCalled();
  });

  it("wstawia brakujące i trasuje na pustym arkuszu", async () => {
    const sheet = { id: "sch-1", name: "A.svg" };
    const node = {
      querySelector: () => null,
      querySelectorAll: () => [],
    };
    const inserted = [];
    const routed = [];
    const setStatus = vi.fn();
    const libSvg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    const defs = document.createElementNS("http://www.w3.org/2000/svg", "defs");
    const wd = document.createElementNS("http://www.w3.org/2000/svg", "g");
    wd.id = "WD";
    wd.setAttribute("data-inst-prefix", "WD");
    defs.appendChild(wd);
    libSvg.appendChild(defs);

    const api = createNetlistLayout({
      state: {
        active: sheet,
        lib: { svg: libSvg },
        step: 5,
        netlist: {
          connections: [
            {
              id: "1",
              from: { raw: "WD1:L", ref: "WD1", pin: "L" },
              to: { raw: "WD1:N", ref: "WD1", pin: "N" },
              net: "L",
            },
          ],
        },
      },
      currentSymNode: () => node,
      targetSheet: () => sheet,
      insertInstance: (id, opts) => {
        inserted.push({ id, ...opts });
        return { tagName: "use" };
      },
      routeConnectionBatch: (recs, opts) => {
        routed.push({ recs, opts });
        return { ok: 1, fail: 0, ortho: 1, straight: 0 };
      },
      pushUndo: vi.fn(),
      render: vi.fn(),
      setStatus,
      askChoice: async () => "library",
      selectSheet: vi.fn(),
      ensureInstancePinLabels: vi.fn(),
      getOrient: () => "landscape",
    });

    const out = await api.generateSketchFromNetlist();
    expect(inserted).toHaveLength(1);
    expect(inserted[0].id).toBe("WD");
    expect(inserted[0].ref).toBe("WD1");
    expect(inserted[0].x % 5).toBe(0);
    expect(routed).toHaveLength(1);
    expect(routed[0].opts.skipManual).toBe(true);
    expect(out.placed).toBe(1);
    expect(out.routed.ok).toBe(1);
  });
});
