/**
 * SSOT połączeń arkusza — tabela w projekcie, geometria w SVG (data-conn-id).
 */
import { sheetKey } from "./sheet-persistence.js";
import {
  parseEndpoint,
  normalizeRef,
  compareIds,
  nextConnectionId,
  normalizeConnection,
  connectionsToJson,
  connectionsFromJson,
} from "./netlist-model.js";
export { isWireGeometry, wireConnId } from "./wire-geometry.js";

export function sheetConnectionsMap(settingsCfg) {
  const m = settingsCfg?.sheetConnections;
  return m && typeof m === "object" ? m : {};
}

export function hasStoredConnections(settingsCfg, sheet) {
  const key = sheetKey(sheet);
  if (!key) return false;
  const map = sheetConnectionsMap(settingsCfg);
  const list = map[key] || map[sheet?.name];
  return Array.isArray(list) && list.length > 0;
}

export function getStoredConnections(settingsCfg, sheet) {
  const key = sheetKey(sheet);
  if (!key) return [];
  const map = sheetConnectionsMap(settingsCfg);
  return connectionsFromJson(map[key] || map[sheet?.name] || []);
}

export function setStoredConnections(settingsCfg, sheet, connections) {
  if (!settingsCfg || !sheet) return;
  const key = sheetKey(sheet);
  if (!key) return;
  if (!settingsCfg.sheetConnections || typeof settingsCfg.sheetConnections !== "object") {
    settingsCfg.sheetConnections = {};
  }
  settingsCfg.sheetConnections[key] = connectionsToJson(connections);
}

/** Aktywny spis z SSOT projektu (pusty jeśli brak wpisów). */
export function ensureNetlistForSheet(state, sheet, settingsCfg) {
  if (!sheet) return null;
  const stored = getStoredConnections(settingsCfg, sheet);
  state.netlist = {
    meta: { sheet: sheetKey(sheet), version: "", date: "" },
    connections: stored.slice().sort((a, b) => compareIds(a.id, b.id)),
    name: "projekt:" + sheetKey(sheet),
    source: "project",
  };
  return state.netlist;
}

export function adoptConnectionsToSheet(state, sheet, settingsCfg, connections) {
  if (!sheet) return null;
  const list = (connections || []).map(normalizeConnection).sort((a, b) => compareIds(a.id, b.id));
  setStoredConnections(settingsCfg, sheet, list);
  state.netlist = {
    meta: { sheet: sheetKey(sheet), version: "", date: "" },
    connections: list,
    name: "projekt:" + sheetKey(sheet),
    source: "project",
  };
  state.netlistRaw = null;
  state.netlistHandle = null;
  return state.netlist;
}

export function syncNetlistToProject(state, sheet, settingsCfg) {
  if (!sheet || !state.netlist?.connections) return;
  setStoredConnections(settingsCfg, sheet, state.netlist.connections);
}

export function upsertConnection(connections, record) {
  const list = Array.isArray(connections) ? connections.slice() : [];
  const norm = normalizeConnection(record);
  const i = list.findIndex((c) => c.id === norm.id);
  if (i >= 0) list[i] = norm;
  else list.push(norm);
  list.sort((a, b) => compareIds(a.id, b.id));
  return list;
}

export function removeConnectionById(connections, id) {
  return (connections || []).filter((c) => c.id !== id);
}

export function allocateConnectionId(connections, preferred) {
  const pref = String(preferred || "").trim();
  if (pref && !(connections || []).some((c) => c.id === pref)) return pref;
  return nextConnectionId(connections);
}

export function endpointFromParts(ref, pin) {
  const r = normalizeRef(ref);
  const p = String(pin || "").trim();
  const raw = p ? r + ":" + p : r;
  return parseEndpoint(raw);
}
