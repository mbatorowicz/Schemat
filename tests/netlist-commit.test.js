import { afterEach, describe, expect, it, vi } from "vitest";
import { createNetlistUi } from "../src/netlist-ui.js";
import { clearSettingsDirty, isSettingsDirty } from "../src/project-dirty.js";

afterEach(() => {
  clearSettingsDirty();
});

function uiFor(state, extras = {}) {
  const saveProjectSettings = extras.saveProjectSettings || vi.fn();
  const saveProject = extras.saveProject || vi.fn();
  const settingsCfg = extras.settingsCfg || { sheetConnections: {} };
  const sheet = extras.sheet || state.sheets?.[0] || { id: "sch-1", name: "A.svg" };
  const ui = createNetlistUi({
    getState: () => state,
    setStatus: vi.fn(),
    connectionDiagnostics: () => ({ ok: true, reason: "" }),
    collectNetlistProposals: () => [],
    saveProject,
    getSettingsCfg: () => settingsCfg,
    saveProjectSettings,
    getTargetSheet: () => sheet,
    sheetWireHealth: () => ({ ok: true }),
    promoteSelectionToConnection: vi.fn(),
    currentSymNode: () => null,
    selectSheetElement: vi.fn(),
    applyConnectionRecord: vi.fn(),
  });
  return { ui, saveProject, saveProjectSettings, settingsCfg, sheet };
}

describe("commitNetlist", () => {
  it("nie woła saveProjectSettings; zapala settingsDirty i cache", () => {
    const sheet = { id: "sch-1", name: "A.svg" };
    const state = { sheets: [sheet], lastSheet: sheet, netlist: { connections: [] } };
    const { ui, saveProject, saveProjectSettings } = uiFor(state, { sheet });
    ui.commitNetlist();
    expect(saveProjectSettings).not.toHaveBeenCalled();
    expect(saveProject).toHaveBeenCalledTimes(1);
    expect(isSettingsDirty()).toBe(true);
  });
});
