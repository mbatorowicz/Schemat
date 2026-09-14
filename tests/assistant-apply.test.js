// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { createAssistantApply } from "../src/assistant-apply.js";
import { parseEndpoint } from "../src/netlist-model.js";

describe("assistant-apply", () => {
  it("wstawia symbol przez insertUse", async () => {
    const calls = [];
    const node = document.createElementNS("http://www.w3.org/2000/svg", "g");
    const { applyProposal } = createAssistantApply({
      getState: () => ({ netlist: { connections: [] } }),
      getSheetNode: () => node,
      catalogIds: () => ["WD"],
      insertUse: (id, _s, opts) => {
        calls.push({ id, opts });
        return document.createElementNS("http://www.w3.org/2000/svg", "use");
      },
      afterApply: () => calls.push("after"),
    });
    const r = await applyProposal({ type: "insert_symbol", symbolId: "WD", ref: "WD1", x: 5, y: 7 });
    expect(r.ok).toBe(true);
    expect(calls[0]).toEqual({ id: "WD", opts: { ref: "WD1", x: 5, y: 7 } });
    expect(calls).toContain("after");
  });

  it("dodaje połączenie z kolejnym id", async () => {
    const recs = [];
    const state = {
      netlist: {
        connections: [{ id: "1", from: parseEndpoint("A:1"), to: parseEndpoint("B:1"), net: "L" }],
      },
    };
    const node = document.createElementNS("http://www.w3.org/2000/svg", "g");
    const { applyProposal } = createAssistantApply({
      getState: () => state,
      getSheetNode: () => node,
      catalogIds: () => [],
      applyConnectionRecord: (rec) => recs.push(rec),
      ensureNetlist: () => {},
    });
    const r = await applyProposal({ type: "add_connection", from: "WD1:L", to: "X1:1", net: "L" });
    expect(r.ok).toBe(true);
    expect(recs[0].id).toBe("2");
    expect(recs[0].from).toBe("WD1:L");
  });

  it("podświetla instancję po data-ref", async () => {
    const node = document.createElementNS("http://www.w3.org/2000/svg", "g");
    const use = document.createElementNS("http://www.w3.org/2000/svg", "use");
    use.setAttribute("data-ref", "WD1");
    node.appendChild(use);
    let selected = [];
    const { applyProposal } = createAssistantApply({
      getSheetNode: () => node,
      catalogIds: () => [],
      selectElements: (els) => {
        selected = els;
      },
    });
    const r = await applyProposal({ type: "highlight", refs: ["WD1"] });
    expect(r.ok).toBe(true);
    expect(selected).toContain(use);
  });

  it("odrzuca update nieistniejącego połączenia", async () => {
    const node = document.createElementNS("http://www.w3.org/2000/svg", "g");
    const { applyProposal } = createAssistantApply({
      getState: () => ({ netlist: { connections: [] } }),
      getSheetNode: () => node,
      catalogIds: () => [],
      applyConnectionRecord: () => {},
      ensureNetlist: () => {},
    });
    const r = await applyProposal({ type: "update_connection", id: "9", patch: { net: "PE" } });
    expect(r.ok).toBe(false);
  });
});
