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

  it("podpina btnRouteAllConn", () => {
    let routeAllFn = null;
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
        routeAllFn = vi.fn();
      },
      wireSelectionModel: () => {},
      syncSelectionToolbar: () => {},
      syncToolbarContext: () => {},
      refreshNetlistUI: () => {},
      routeAllConnButton: btn,
      getRouteAllConnections: () => routeAllFn,
    });
    expect(typeof btn.onclick).toBe("function");
    btn.onclick();
    expect(routeAllFn).toHaveBeenCalledOnce();
  });

  it("podpina btnBreakPoint", () => {
    const toggle = vi.fn();
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
      wireNetlistRouting: () => {},
      wireSelectionModel: () => {},
      syncSelectionToolbar: () => {},
      syncToolbarContext: () => {},
      refreshNetlistUI: () => {},
      breakPointButton: btn,
      toggleBreakEditMode: toggle,
    });
    expect(typeof btn.onclick).toBe("function");
    btn.onclick();
    expect(toggle).toHaveBeenCalledOnce();
  });

  it("wołuje wireDrawMode po wireNetlistRouting, nie w środku netlisty", () => {
    const order = [];
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
      wireNetlistRouting: () => order.push("netlist"),
      wireSelectionModel: () => order.push("selection"),
      wireDrawMode: () => order.push("draw"),
      syncSelectionToolbar: () => {},
      syncToolbarContext: () => {},
      refreshNetlistUI: () => {},
    });
    expect(order).toEqual(["netlist", "selection", "draw"]);
  });
});
