/** Cofnij / ponów — snapshot aktywnego dokumentu, bez powielania całych <defs>. */

import { qsById } from "./dom-selectors.js";
import { SVGNS, XLINK } from "./svg-constants.js";
import { libSymbolGroups } from "./symbol-service.js";
import { status as Wstatus } from "./ui-wording.js";

export const HISTORY_LIMIT = 80;

function svgRootAttrs(svg) {
  return {
    viewBox: svg.getAttribute("viewBox") || "",
    width: svg.getAttribute("width") || "",
    height: svg.getAttribute("height") || "",
  };
}

function defsStyleText(svg) {
  return svg.querySelector("defs style")?.textContent || "";
}

function parseGroupMarkup(parseSvg, markup) {
  if (!markup) return null;
  const p = parseSvg(`<svg xmlns="${SVGNS}" xmlns:xlink="${XLINK}">${markup}</svg>`);
  return p?.svg?.firstElementChild || null;
}

function applyRootAttrs(svg, attrs) {
  if (!svg || !attrs) return;
  for (const key of ["viewBox", "width", "height"]) {
    const value = attrs[key];
    if (value) svg.setAttribute(key, value);
    else svg.removeAttribute(key);
  }
}

function applyDefsStyle(svg, styleText) {
  let defs = svg.querySelector("defs");
  if (!defs) {
    defs = svg.ownerDocument.createElementNS(SVGNS, "defs");
    svg.insertBefore(defs, svg.firstChild);
  }
  if (styleText == null) return;
  let style = defs.querySelector("style");
  if (!style) {
    style = svg.ownerDocument.createElementNS(SVGNS, "style");
    defs.insertBefore(style, defs.firstChild);
  }
  style.textContent = styleText;
}

function replaceOrInsert(parent, prev, next, before) {
  if (!next) return;
  if (prev) prev.replaceWith(next);
  else if (before) parent.insertBefore(next, before);
  else parent.appendChild(next);
}

export function snapshotByteSize(snap) {
  if (snap == null) return 0;
  if (typeof snap === "string") return snap.length;
  return JSON.stringify(snap).length;
}

/**
 * Zapisuje tylko to, co undo musi przywrócić:
 * arkusz → grupa sch-* (+ style), nie klony symboli w defs;
 * biblioteka → aktualny symbol + lista id (add/delete bez kopii całej E-00).
 */
export function captureActiveSnapshot(state, focusNode) {
  const svg = state.srcSvg;
  if (!svg) return null;
  const onLib = !!(state.active && state.lib && state.active === state.lib);

  if (onLib) {
    const focus = focusNode || null;
    if (!focus) {
      return { v: 1, kind: "full", markup: new XMLSerializer().serializeToString(svg) };
    }
    return {
      v: 1,
      kind: "lib",
      attrs: svgRootAttrs(svg),
      style: defsStyleText(svg),
      symbolIds: libSymbolGroups(svg).map((g) => g.id),
      focusId: focus.id || state.selId || null,
      focusMarkup: focus.outerHTML,
    };
  }

  const body = focusNode || (state.active?.id ? qsById(svg, state.active.id) : null);
  if (!body || body === svg) {
    return { v: 1, kind: "full", markup: new XMLSerializer().serializeToString(svg) };
  }
  return {
    v: 1,
    kind: "sheet",
    attrs: svgRootAttrs(svg),
    style: defsStyleText(svg),
    bodyId: body.id || null,
    bodyMarkup: body.outerHTML,
  };
}

export function applyActiveSnapshot(snap, { state, parseSvg }) {
  if (snap == null) return false;
  if (typeof snap === "string" || snap.kind === "full") {
    const p = parseSvg(typeof snap === "string" ? snap : snap.markup);
    if (!p) return false;
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
    return true;
  }

  const svg = state.srcSvg;
  if (!svg) return false;

  if (snap.kind === "lib") {
    const next = snap.focusMarkup ? parseGroupMarkup(parseSvg, snap.focusMarkup) : null;
    if (snap.focusMarkup && !next) return false;
    applyRootAttrs(svg, snap.attrs);
    applyDefsStyle(svg, snap.style);
    const defs = svg.querySelector("defs") || svg;
    const keep = new Set(snap.symbolIds || []);
    libSymbolGroups(svg).forEach((g) => {
      if (!keep.has(g.id)) g.remove();
    });
    if (next) {
      const prev = qsById(svg, snap.focusId) || (next.id ? qsById(svg, next.id) : null);
      const ids = snap.symbolIds || [];
      const idx = ids.indexOf(snap.focusId);
      const afterId = idx >= 0 ? ids[idx + 1] : null;
      const before = afterId ? libSymbolGroups(svg).find((g) => g.id === afterId) : null;
      replaceOrInsert(defs, prev, next, before || null);
    }
    return true;
  }

  if (snap.kind === "sheet") {
    const next = parseGroupMarkup(parseSvg, snap.bodyMarkup);
    if (!next) return false;
    applyRootAttrs(svg, snap.attrs);
    applyDefsStyle(svg, snap.style);
    const prev = (snap.bodyId && qsById(svg, snap.bodyId)) || null;
    replaceOrInsert(svg, prev, next, null);
    return true;
  }

  return false;
}

export function createHistory(deps) {
  const {
    state,
    parseSvg,
    buildSymbolList,
    currentSymNode,
    clearHighlight,
    clearSelInfo,
    render,
    setStatus,
    onMutate,
  } = deps;

  function snapshot() {
    return captureActiveSnapshot(state, currentSymNode());
  }

  function pushUndo() {
    const snap = snapshot();
    if (!snap) return;
    state.undo.push(snap);
    if (state.undo.length > HISTORY_LIMIT) state.undo.shift();
    state.redo = [];
    if (typeof onMutate === "function") onMutate();
  }

  function restore(snap) {
    if (!applyActiveSnapshot(snap, { state, parseSvg })) return;
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
      setStatus(Wstatus.undoEmpty);
      return;
    }
    state.redo.push(snapshot());
    restore(state.undo.pop());
    setStatus(Wstatus.undone);
  }

  function doRedo() {
    if (!state.redo.length) return;
    state.undo.push(snapshot());
    restore(state.redo.pop());
    setStatus(Wstatus.redone);
  }

  return { snapshot, pushUndo, restore, doUndo, doRedo };
}
