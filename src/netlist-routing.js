/**
 * Rozwiązywanie końców połączeń netlisty i automatyczne trasowanie przewodów.
 */

import { NetlistModel } from "./netlist-model.js";
import { qsById, qsByData } from "./dom-selectors.js";
import { OrthogonalRouter } from "./orthogonal-router.js";
import { fmt } from "./svg-utils.js";
import { rotatePoint } from "./svg-dom.js";
import { definitionForUseElement } from "./symbol-service.js";
import { hostRootFrom } from "./stage-layers.js";
import { W } from "./ui-wording.js";

function pinKey(v) {
  return String(v || "")
    .toUpperCase()
    .replace(/\s+/g, "")
    .replace(/\u2212/g, "-");
}

function pinAliases(pin) {
  const p = pinKey(pin);
  const map = {
    "V+": ["V+", " +V"],
    "V-": ["V-", "-V"],
    "+V": ["+V", "V+"],
    "-V": ["-V", "V-"],
    ENCODER: ["ENCODER", "ENC"],
  };
  return (map[p] || [p]).map(pinKey);
}

function rotateDir(dir, angle) {
  const order = ["N", "E", "S", "W"];
  const i = order.indexOf(dir);
  if (i < 0) return "E";
  return order[(i + Math.round((+angle || 0) / 90) % 4 + 4) % 4];
}

