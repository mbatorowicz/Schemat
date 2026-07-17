// @vitest-environment jsdom

import { describe, it, expect, vi } from "vitest";
import { beginListInlineRename } from "../src/sidebar-lists.js";
import { applySymbolDisplayName, SYMBOL_NAME_ATTR } from "../src/symbol-save.js";

describe("beginListInlineRename", () => {
  it("zatwierdza Enterem i anuluje Escape", () => {
    const label = document.createElement("span");
    label.textContent = "Stara";
    document.body.appendChild(label);
    const onCommit = vi.fn();
    const onCancel = vi.fn();
    beginListInlineRename({ labelEl: label, initialValue: "Stara", onCommit, onCancel });
    const inp = label.querySelector("input");
    expect(inp).toBeTruthy();
    inp.value = "Nowa";
    inp.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
    expect(onCommit).toHaveBeenCalledWith("Nowa");
    expect(onCancel).not.toHaveBeenCalled();

    label.textContent = "Stara";
    beginListInlineRename({ labelEl: label, initialValue: "Stara", onCommit, onCancel });
    const inp2 = label.querySelector("input");
    inp2.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    expect(onCancel).toHaveBeenCalledOnce();
  });
});

describe("applySymbolDisplayName", () => {
  it("zapisuje data-symbol-name", () => {
    const attrs = { [SYMBOL_NAME_ATTR]: "A" };
    const sym = {
      id: "B",
      node: {
        id: "B",
        getAttribute: (n) => attrs[n] ?? null,
        setAttribute: (n, v) => {
          attrs[n] = v;
        },
      },
    };
    const res = applySymbolDisplayName(sym, "Bezpieczeństwo");
    expect(res.ok).toBe(true);
    expect(attrs[SYMBOL_NAME_ATTR]).toBe("Bezpieczeństwo");
    expect(res.prev).toBe("A");
  });
});
