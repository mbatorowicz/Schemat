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
import {
  allocateConnectionId,
  adoptConnectionsToSheet,
  syncNetlistToProject,
  upsertConnection,
} from "./sheet-connections.js";
import {
  isWireGeometry,
  wireConnId,
  wireEndpoints,
  wireMatchesEndpoints,
  applyConnMetaToWire,
  analyzeSheetWires,
} from "./wire-geometry.js";
import {
  findTopoNodeByRef,
  ensureNodeRef,
  ensureAllTopoNodeRefs,
  nearestTopoNode,
  isNodeEndpoint,
  nodeCenter,
  endpointRawFromSnap,
} from "./topo-nodes.js";
import {
  findJunctionByRef,
  ensureJunctionRef,
  ensureAllJunctionRefs,
  nearestJunction,
  junctionCenter,
} from "./junctions.js";

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
  return order[(i + (Math.round((+angle || 0) / 90) % 4) + 4) % 4];
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
    askChoice,
    getSettingsCfg,
    persistConnections,
    nearestJoint,
    wireColor,
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
      [...def.querySelectorAll('[data-role="conn"][data-pin]')].find((c) =>
        aliases.includes(pinKey(c.getAttribute("data-pin")))
      ) || null
    );
  }

  function resolveEndpointLocate(sheet, endpoint) {
    if (!sheet || !endpoint) return { ok: false, reason: "brak arkusza" };
    const node = qsById(sheet.svg, sheet.id);
    if (!node) return { ok: false, reason: "brak grupy arkusza" };
    ensureAllTopoNodeRefs(node);
    ensureAllJunctionRefs(node);
    const ref = NetlistModel.normalizeRef(endpoint.ref);
    if (!ref) return { ok: false, reason: "brak oznaczenia końca" };

    // Junction ukośnego odgałęzienia (J*) — bez widocznej kropki
    const junc = findJunctionByRef(node, ref);
    if (junc && (isNodeEndpoint(endpoint) || !String(endpoint.pin || "").trim())) {
      const c = junctionCenter(junc);
      return {
        ok: true,
        kind: "junction",
        conn: null,
        mapXY: (x, y) => [x, y],
        angle: 0,
        isPoint: false,
        onSheet: true,
        element: junc,
        ref: ensureJunctionRef(junc, node),
        pin: "",
        x: c.x,
        y: c.y,
      };
    }

    // Węzeł topologii (N1…) — bez pinu lub z pinem @/node
    const topo = findTopoNodeByRef(node, ref);
    if (topo && (isNodeEndpoint(endpoint) || !String(endpoint.pin || "").trim())) {
      const c = nodeCenter(topo);
      return {
        ok: true,
        kind: "node",
        conn: null,
        mapXY: (x, y) => [x, y],
        angle: 0,
        isPoint: false,
        onSheet: true,
        element: topo,
        ref: ensureNodeRef(topo, node),
        pin: "",
        x: c.x,
        y: c.y,
      };
    }

    const aliases = pinAliases(endpoint.pin);
    const direct = [...node.querySelectorAll('[data-role="conn"][data-ref]')].find(
      (c) =>
        NetlistModel.normalizeRef(c.getAttribute("data-ref")) === ref &&
        aliases.includes(pinKey(c.getAttribute("data-pin")))
    );
    if (direct) {
      return {
        ok: true,
        kind: "conn",
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
    const instances = [...node.querySelectorAll("use[data-ref]")].filter(
      (u) => NetlistModel.normalizeRef(u.getAttribute("data-ref")) === ref
    );
    if (!instances.length) {
      if (junc) {
        const c = junctionCenter(junc);
        return {
          ok: true,
          kind: "junction",
          conn: null,
          mapXY: (x, y) => [x, y],
          angle: 0,
          isPoint: false,
          onSheet: true,
          element: junc,
          ref: ensureJunctionRef(junc, node),
          pin: "",
          x: c.x,
          y: c.y,
        };
      }
      if (topo) {
        const c = nodeCenter(topo);
        return {
          ok: true,
          kind: "node",
          conn: null,
          mapXY: (x, y) => [x, y],
          angle: 0,
          isPoint: false,
          onSheet: true,
          element: topo,
          ref: ensureNodeRef(topo, node),
          pin: "",
          x: c.x,
          y: c.y,
        };
      }
      return { ok: false, reason: "brak instancji/węzła/junction " + ref };
    }
    for (const use of instances) {
      const conn = connForPin(definitionForUse(use, sheet.svg), endpoint.pin);
      if (!conn) continue;
      const ux = num(use, "x");
      const uy = num(use, "y");
      const angle = parseFloat(use.getAttribute("data-ang") || "0");
      return {
        ok: true,
        kind: "conn",
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
    if (loc.kind === "node" || loc.kind === "junction") {
      let dir = "E";
      if (towardXY && towardXY.x != null) {
        const dx = towardXY.x - loc.x;
        const dy = towardXY.y - loc.y;
        if (Math.abs(dx) >= Math.abs(dy)) dir = dx >= 0 ? "E" : "W";
        else dir = dy >= 0 ? "S" : "N";
      }
      return {
        ok: true,
        x: loc.x,
        y: loc.y,
        dir,
        element: loc.element,
        conn: null,
        onSheet: true,
        isPoint: false,
        kind: loc.kind,
        ref: loc.ref,
        pin: "",
      };
    }
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
      kind: "conn",
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

  function findAdoptCandidate(node, record, fromXY, toXY) {
    if (!node || !record) return null;
    const tol = Math.max(8, (state.step || 5) * 1.5);
    const own = qsByData(node, "conn-id", record.id);
    if (own) return { el: own, kind: "owned" };
    let best = null;
    [...node.children].forEach((el) => {
      if (!isWireGeometry(el)) return;
      const cid = wireConnId(el);
      if (cid && cid !== record.id && !/^NEW/i.test(cid)) return;
      if (!wireMatchesEndpoints(el, fromXY, toXY, tol)) return;
      best = { el, kind: cid ? "proposal" : "bare" };
    });
    return best;
  }

  function placeAutoRoute(node, record, d, sheet) {
    const points = OrthogonalRouter.route({
      start: d.from,
      end: d.to,
      startDir: d.from.dir,
      endDir: d.to.dir,
      step: state.step,
      obstacles: routeObstacles(sheet, [d.from.element, d.to.element], [d.from, d.to]),
    });
    if (!points || points.length < 2) return null;
    const old = qsByData(node, "conn-id", record.id);
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
    if (typeof wireColor === "function") poly.style.stroke = wireColor(cls);
    node.appendChild(poly);
    return poly;
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
    if (!node) return;
    const fromXY = { x: d.from.x, y: d.from.y };
    const toXY = { x: d.to.x, y: d.to.y };
    const owned = qsByData(node, "conn-id", record.id);
    const isManual = owned && owned.getAttribute("data-route") === "manual";

    if (isManual) {
      const choice = askChoice
        ? await askChoice(W.confirm.keepOrReplaceRoute, {
            title: "Trasowanie",
            cancelLabel: "Anuluj",
            localLabel: "Zastąp",
            libraryLabel: "Zachowaj",
          })
        : "library";
      if (choice === "cancel") return;
      if (choice === "library") {
        applyConnMetaToWire(owned, { ...record, _wireClass: NetlistModel.wireClass(record) }, "manual");
        state.selection = [owned];
        state.activeEl = owned;
        render();
        setStatus("Zachowano ręczną trasę " + record.id + ".", { toast: true, tone: "success" });
        return;
      }
    } else {
      const adopt = findAdoptCandidate(node, record, fromXY, toXY);
      if (adopt && adopt.kind !== "owned") {
        const choice = askChoice
          ? await askChoice(W.confirm.adoptOrReroute, {
              title: "Trasowanie",
              cancelLabel: "Anuluj",
              localLabel: "Trasuj auto",
              libraryLabel: "Adoptuj",
            })
          : "library";
        if (choice === "cancel") return;
        if (choice === "library") {
          pushUndo();
          const cls = NetlistModel.wireClass(record);
          applyConnMetaToWire(adopt.el, { ...record, _wireClass: cls }, "manual");
          if (typeof wireColor === "function") adopt.el.style.stroke = wireColor(cls);
          state.selection = [adopt.el];
          state.activeEl = adopt.el;
          render();
          setStatus("Adoptowano trasę dla " + record.id + ".", { toast: true, tone: "success" });
          return;
        }
      } else if (owned) {
        const ok = askConfirm
          ? await askConfirm(W.confirm.replaceManualRoute, { title: "Trasowanie", okLabel: "Zastąp" })
          : true;
        if (!ok) return;
      }
    }

    pushUndo();
    const poly = placeAutoRoute(node, record, d, sheet);
    if (!poly) {
      setStatus("Router nie znalazł trasy.", { toast: true, tone: "warning" });
      return;
    }
    state.selection = [poly];
    state.activeEl = poly;
    render();
    setStatus("Wytrasowano połączenie " + record.id + ".", { toast: true, tone: "success" });
  }

  /**
   * Promuj zaznaczoną linię/łamaną do połączenia w spisie.
   */
  async function promoteSelectionToConnection(opts) {
    const sheet = targetSheet();
    if (!sheet) {
      setStatus("Brak aktywnego arkusza.");
      return null;
    }
    const el = state.activeEl || state.selection?.[0];
    if (!isWireGeometry(el)) {
      setStatus("Zaznacz linię lub łamaną do promocji.", { toast: true, tone: "warning" });
      return null;
    }
    const ends = wireEndpoints(el);
    if (!ends) return null;
    const max = Math.max(9 / (state.zoom || 1), (state.step || 5) * 1.2);
    const sheetNode = qsById(sheet.svg, sheet.id);
    const snapEnd = (pt, attr) => {
      let s = typeof nearestJoint === "function" ? nearestJoint(pt.x, pt.y) : null;
      if (s && Math.hypot(s.x - pt.x, s.y - pt.y) > max) s = null;
      if (!s && sheetNode) {
        const j = nearestJunction(sheetNode, pt.x, pt.y, max);
        if (j) s = { ref: j.ref, pin: "", x: j.x, y: j.y, kind: "junction", element: j.el };
      }
      if (!s && sheetNode) {
        const n = nearestTopoNode(sheetNode, pt.x, pt.y, max);
        if (n) s = { ref: n.ref, pin: "", x: n.x, y: n.y, kind: "node", element: n.el };
      }
      if (!s && el.getAttribute(attr)) {
        const ep = NetlistModel.parseEndpoint(el.getAttribute(attr));
        if (ep.ref) s = { ref: ep.ref, pin: ep.pin, x: pt.x, y: pt.y, kind: ep.pin ? "conn" : "node" };
      }
      return s;
    };
    const a = snapEnd(ends.a, "data-from");
    const b = snapEnd(ends.b, "data-to");
    if (!a?.ref || !b?.ref) {
      setStatus("Nie udało się dopasować końców do pinów ani węzłów.", { toast: true, tone: "warning" });
      return null;
    }
    if (a.ref === b.ref && (a.pin || "") === (b.pin || "")) {
      setStatus("Końce wskazują ten sam pin/węzeł.", { toast: true, tone: "warning" });
      return null;
    }

    const settingsCfg = typeof getSettingsCfg === "function" ? getSettingsCfg() : null;
    if (!state.netlist || state.netlist.source !== "project") {
      if (settingsCfg) adoptConnectionsToSheet(state, sheet, settingsCfg, state.netlist?.connections || []);
      else
        state.netlist = {
          meta: {},
          connections: state.netlist?.connections || [],
          name: "projekt",
          source: "project",
        };
    }

    const existingId = wireConnId(el);
    const preferred = existingId && !/^NEW/i.test(existingId) ? existingId : "";
    const draft = {
      id: allocateConnectionId(state.netlist.connections, preferred),
      from: NetlistModel.parseEndpoint(endpointRawFromSnap(a)),
      to: NetlistModel.parseEndpoint(endpointRawFromSnap(b)),
      signal: el.getAttribute("data-signal") || "",
      net: el.getAttribute("data-net") || "—",
      wire: el.getAttribute("data-wire") || "do ustalenia",
      notes: el.getAttribute("data-notes") || "",
      section: 1,
    };

    let record = draft;
    if (typeof opts?.editRecord === "function") {
      const edited = await opts.editRecord(draft);
      if (!edited) return null;
      record = NetlistModel.normalizeConnection(edited);
    }

    pushUndo();
    state.netlist.connections = upsertConnection(state.netlist.connections, record);
    state.selectedConnId = record.id;
    const cls = NetlistModel.wireClass(record);
    applyConnMetaToWire(el, { ...record, _wireClass: cls }, "manual");
    if (typeof wireColor === "function") el.style.stroke = wireColor(cls);
    if (settingsCfg) syncNetlistToProject(state, sheet, settingsCfg);
    if (typeof persistConnections === "function") await persistConnections();
    state.selection = [el];
    state.activeEl = el;
    render();
    setStatus("Promowano połączenie " + record.id + ".", { toast: true, tone: "success" });
    return record;
  }

  function sheetWireHealth(sheet) {
    const sh = sheet || targetSheet();
    const node = sh ? qsById(sh.svg, sh.id) : null;
    const resolveXY = (ep) => {
      const r = resolveEndpoint(sh, ep);
      return r?.ok ? { x: r.x, y: r.y } : null;
    };
    return analyzeSheetWires(node, state.netlist?.connections || [], { resolveXY, tol: Math.max(8, state.step || 5) });
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
    promoteSelectionToConnection,
    findAdoptCandidate,
    sheetWireHealth,
    collectNetlistProposals,
    nextProposalId,
  };
}
