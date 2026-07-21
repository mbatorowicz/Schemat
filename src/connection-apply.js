/**
 * Jedna ścieżka zapisu połączenia: spis (netlist) + geometria SVG.
 */
import { NetlistModel } from "./netlist-model.js";
import { wireColor, WIRE_DEFAULT_STROKE } from "./wire-theme.js";
import { applyConnMetaToWire, isWireGeometry, wireConnId, findWireByConnId } from "./wire-geometry.js";
import { syncWireMarks } from "./wire-markers.js";
import { upsertConnection, syncNetlistToProject } from "./sheet-connections.js";

/**
 * @param {object} ctx
 * @param {object} ctx.state
 * @param {() => object|null} [ctx.getSheet]
 * @param {() => object|null} [ctx.getSettingsCfg]
 * @param {(cls: string) => string} [ctx.wireColorFn]
 * @param {(tag: string, attrs?: object) => Element} [ctx.mkEl]
 */
export function createConnectionApply(ctx) {
  const { state, getSheet, getSettingsCfg, wireColorFn, mkEl } = ctx;
  const colorOf = typeof wireColorFn === "function" ? wireColorFn : wireColor;

  /**
   * @param {object} record
   * @param {{
   *   el?: Element|null,
   *   sheetNode?: Element|null,
   *   routeKind?: string,
   *   persist?: boolean,
   *   strokeWidth?: string,
   *   color?: string,
   *   upsert?: boolean,
   * }} [opts]
   */
  function applyConnectionRecord(record, opts = {}) {
    if (!record) return null;
    const norm = NetlistModel.normalizeConnection(record);
    const cls = NetlistModel.wireClass(norm);
    const withClass = { ...norm, _wireClass: cls };

    if (opts.upsert !== false && state.netlist) {
      state.netlist.connections = upsertConnection(state.netlist.connections || [], norm);
    }

    let el = opts.el || null;
    let node = opts.sheetNode || null;
    if (!el && node && norm.id) el = findWireByConnId(node, norm.id);
    if (el && isWireGeometry(el)) {
      const routeKind = opts.routeKind || el.getAttribute("data-route") || "manual";
      applyConnMetaToWire(el, withClass, routeKind);
      el.style.stroke = opts.color || colorOf(cls) || WIRE_DEFAULT_STROKE;
      if (opts.strokeWidth) el.style.strokeWidth = String(opts.strokeWidth);
      if (!node && el.parentNode) node = el.parentNode;
      if (node) syncWireMarks(node, el, mkEl, state.wireMarkMode);
    }

    if (opts.persist !== false) {
      const sheet = typeof getSheet === "function" ? getSheet() : null;
      const settingsCfg = typeof getSettingsCfg === "function" ? getSettingsCfg() : null;
      if (sheet && settingsCfg) syncNetlistToProject(state, sheet, settingsCfg);
    }

    return { record: norm, el, className: cls };
  }

  return { applyConnectionRecord, findWireByConnId };
}

export function connectionRecordFromWire(el) {
  if (!el) return null;
  return NetlistModel.normalizeConnection({
    id: wireConnId(el) || "",
    from: el.getAttribute("data-from") || "",
    to: el.getAttribute("data-to") || "",
    net: el.getAttribute("data-net") || "—",
    wire: el.getAttribute("data-wire") || "do ustalenia",
    length: el.getAttribute("data-length") || "",
    notes: el.getAttribute("data-notes") || "",
    signal: "",
  });
}
