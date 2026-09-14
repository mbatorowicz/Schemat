/**
 * Zwięzły kontekst arkusza dla pomocnika AI — bez pełnego SVG projektu.
 */
import { catalogFromLibrary } from "./symbol-from-ref.js";
import { auditSymbolsOnSheet } from "./symbol-service.js";
import { summarizeNetlistHealth } from "./netlist-validate.js";
import { getStoredConnections } from "./sheet-connections.js";
import {
  schematicSheetChildren,
  sheetElementListLabel,
  instanceRefOf,
  isConnGroupEl,
  sheetElementKind,
} from "./sheet-elements.js";
import { endpointRaw, normalizeConnection } from "./netlist-model.js";
import { sheetDisplayTitle } from "./sheet-catalog.js";
import { qsById } from "./dom-selectors.js";
import { sheetKey } from "./sheet-persistence.js";

export const MAX_ELEMENT_SUMMARIES = 80;
export const MAX_CATALOG = 120;

/**
 * Arkusz, nad którym pracuje konstruktor (nie biblioteka symboli).
 * @param {{ active?: object, lib?: object, lastSheet?: object }|null} state
 */
export function resolveAssistantSheet(state) {
  if (!state) return null;
  if (state.active && state.active !== state.lib) return state.active;
  return state.lastSheet || null;
}

/**
 * @param {object|null} state
 * @param {object|null} [sheet]
 */
export function resolveAssistantSheetNode(state, sheet) {
  const sh = sheet || resolveAssistantSheet(state);
  if (!sh?.id) return null;
  if (state?.srcSvg) {
    const n = qsById(state.srcSvg, sh.id);
    if (n) return n;
  }
  if (sh.svg) return qsById(sh.svg, sh.id);
  return null;
}

function numAttr(el, a) {
  const v = el?.getAttribute?.(a);
  if (v == null || v === "") return null;
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : null;
}

/** Instancje `<use>` na arkuszu. */
export function collectSheetInstances(sheetNode) {
  if (!sheetNode?.querySelectorAll) return [];
  const out = [];
  sheetNode.querySelectorAll("use").forEach((el) => {
    const ref = (el.getAttribute("data-ref") || "").trim();
    const symbolId = (el.getAttribute("data-sym") || "").trim();
    if (!ref && !symbolId) return;
    out.push({
      ref,
      symbolId,
      x: numAttr(el, "x"),
      y: numAttr(el, "y"),
    });
  });
  return out;
}

/** Złącza point/lead. */
export function collectSheetConnectors(sheetNode) {
  if (!sheetNode?.querySelectorAll) return [];
  return [...sheetNode.querySelectorAll('[data-role="conn"]')].map((el) => ({
    kind: (el.getAttribute("data-kind") || "").trim(),
    ref: (el.getAttribute("data-ref") || "").trim(),
    pin: (el.getAttribute("data-pin") || "").trim(),
  }));
}

export function compactConnections(connections) {
  return (connections || []).map((r) => {
    const n = normalizeConnection(r);
    return {
      id: n.id,
      from: endpointRaw(n.from),
      to: endpointRaw(n.to),
      net: n.net,
      wire: n.wire,
      length: n.length,
      notes: n.notes,
    };
  });
}

export function collectElementSummaries(sheetNode, limit = MAX_ELEMENT_SUMMARIES) {
  const children = schematicSheetChildren(sheetNode);
  return children.slice(0, Math.max(0, limit)).map((el, i) => ({
    kind: sheetElementKind(el),
    ref: instanceRefOf(el),
    label: sheetElementListLabel(el, i),
    conn: isConnGroupEl(el),
  }));
}

function compactCatalog(libSvg) {
  return catalogFromLibrary(libSvg)
    .slice(0, MAX_CATALOG)
    .map((s) => ({
      id: s.id,
      prefix: s.prefix,
      name: s.name,
    }));
}

export function selectionSummary(state) {
  const els = Array.isArray(state?.selection) ? state.selection : [];
  const refs = [...new Set(els.map((el) => instanceRefOf(el)).filter(Boolean))];
  const pins = els
    .filter((el) => el?.getAttribute?.("data-role") === "conn")
    .map((el) => ({
      ref: (el.getAttribute("data-ref") || "").trim(),
      pin: (el.getAttribute("data-pin") || "").trim(),
    }));
  return {
    count: els.length,
    refs,
    pins,
    connId: state?.selectedConnId || "",
    labels: els.slice(0, 8).map((el, i) => sheetElementListLabel(el, i)),
  };
}

function okDiagnostics() {
  return { ok: true, reason: "" };
}

/**
 * @param {{
 *   state?: object,
 *   settingsCfg?: object,
 *   connectionDiagnostics?: (record: object) => { ok: boolean, reason?: string },
 *   sheetNode?: Element|null,
 * }} [opts]
 */
export function buildAssistantContext(opts = {}) {
  const state = opts.state || {};
  const settingsCfg = opts.settingsCfg || {};
  const sheet = resolveAssistantSheet(state);
  const sheetNode = opts.sheetNode || resolveAssistantSheetNode(state, sheet);
  const catalog = compactCatalog(state.lib?.svg);
  const stored = sheet ? getStoredConnections(settingsCfg, sheet) : [];
  const connections = state.netlist?.connections?.length ? state.netlist.connections : stored;
  const diag = typeof opts.connectionDiagnostics === "function" ? opts.connectionDiagnostics : okDiagnostics;
  const health = summarizeNetlistHealth({ connections }, diag);
  const audit = auditSymbolsOnSheet(sheetNode, state.lib?.svg, state.srcSvg || sheet?.svg);
  const elements = collectElementSummaries(sheetNode);

  return {
    project: {
      dirName: state.dir?.name || null,
      norm: settingsCfg.norm || "",
      maker: settingsCfg.maker || "",
      doc: settingsCfg.doc || "",
      library: state.lib?.name || settingsCfg.library || "",
    },
    activeSheet: {
      name: sheet?.name || "",
      title: sheet ? sheetDisplayTitle(sheet) : "",
      key: sheet ? sheetKey(sheet) : "",
      instances: collectSheetInstances(sheetNode),
      connectors: collectSheetConnectors(sheetNode),
      connections: compactConnections(connections),
      netlistHealth: {
        total: health.total,
        ok: health.ok,
        bad: health.bad,
        summary: health.summary,
        issues: (health.issues || []).slice(0, 20),
      },
      missingSymbols: audit.missing || [],
      elements,
      elementCount: schematicSheetChildren(sheetNode).length,
    },
    selection: selectionSummary(state),
    symbolCatalog: catalog,
    view: {
      zoom: state.zoom,
      panX: state.panX,
      panY: state.panY,
    },
  };
}

export function formatContextForPrompt(ctx) {
  try {
    return JSON.stringify(ctx || {}, null, 2);
  } catch {
    return "{}";
  }
}
