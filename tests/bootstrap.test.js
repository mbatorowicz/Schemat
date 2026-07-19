import { describe, it, expect, vi } from "vitest";
import { bootstrapEditorSync } from "../src/app-bootstrap.js";

describe("app-bootstrap", () => {
  it("podpina btnRouteConn po wireNetlistRouting (getter, nie snapshot undefined)", () => {
    let routeFn = null;
    const btn = { onclick: null };
    bootstrapEditorSync({
      injectIcons: () => {},
      initConnMetaModal: () => {},
      wireHistory: () => {},
      wireConnModel: () => {},
      wireProjectMigrate: () => {},
      wireRenderPipeline: () => {},
      scene: { build: () => {} },
      applyView: () => {},
      drawGrid: () => {},
      wireNetlistRouting: () => {
        routeFn = vi.fn();
      },
      wireSelectionModel: () => {},
      syncSelectionToolbar: () => {},
      syncToolbarContext: () => {},
      refreshNetlistUI: () => {},
      routeConnButton: btn,
      getRouteSelectedConnection: () => routeFn,
    });
    expect(typeof btn.onclick).toBe("function");
    btn.onclick();
    expect(routeFn).toHaveBeenCalledOnce();
  });
});
