/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, afterEach } from "vitest";
import { createSavePermBadge } from "../src/project-perm-ui.js";
import { markSettingsDirty, clearSettingsDirty } from "../src/project-dirty.js";

describe("createSavePermBadge + settingsDirty", () => {
  afterEach(() => {
    clearSettingsDirty();
  });

  it("badge dirty gdy tylko brudny spis (0 arkuszy)", () => {
    markSettingsDirty();
    const badgeEl = document.createElement("button");
    const labelEl = document.createElement("span");
    const api = createSavePermBadge({
      getState: () => ({ dir: {}, libHandle: null, lib: { dirty: false }, sheets: [] }),
      countDirtySheets: () => 0,
      needsPerm: async () => false,
      badgeEl,
      labelEl,
    });
    const view = api.paint(false);
    expect(view.kind).toBe("dirty");
    expect(labelEl.textContent).toBe("Niezapisane");
    expect(badgeEl.dataset.kind).toBe("dirty");
  });
});
