// @vitest-environment jsdom

import { describe, expect, it, vi } from "vitest";
import { createNetlistUi } from "../src/netlist-ui.js";

function mountEditorDom() {
  document.body.innerHTML = `
    <table><tbody id="netlistEditorBody"></tbody></table>
    <input id="neId" />
    <input id="neFrom" />
    <input id="neTo" />
    <input id="neNet" />
    <input id="neWire" />
    <input id="neLength" />
    <input id="neNotes" />
  `;
}

describe("fillEditorTable XSS", () => {
  it("payload w net nie tworzy węzła img — tekst zostaje widoczny", () => {
    mountEditorDom();
    const payload = '<img src=x onerror=alert(1)>';
    const state = {
      sheets: [],
      netlist: {
        connections: [
          {
            id: "C1",
            from: "K1:1",
            to: "K2:2",
            net: payload,
            wire: "LiYCY",
            length: "1 m",
          },
        ],
      },
      selectedConnId: "",
    };
    const ui = createNetlistUi({
      getState: () => state,
      setStatus: vi.fn(),
      connectionDiagnostics: () => ({ ok: false, reason: payload }),
      collectNetlistProposals: () => [],
      saveProject: vi.fn(),
      getSettingsCfg: () => null,
      getTargetSheet: () => null,
      sheetWireHealth: () => ({ ok: true }),
      promoteSelectionToConnection: vi.fn(),
      currentSymNode: () => null,
      selectSheetElement: vi.fn(),
      applyConnectionRecord: vi.fn(),
    });
    ui.openNetlistEditor();
    const tbody = document.getElementById("netlistEditorBody");
    expect(tbody.querySelector("img")).toBeNull();
    expect(tbody.textContent).toContain(payload);
    expect(tbody.querySelectorAll("td").length).toBe(7);
  });
});
