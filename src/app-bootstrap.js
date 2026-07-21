/**
 * Kolejność inicjalizacji edytora — scena DOM musi istnieć przed modułami czytającymi gHost.
 */

export function initEditorScene(scene, { applyView, drawGrid }) {
  scene.build(applyView);
  drawGrid();
}

/**
 * Moduły wymagające klonu podglądu (getHost) — wołaj dopiero po initEditorScene().
 */
export function wireSceneDependentModules({ wireNetlistRouting, wireSelectionModel }) {
  wireNetlistRouting();
  wireSelectionModel();
}

/**
 * Pełna sekwencja synchroniczna przed boot() async.
 */
export function bootstrapEditorSync(ctx) {
  const {
    injectIcons,
    initConnMetaModal,
    wireHistory,
    wireConnModel,
    wireProjectMigrate,
    wireRenderPipeline,
    scene,
    applyView,
    drawGrid,
    wireNetlistRouting,
    wireSelectionModel,
    syncSelectionToolbar,
    syncToolbarContext,
    refreshNetlistUI,
    routeConnButton,
    routeAllConnButton,
    breakPointButton,
    toggleBreakEditMode,
  } = ctx;

  injectIcons();
  initConnMetaModal();
  wireHistory();
  wireConnModel();
  wireProjectMigrate();
  wireRenderPipeline();
  initEditorScene(scene, { applyView, drawGrid });
  wireSceneDependentModules({ wireNetlistRouting, wireSelectionModel });
  if (routeConnButton && ctx.getRouteSelectedConnection) {
    routeConnButton.onclick = () => {
      const fn = ctx.getRouteSelectedConnection();
      if (fn) fn();
    };
  }
  if (routeAllConnButton && ctx.getRouteAllConnections) {
    routeAllConnButton.onclick = () => {
      const fn = ctx.getRouteAllConnections();
      if (fn) fn();
    };
  }
  if (breakPointButton && typeof toggleBreakEditMode === "function") {
    breakPointButton.onclick = () => toggleBreakEditMode();
  }
  syncSelectionToolbar();
  syncToolbarContext();
  if (typeof refreshNetlistUI === "function") refreshNetlistUI();
}
