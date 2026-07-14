/** Cofnij / ponów — snapshot SVG aktywnego dokumentu. */

export function createHistory(deps) {
  const { state, parseSvg, buildSymbolList, currentSymNode, clearHighlight, clearSelInfo, render, setStatus, onMutate } = deps;

  function snapshot() {
    return new XMLSerializer().serializeToString(state.srcSvg);
  }

  function pushUndo() {
    if (!state.srcSvg) return;
    state.undo.push(snapshot());
    if (state.undo.length > 80) state.undo.shift();
    state.redo = [];
    if (typeof onMutate === "function") onMutate();
  }

  function restore(str) {
    const p = parseSvg(str);
    if (!p) return;
    const { doc, svg } = p;
    if (state.active === state.lib && state.lib) {
      state.lib.svg = svg;
      state.lib.doc = doc;
    } else if (state.active) {
      state.active.svg = svg;
      state.active.doc = doc;
    }
    state.srcDoc = doc;
    state.srcSvg = svg;
    state.selection = [];
    state.activeEl = null;
    state.selHandle = null;
    buildSymbolList();
    if (state.selId && !currentSymNode()) {
      state.selId = state.active && state.active.id ? state.active.id : state.symbols[0] ? state.symbols[0].id : null;
    }
    clearHighlight();
    clearSelInfo();
    render();
  }

  function doUndo() {
    if (!state.undo.length) {
      setStatus("Brak czego cofnąć.");
      return;
    }
    state.redo.push(snapshot());
    restore(state.undo.pop());
    setStatus("Cofnięto.");
  }

  function doRedo() {
    if (!state.redo.length) return;
    state.undo.push(snapshot());
    restore(state.redo.pop());
    setStatus("Ponowiono.");
  }

  return { snapshot, pushUndo, restore, doUndo, doRedo };
}
