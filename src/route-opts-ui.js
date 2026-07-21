/**
 * Opcje przed autotrasowaniem (grubość).
 */

export function defaultRouteOpts() {
  return { strokeWidth: "" };
}

/**
 * @param {object} state — mutuje state.routeOpts
 * @param {Document} [doc]
 */
export function initRouteOptsUi(state, doc = document) {
  if (!state.routeOpts) state.routeOpts = defaultRouteOpts();
  const strokeSel = doc.getElementById("routeOptStroke");
  const sync = () => {
    if (!state.routeOpts) state.routeOpts = defaultRouteOpts();
    if (strokeSel) state.routeOpts.strokeWidth = strokeSel.value || "";
    else state.routeOpts.strokeWidth = state.routeOpts.strokeWidth || "";
  };
  if (strokeSel) {
    strokeSel.value = state.routeOpts?.strokeWidth || "";
    strokeSel.onchange = sync;
  }
  sync();
}
