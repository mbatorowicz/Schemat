/**
 * Rozwiązywanie końców połączeń netlisty i proste łączenie pinów (odcinek prosty).
 */

import { NetlistModel } from "./netlist-model.js";
import { qsById, qsByData } from "./dom-selectors.js";
import { fmt } from "./svg-utils.js";
import { readUseOrient, mapLocalToSheet, flipDirWithOrient, rotateDir } from "./instance-orient.js";
import { definitionForUseElement } from "./symbol-service.js";
import { hostRootFrom } from "./stage-layers.js";
import { W } from "./ui-wording.js";
import { askRouteChoice } from "./ui-dialog.js";
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
  findWireByConnId,
} from "./wire-geometry.js";
import { removeWireMarks, syncWireMarks } from "./wire-markers.js";
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
import { formatPointsAttr } from "./polyline-edit.js";
import { pinWireEnds } from "./wire-ends.js";
const pinKey = NetlistModel.pinKey;
const pinAliases = NetlistModel.pinAliases;
const endpointKey = NetlistModel.endpointKey;

function pointsToAttr(points) {
  const pairs = (points || []).map((p) => {
    if (Array.isArray(p)) return [p[0], p[1]];
    return [p.x, p.y];
  });
  return formatPointsAttr(pairs);
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
    applyConnectionRecord,
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
      const orient = readUseOrient(use);
      return {
        ok: true,
        kind: "conn",
        conn,
        mapXY: (x, y) => mapLocalToSheet(ux, uy, orient, x, y),
        angle: orient.ang,
        orient,
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
    const dir = loc.orient ? flipDirWithOrient(ep.dir, loc.orient) : loc.angle ? rotateDir(ep.dir, loc.angle) : ep.dir;
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

  function netOfWireEl(el) {
    const attr = (el.getAttribute("data-net") || "").trim();
    if (attr && !NetlistModel.isBlankNet(attr)) return attr;
    const id = wireConnId(el);
    const rec = state.netlist?.connections?.find((c) => String(c.id) === String(id));
    return rec?.net && !NetlistModel.isBlankNet(rec.net) ? String(rec.net).trim() : "";
  }

  function wireCorridorRects(el, half) {
    const ends = wireEndpoints(el);
    if (!ends?.points?.length) return [];
    const hw = Math.max(+half || 0, 1);
    const rects = [];
    for (let i = 0; i < ends.points.length - 1; i++) {
      const a = ends.points[i];
      const b = ends.points[i + 1];
      const minX = Math.min(a.x, b.x) - hw;
      const minY = Math.min(a.y, b.y) - hw;
      const maxX = Math.max(a.x, b.x) + hw;
      const maxY = Math.max(a.y, b.y) + hw;
      rects.push({ x: minX, y: minY, width: Math.max(maxX - minX, hw * 2), height: Math.max(maxY - minY, hw * 2) });
    }
    return rects;
  }

  function pushPaddedBox(out, b, pad) {
    if (!b) return;
    out.push({
      x: b.x - pad,
      y: b.y - pad,
      width: b.width + pad * 2,
      height: b.height + pad * 2,
    });
  }

  /**
   * @param {object} [opts]
   * @param {string} [opts.forNet] — ten sam niepusty potencjał nie blokuje
   * @param {Iterable<string>} [opts.skipConnIds]
   */
  function routeObstacles(sheet, excluded, endpoints, opts) {
    if (state.active !== sheet) return [];
    const node = currentSymNode();
    const root = hostRootFrom(getHost);
    if (!node || !root) return [];
    const skip = new Set(excluded || []);
    const skipIds = new Set([...(opts?.skipConnIds || [])].map(String));
    const forNet = opts?.forNet && !NetlistModel.isBlankNet(opts.forNet) ? String(opts.forNet).trim() : "";
    const step = state.step || 5;
    const symbolPad = step;
    const textPad = Math.max(step * 0.75, 2);
    const out = [];
    /** Czy punkt pinu styka się z bboxem (wtedy nie blokuj całego symbolu — inaczej 0 tras). */
    const touchesPin = (b, p) =>
      p &&
      p.x >= b.x - step * 2 &&
      p.x <= b.x + b.width + step * 2 &&
      p.y >= b.y - step * 2 &&
      p.y <= b.y + b.height + step * 2;
    // Symbole: keep-out, ale pomiń bbox końców trasy (pin na brzegu symbolu)
    [...node.children].forEach((el, i) => {
      if (skip.has(el)) return;
      if (el.getAttribute?.("data-role") === "wire-mark") return;
      if (isWireGeometry(el) && wireConnId(el)) return;
      const tag = el.tagName?.toLowerCase?.();
      if (tag === "text") return;
      const cel = root.children[i];
      if (!cel) return;
      try {
        const b = bboxInRoot(cel, root);
        if ((endpoints || []).some((p) => touchesPin(b, p))) return;
        pushPaddedBox(out, b, symbolPad);
      } catch (e) {}
    });
    // Opisy — blokuj, chyba że to etykieta przy pinie końcowym
    [...node.querySelectorAll("text[data-owner-ref], text[data-part='label'], text.sheet-label")].forEach((el) => {
      if (skip.has(el)) return;
      try {
        const idx = [...node.children].indexOf(el);
        const cel = idx >= 0 ? root.children[idx] : null;
        let b = null;
        if (cel) b = bboxInRoot(cel, root);
        else if (typeof el.getBBox === "function") {
          const gb = el.getBBox();
          b = { x: gb.x, y: gb.y, width: gb.width, height: gb.height };
        }
        if (!b) return;
        if ((endpoints || []).some((p) => touchesPin(b, p))) return;
        pushPaddedBox(out, b, textPad);
      } catch (e) {}
    });
    // Obce potencjały — korytarze; wspólny niepusty net OK; pusty/„—” zawsze koliduje z innymi
    [...node.querySelectorAll("line[data-conn-id], polyline[data-conn-id]")].forEach((el) => {
      const cid = wireConnId(el);
      if (!cid || skipIds.has(cid)) return;
      const wNet = netOfWireEl(el);
      const sameLiveNet = forNet && wNet && wNet === forNet;
      if (sameLiveNet) return;
      wireCorridorRects(el, step).forEach((r) => out.push(r));
    });
    return out;
  }

  function findAdoptCandidate(node, record, fromXY, toXY) {
    if (!node || !record) return null;
    const tol = Math.max(8, (state.step || 5) * 1.5);
    const own = findWireByConnId(node, record.id);
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

  /** Uzupełnij pusty potencjał (infer); zwraca zaktualizowany rekord. */
  function ensureRecordNet(record) {
    if (!record) return record;
    let net = record.net;
    if (NetlistModel.isBlankNet(net)) {
      net = NetlistModel.inferConnectionNet(record, state.netlist?.connections || []);
    }
    if (String(net || "") !== String(record.net || "")) {
      record.net = net;
      const list = state.netlist?.connections;
      if (list) {
        const i = list.findIndex((c) => c.id === record.id);
        if (i >= 0) list[i] = record;
      }
    }
    return record;
  }

  function finishPlacedWire(poly, record) {
    const sw =
      (state.routeOpts && state.routeOpts.strokeWidth) ||
      (state.strokeW != null && state.strokeW !== "" ? String(state.strokeW) : "");
    if (typeof applyConnectionRecord === "function") {
      applyConnectionRecord(record, {
        el: poly,
        sheetNode: poly.parentNode,
        routeKind: "auto",
        persist: false,
        upsert: true,
        strokeWidth: sw,
      });
    } else {
      const cls = NetlistModel.wireClass(record);
      applyConnMetaToWire(poly, { ...record, _wireClass: cls }, "auto");
      if (typeof wireColor === "function") poly.style.stroke = wireColor(cls);
      if (sw) poly.style.strokeWidth = String(sw);
      if (poly.parentNode) syncWireMarks(poly.parentNode, poly, mkEl, state.wireMarkMode);
    }
    return poly;
  }

  /** Prosta linia między pinami — bez omijania przeszkód. */
  function placeStraightConnection(node, record, d, sheet) {
    if (!d?.ok || !d.from || !d.to) return null;
    return placeWirePolyline(
      node,
      record,
      [
        { x: d.from.x, y: d.from.y },
        { x: d.to.x, y: d.to.y },
      ],
      null,
      sheet
    );
  }

  function isManualOwned(node, recordId) {
    const el = findWireByConnId(node, recordId);
    return !!(el && el.getAttribute("data-route") === "manual");
  }

  function pinPlacedWire(poly, record, sheet) {
    if (!poly || !record || !sheet) return;
    const d = resolveConnectionEndpoints(sheet, record);
    if (!d.ok) return;
    const ends = wireEndpoints(poly);
    if (!ends) {
      pinWireEnds(poly, d.from, d.to, true);
    } else {
      const dFromStart = Math.hypot(ends.a.x - d.from.x, ends.a.y - d.from.y);
      const dToStart = Math.hypot(ends.a.x - d.to.x, ends.a.y - d.to.y);
      pinWireEnds(poly, d.from, d.to, dFromStart <= dToStart);
    }
    if (poly.parentNode) syncWireMarks(poly.parentNode, poly, mkEl, state.wireMarkMode);
  }

  function placeWirePolyline(node, record, points, extraAttrs, sheet) {
    if (!points || points.length < 2) return null;
    ensureRecordNet(record);
    const old = findWireByConnId(node, record.id);
    if (old) {
      removeWireMarks(node, record.id);
      old.remove();
    }
    const poly = mkEl("polyline", {
      points: pointsToAttr(points),
      class: NetlistModel.wireClass(record),
      ...(extraAttrs || {}),
    });
    node.appendChild(poly);
    const out = finishPlacedWire(poly, record);
    pinPlacedWire(out || poly, record, sheet || targetSheet());
    return out || poly;
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
    const owned = findWireByConnId(node, record.id);
    const isManual = owned && owned.getAttribute("data-route") === "manual";

    if (isManual) {
      const choice = askChoice
        ? await askRouteChoice(askChoice, W.confirm.keepOrReplaceRoute, {
            title: "Połączenie",
            cancelLabel: "Anuluj",
            localLabel: "Zastąp",
            libraryLabel: "Zachowaj",
          })
        : "library";
      if (choice === "cancel") return;
      if (choice === "library") {
        if (typeof applyConnectionRecord === "function") {
          applyConnectionRecord(record, { el: owned, routeKind: "manual", persist: false, upsert: true });
        } else {
          applyConnMetaToWire(owned, { ...record, _wireClass: NetlistModel.wireClass(record) }, "manual");
        }
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
          ? await askRouteChoice(askChoice, W.confirm.adoptOrReroute, {
              title: "Połączenie",
              cancelLabel: "Anuluj",
              localLabel: "Prosta linia",
              libraryLabel: "Adoptuj",
            })
          : "library";
        if (choice === "cancel") return;
        if (choice === "library") {
          pushUndo();
          if (typeof applyConnectionRecord === "function") {
            applyConnectionRecord(record, {
              el: adopt.el,
              sheetNode: node,
              routeKind: "manual",
              persist: false,
              upsert: true,
            });
          } else {
            const cls = NetlistModel.wireClass(record);
            applyConnMetaToWire(adopt.el, { ...record, _wireClass: cls }, "manual");
            if (typeof wireColor === "function") adopt.el.style.stroke = wireColor(cls);
            syncWireMarks(node, adopt.el, mkEl, state.wireMarkMode);
          }
          state.selection = [adopt.el];
          state.activeEl = adopt.el;
          render();
          setStatus("Adoptowano trasę dla " + record.id + ".", { toast: true, tone: "success" });
          return;
        }
      } else if (owned) {
        const ok = askConfirm
          ? await askConfirm(W.confirm.replaceManualRoute, { title: "Połączenie", okLabel: "Zastąp" })
          : true;
        if (!ok) return;
      }
    }

    pushUndo();
    ensureRecordNet(record);
    const poly = placeStraightConnection(node, record, d, sheet);
    if (!poly) {
      setStatus("Nie można połączyć pinów.", { toast: true, tone: "warning" });
      return;
    }
    state.selection = [poly];
    state.activeEl = poly;
    render();
    setStatus("Połączono " + record.id + " prostą linią.", { toast: true, tone: "success" });
  }

  /** Połącz wszystkie pending: prosta linia pin→pin. */
  async function routeAllConnections() {
    if (!state.netlist?.connections?.length) {
      setStatus("Brak połączeń w spisie.", { toast: true, tone: "warning" });
      return;
    }
    const sheet = targetSheet();
    if (!sheet) {
      setStatus("Brak aktywnego arkusza.");
      return;
    }
    if (state.active !== sheet) selectSheet(sheet);
    const node = currentSymNode();
    if (!node) return;

    const all = state.netlist.connections.slice();
    const manuals = all.filter((r) => isManualOwned(node, r.id));
    let forceManual = false;
    if (manuals.length) {
      const choice = askChoice
        ? await askRouteChoice(askChoice, "Część tras jest ręczna (" + manuals.length + "). Jak potraktować ręczne?", {
            title: "Połącz wszystkie",
            cancelLabel: "Anuluj",
            localLabel: "Zastąp ręczne",
            libraryLabel: "Pomiń ręczne",
          })
        : "library";
      if (choice === "cancel") return;
      forceManual = choice === "local";
    }

    const pending = all.filter((r) => forceManual || !isManualOwned(node, r.id));
    if (!pending.length) {
      setStatus("Brak połączeń do połączenia.", { toast: true, tone: "info" });
      return;
    }

    pushUndo();
    let ok = 0;
    let fail = 0;
    for (const record of pending) {
      ensureRecordNet(record);
      const d = resolveConnectionEndpoints(sheet, record);
      if (!d.ok) {
        fail++;
        continue;
      }
      const poly = placeStraightConnection(node, record, d, sheet);
      if (poly) ok++;
      else fail++;
    }

    render();
    setStatus("Połączono " + ok + " połączeń prostą linią" + (fail ? ", nieudanych: " + fail : "") + ".", {
      toast: true,
      tone: fail && !ok ? "warning" : "success",
    });
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
      net: el.getAttribute("data-net") || "—",
      wire: el.getAttribute("data-wire") || "do ustalenia",
      length: el.getAttribute("data-length") || "",
      notes: el.getAttribute("data-notes") || "",
      section: 1,
    };
    if (NetlistModel.isBlankNet(draft.net)) {
      draft.net = NetlistModel.inferConnectionNet(draft, state.netlist.connections);
    }

    let record = draft;
    if (typeof opts?.editRecord === "function") {
      const edited = await opts.editRecord(draft);
      if (!edited) return null;
      record = NetlistModel.normalizeConnection(edited);
    }

    pushUndo();
    state.netlist.connections = upsertConnection(state.netlist.connections, record);
    state.selectedConnId = record.id;
    if (typeof applyConnectionRecord === "function") {
      applyConnectionRecord(record, {
        el,
        sheetNode: el.parentNode,
        routeKind: "manual",
        persist: false,
        upsert: false,
      });
    } else {
      const cls = NetlistModel.wireClass(record);
      applyConnMetaToWire(el, { ...record, _wireClass: cls }, "manual");
      if (typeof wireColor === "function") el.style.stroke = wireColor(cls);
      if (el.parentNode) syncWireMarks(el.parentNode, el, mkEl, state.wireMarkMode);
    }
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
    routeAllConnections,
    promoteSelectionToConnection,
    findAdoptCandidate,
    placeStraightConnection,
    ensureRecordNet,
    sheetWireHealth,
    collectNetlistProposals,
    nextProposalId,
  };
}
