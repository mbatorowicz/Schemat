/**
 * Warstwy SVG sceny edycji — jeden obiekt z getterami (bez przechwytywania referencji w closure).
 *
 * Moduły zależne (selection-model, netlist-routing) dostają getHost: () => scene.host,
 * nigdy surowy element z momentu wire().
 */

export function createStageLayers(stageEl, svgNs) {
  const refs = {
    world: null,
    grid: null,
    host: null,
    sel: null,
    handles: null,
    defs: null,
  };

  function build(afterBuild) {
    stageEl.innerHTML = "";
    refs.defs = document.createElementNS(svgNs, "defs");
    stageEl.appendChild(refs.defs);
    refs.world = document.createElementNS(svgNs, "g");
    refs.world.setAttribute("id", "world");
    stageEl.appendChild(refs.world);
    refs.grid = document.createElementNS(svgNs, "g");
    refs.world.appendChild(refs.grid);
    refs.host = document.createElementNS(svgNs, "g");
    refs.world.appendChild(refs.host);
    refs.sel = document.createElementNS(svgNs, "g");
    refs.world.appendChild(refs.sel);
    refs.handles = document.createElementNS(svgNs, "g");
    refs.world.appendChild(refs.handles);
    if (typeof afterBuild === "function") afterBuild();
  }

  return {
    get world() {
      return refs.world;
    },
    get grid() {
      return refs.grid;
    },
    get host() {
      return refs.host;
    },
    get sel() {
      return refs.sel;
    },
    get handles() {
      return refs.handles;
    },
    get defs() {
      return refs.defs;
    },
    /** Klon aktywnego symbolu/arkusza w gHost (null gdy pusto). */
    get hostRoot() {
      return refs.host?.firstElementChild ?? null;
    },
    build,
  };
}

/** Wspólny accessor klonu podglądu — używany w modułach z getHost. */
export function hostRootFrom(getHost) {
  const host = typeof getHost === "function" ? getHost() : getHost;
  return host?.firstElementChild ?? null;
}
