// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import {
  buildAssistantContext,
  collectSheetInstances,
  collectSheetConnectors,
  compactConnections,
  collectElementSummaries,
  resolveAssistantSheet,
  formatContextForPrompt,
} from "../src/assistant-context.js";
import { parseEndpoint } from "../src/netlist-model.js";

function svgWithSheet() {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
  g.id = "sch-1";
  g.setAttribute("data-sheet-title", "Arkusz");
  const use = document.createElementNS("http://www.w3.org/2000/svg", "use");
  use.setAttribute("href", "#WD");
  use.setAttribute("data-ref", "WD1");
  use.setAttribute("data-sym", "WD");
  use.setAttribute("x", "40");
  use.setAttribute("y", "80");
  const conn = document.createElementNS("http://www.w3.org/2000/svg", "g");
  conn.setAttribute("data-role", "conn");
  conn.setAttribute("data-kind", "lead");
  conn.setAttribute("data-ref", "WD1");
  conn.setAttribute("data-pin", "L");
  g.append(use, conn);
  svg.appendChild(g);
  return { svg, g };
}

describe("assistant-context", () => {
  it("resolveAssistantSheet pomija bibliotekę", () => {
    const lib = { name: "lib.svg" };
    const sheet = { name: "a.svg", id: "sch-1" };
    expect(resolveAssistantSheet({ active: lib, lib, lastSheet: sheet })).toBe(sheet);
    expect(resolveAssistantSheet({ active: sheet, lib, lastSheet: sheet })).toBe(sheet);
  });

  it("zbiera instancje i złącza", () => {
    const { g } = svgWithSheet();
    expect(collectSheetInstances(g)).toEqual([{ ref: "WD1", symbolId: "WD", x: 40, y: 80 }]);
    expect(collectSheetConnectors(g)).toEqual([{ kind: "lead", ref: "WD1", pin: "L" }]);
    expect(collectElementSummaries(g).length).toBe(2);
  });

  it("compactConnections spłaszcza endpointy", () => {
    const list = compactConnections([
      {
        id: "1",
        from: parseEndpoint("WD1:L"),
        to: parseEndpoint("X1:3"),
        net: "L",
        wire: "YDY",
        length: "",
        notes: "",
      },
    ]);
    expect(list[0]).toMatchObject({ id: "1", from: "WD1:L", to: "X1:3", net: "L" });
  });

  it("buildAssistantContext składa JSON arkusza", () => {
    const { svg, g } = svgWithSheet();
    const sheet = { name: "Arkusz.svg", id: "sch-1", svg };
    const ctx = buildAssistantContext({
      state: {
        dir: { name: "proj" },
        active: sheet,
        lib: { name: "E-00.svg", svg: document.createElementNS("http://www.w3.org/2000/svg", "svg") },
        srcSvg: svg,
        netlist: {
          connections: [
            {
              id: "1",
              from: parseEndpoint("WD1:L"),
              to: parseEndpoint("X1:1"),
              net: "L",
              wire: "do ustalenia",
              length: "",
              notes: "",
            },
          ],
        },
        selection: [g.querySelector("use")],
        selectedConnId: "1",
        zoom: 2,
        panX: 0,
        panY: 0,
      },
      settingsCfg: { norm: "EN 60204-1", maker: "X" },
      connectionDiagnostics: () => ({ ok: true, reason: "" }),
    });
    expect(ctx.project.norm).toBe("EN 60204-1");
    expect(ctx.activeSheet.instances[0].ref).toBe("WD1");
    expect(ctx.activeSheet.connections[0].from).toBe("WD1:L");
    expect(ctx.selection.refs).toContain("WD1");
    expect(formatContextForPrompt(ctx)).toContain("EN 60204-1");
  });
});