export function createNetlistRouting(ctx) {
  const {
    state,
    XLINK,
    num,
    mkEl,
    currentSymNode,
    childPair,
    bboxInRoot,
    isConnPoint,
    connEndpointCoords,
    updateConnLabel,
    pushUndo,
    render,
    setStatus,
    selectSheet,
    getHost,
    askConfirm,
  } = ctx;

  function targetSheet() {
    return state.lastSheet && state.sheets.includes(state.lastSheet) ? state.lastSheet : state.sheets[0] || null;
  }

  function definitionForUse(use, sheetSvg) {
    return definitionForUseElement(use, state.lib?.svg, sheetSvg || state.srcSvg, XLINK);
  }

  function connForPin(def, pin) {
    if (!def) return null;
    const aliases = pinAliases(pin);
    return (
      [...def.querySelectorAll('[data-role="conn"][data-pin]')].find((c) => aliases.includes(pinKey(c.getAttribute("data-pin")))) || null
    );
  }

  function resolveEndpointLocate(sheet, endpoint) {
    if (!sheet || !endpoint) return { ok: false, reason: "brak arkusza" };
    const node = qsById(sheet.svg, sheet.id);
    if (!node) return { ok: false, reason: "brak grupy arkusza" };
    const ref = NetlistModel.normalizeRef(endpoint.ref);
    const aliases = pinAliases(endpoint.pin);
    const direct = [...node.querySelectorAll('[data-role="conn"][data-ref]')].find(
      (c) => NetlistModel.normalizeRef(c.getAttribute("data-ref")) === ref && aliases.includes(pinKey(c.getAttribute("data-pin")))
    );
    if (direct) {
      return {
        ok: true,
        conn: direct,
        mapXY: (x, y) => [x, y],
        angle: 0,
        isPoint: isConnPoint(direct),
        onSheet: true,
        element: direct,
        ref,
        pin: direct.getAttribute("data-pin"),
      };
    }
    const instances = [...node.querySelectorAll("use[data-ref]")].filter((u) => NetlistModel.normalizeRef(u.getAttribute("data-ref")) === ref);
    if (!instances.length) return { ok: false, reason: "brak instancji " + ref };
    for (const use of instances) {
      const conn = connForPin(definitionForUse(use, sheet.svg), endpoint.pin);
      if (!conn) continue;
      const ux = num(use, "x");
      const uy = num(use, "y");
      const angle = parseFloat(use.getAttribute("data-ang") || "0");
      return {
        ok: true,
        conn,
        mapXY: (x, y) => rotatePoint(ux + x, uy + y, ux, uy, angle),
        angle,
        isPoint: isConnPoint(conn),
        onSheet: false,
        element: use,
        ref,
        pin: conn.getAttribute("data-pin"),
      };
    }
    return { ok: false, reason: "brak pinu " + ref + ":" + endpoint.pin };
  }

  function endpointFromLocate(loc, towardXY) {
    if (!loc.ok) return loc;
    const ep = connEndpointCoords(loc.conn, loc.mapXY, towardXY);
    const dir = loc.angle ? rotateDir(ep.dir, loc.angle) : ep.dir;
    return {
      ok: true,
      x: ep.x,
      y: ep.y,
      dir,
      element: loc.element,
      conn: loc.conn,
      onSheet: loc.onSheet,
      isPoint: loc.isPoint,
      ref: loc.ref,
      pin: loc.pin,
    };
  }

  function syncRoutedPointDir(loc, dir) {
    if (!loc.ok || !loc.isPoint || !loc.onSheet || !loc.conn) return;
    loc.conn.setAttribute("data-dir", dir);
    updateConnLabel(loc.conn);
  }

  function resolveConnectionEndpoints(sheet, record) {
    const aLoc = resolveEndpointLocate(sheet, record.from);
    const bLoc = resolveEndpointLocate(sheet, record.to);
    if (!aLoc.ok || !bLoc.ok) {
      const from = endpointFromLocate(aLoc);
      const to = endpointFromLocate(bLoc);
      return {
        record,
        from,
        to,
        ok: false,
        reason: [aLoc.ok ? "" : aLoc.reason, bLoc.ok ? "" : bLoc.reason].filter(Boolean).join("; "),
      };
    }
    const aRough = endpointFromLocate(aLoc, null);
    const bRough = endpointFromLocate(bLoc, null);
    const from = endpointFromLocate(aLoc, { x: bRough.x, y: bRough.y });
    const to = endpointFromLocate(bLoc, { x: from.x, y: from.y });
    syncRoutedPointDir(aLoc, from.dir);
    syncRoutedPointDir(bLoc, to.dir);
    return { record, from, to, ok: true, reason: "", aLoc, bLoc };
  }

  function resolveEndpoint(sheet, endpoint) {
    const loc = resolveEndpointLocate(sheet, endpoint);
    return endpointFromLocate(loc, null);
  }

  function connectionDiagnostics(record) {
    const sheet = targetSheet();
    const r = resolveConnectionEndpoints(sheet, record);
    return { record, from: r.from, to: r.to, ok: r.ok, reason: r.reason };
  }

  function routeObstacles(sheet, excluded, endpoints) {
    if (state.active !== sheet) return [];
    const node = currentSymNode();
    const root = hostRootFrom(getHost);
    if (!node || !root) return [];
    const skip = new Set(excluded || []);
    const out = [];
    const near = (b, p) =>
      p.x >= b.x - state.step &&
      p.x <= b.x + b.width + state.step &&
      p.y >= b.y - state.step &&
      p.y <= b.y + b.height + state.step;
    [...node.children].forEach((el, i) => {
      if (skip.has(el)) return;
      const tag = el.tagName.toLowerCase();
      if (tag === "polyline" && el.getAttribute("data-conn-id")) return;
      const cel = root.children[i];
      if (!cel) return;
      try {
        const b = bboxInRoot(cel, root);
        if ((endpoints || []).some((p) => near(b, p))) return;
        out.push(b);
      } catch (e) {}
    });
    return out;
  }

  async function routeSelectedConnection() {
    if (!state.netlist || !state.selectedConnId) return;
    const sheet = targetSheet();
    if (!sheet) {
      setStatus("Brak aktywnego arkusza.");
      return;
    }
    if (state.active !== sheet) selectSheet(sheet);
    const record = state.netlist.connections.find((r) => r.id === state.selectedConnId);
    const d = resolveConnectionEndpoints(sheet, record);
    if (!record || !d.ok) {
      setStatus(d.reason || "Nie można rozwiązać końców połączenia.", { toast: true, tone: "warning" });
      return;
    }
    const node = currentSymNode();
    const old = qsByData(node, "conn-id", record.id);
    if (old && old.getAttribute("data-route") === "manual") {
      const ok = askConfirm
        ? await askConfirm(W.confirm.replaceManualRoute, { title: "Trasowanie", okLabel: "Zastąp" })
        : window.confirm(W.confirm.replaceManualRoute);
      if (!ok) return;
    }
    const points = OrthogonalRouter.route({
      start: d.from,
      end: d.to,
      startDir: d.from.dir,
      endDir: d.to.dir,
      step: state.step,
      obstacles: routeObstacles(sheet, [d.from.element, d.to.element], [d.from, d.to]),
    });
    if (!points || points.length < 2) {
      setStatus("Router nie znalazł trasy.", { toast: true, tone: "warning" });
      return;
    }
    pushUndo();
    if (old) old.remove();
    const cls = NetlistModel.wireClass(record);
    const poly = mkEl("polyline", {
      points: points.map((p) => fmt(p.x) + "," + fmt(p.y)).join(" "),
      class: cls,
      "data-conn-id": record.id,
      "data-route": "auto",
      "data-from": record.from.raw,
      "data-to": record.to.raw,
    });
    node.appendChild(poly);
    state.selection = [poly];
    state.activeEl = poly;
    render();
    setStatus("Wytrasowano połączenie " + record.id + ".", { toast: true, tone: "success" });
  }

  function collectNetlistProposals() {
    const out = [];
    state.sheets.forEach((sheet) => {
      const node = qsById(sheet.svg, sheet.id);
      if (!node) return;
      [...node.querySelectorAll('[data-conn-id^="NEW"]')].forEach((el) => {
        const from = NetlistModel.parseEndpoint(el.getAttribute("data-from") || "");
        const to = NetlistModel.parseEndpoint(el.getAttribute("data-to") || "");
        if (!from.ref || !to.ref) return;
        out.push({
          id: el.getAttribute("data-conn-id"),
          from,
          to,
          signal: el.getAttribute("data-signal") || "",
          net: el.getAttribute("data-net") || "—",
          wire: el.getAttribute("data-wire") || "do ustalenia",
          notes: el.getAttribute("data-notes") || "propozycja z edytora",
        });
      });
    });
    out.sort((a, b) => NetlistModel.compareIds(a.id, b.id));
    state.netlistProposals = out;
    return out;
  }

  function nextProposalId() {
    const used = collectNetlistProposals().map((p) => parseInt(String(p.id).replace(/\D/g, ""), 10) || 0);
    return "NEW" + ((used.length ? Math.max(...used) : 0) + 1);
  }

  return {
    targetSheet,
    pinKey,
    pinAliases,
    resolveEndpointLocate,
    endpointFromLocate,
    resolveConnectionEndpoints,
    resolveEndpoint,
    connectionDiagnostics,
    routeObstacles,
    routeSelectedConnection,
    collectNetlistProposals,
    nextProposalId,
  };
}
