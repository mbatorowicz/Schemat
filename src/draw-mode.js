/**
 * Tryb rysowania kształtów i linii — wydzielone z main.js.
 */
import { DRAW_HINT } from "./draw-mode-ui.js";
import { NetlistModel } from "./netlist-model.js";
import { collectTopoNodeSnapCandidates, endpointRawFromSnap, ensureNodeRef } from "./topo-nodes.js";
import { collectJunctionSnapCandidates, createJunctionEl } from "./junctions.js";
import {
  hitNearestWireOnSheet,
  buildObliqueBranchPoints,
  formatPointsAttr,
  prependObliqueStub,
  hitWireSegment,
  segmentAxis,
  pointsOfWire,
} from "./polyline-edit.js";
import { OrthogonalRouter } from "./orthogonal-router.js";
import { readUseOrient, mapLocalToSheet } from "./instance-orient.js";

export const DRAW_NEED = {
  line: Infinity,
  rect: 2,
  circle: 2,
  arc: 3,
  text: 1,
  point: 1,
  node: 1,
  lead: 2,
  branch: 2,
};

export const DRAW_BTN = {
  line: "btnAddLine",
  rect: "btnAddRect",
  circle: "btnAddCircle",
  arc: "btnAddArc",
  text: "btnAddText",
  point: "btnAddPoint",
  node: "btnAddNode",
  lead: "btnAddLead",
  branch: "btnBranchOblique",
};

/**
 * @param {object} deps
 */
export function createDrawMode(deps) {
  const {
    state,
    stage,
    getScene,
    currentSymNode,
    setStatus,
    syncDrawBanner,
    syncSelectionToolbar,
    clearHighlight,
    captureToolStyleFromToolbar,
    pushUndo,
    render,
    snap,
    fmt,
    mkEl,
    mkPrev,
    SVGNS,
    XLINK,
    num,
    rotatePoint,
    definitionForUseElement,
    isConnGroup,
    pushConnContactCandidates,
    finishConnDraw,
    nextProposalId,
    wireColor,
    styleShape,
    styleLine,
    styleText,
    styleNode,
    applyConnectionRecord,
    prompt: promptFn = typeof window !== "undefined" ? window.prompt.bind(window) : () => null,
    askText,
  } = deps;

  async function askSignal(defaultNet) {
    if (typeof askText === "function") {
      const v = await askText("Sygnał połączenia", { defaultValue: defaultNet || "—", label: "Sygnał" });
      return (v == null ? defaultNet : v) || "—";
    }
    if (typeof promptFn === "function") {
      const v = promptFn("Sygnał połączenia:", defaultNet || "—");
      return (v == null ? defaultNet : v) || "—";
    }
    return defaultNet || "—";
  }

  function attachProposal(el, proposal) {
    const norm = NetlistModel.normalizeConnection(proposal);
    if (typeof applyConnectionRecord === "function") {
      applyConnectionRecord(norm, {
        el,
        sheetNode: typeof currentSymNode === "function" ? currentSymNode() : null,
        routeKind: "manual",
        persist: false,
        upsert: false,
      });
    } else {
      const cls = NetlistModel.wireClass(norm);
      el.setAttribute("class", cls);
      el.style.stroke = wireColor(cls);
      el.setAttribute("data-conn-id", norm.id);
      el.setAttribute("data-route", "manual");
      el.setAttribute("data-from", norm.from.raw);
      el.setAttribute("data-to", norm.to.raw);
      el.setAttribute("data-net", norm.net);
      el.setAttribute("data-wire", norm.wire);
      if (norm.length) el.setAttribute("data-length", norm.length);
      el.setAttribute("data-notes", norm.notes);
    }
    return norm;
  }

  function startDraw(kind) {
    const node = currentSymNode();
    if (!node) {
      setStatus("Najpierw wybierz symbol lub schemat.");
      return;
    }
    if (state.drawMode === kind) {
      if (kind === "line") finishLineDraw();
      else {
        exitDraw();
        setStatus("Anulowano.");
      }
      return;
    }
    exitDraw();
    captureToolStyleFromToolbar();
    state.drawMode = kind;
    state.drawing = { kind, need: DRAW_NEED[kind], pts: [], cursor: null, snaps: [] };
    state.selection = [];
    state.activeEl = null;
    state.selHandle = null;
    clearHighlight();
    syncSelectionToolbar();
    const b = document.getElementById(DRAW_BTN[kind]);
    if (b) b.classList.add("primary");
    stage.style.cursor = "crosshair";
    setStatus(DRAW_HINT[kind] || "Rysowanie: klikaj punkty.");
    syncDrawBanner();
  }

  function startLineDraw() {
    startDraw("line");
  }

  function jointCandidates() {
    const node = currentSymNode();
    if (!node) return [];
    const out = [];
    [...node.children].forEach((el) => {
      if (isConnGroup(el) && el.getAttribute("data-ref")) {
        pushConnContactCandidates(
          out,
          el,
          (x, y) => [x, y],
          el.getAttribute("data-ref"),
          el.getAttribute("data-pin"),
          el
        );
        return;
      }
      if (el.tagName.toLowerCase() !== "use" || !el.getAttribute("data-ref")) return;
      const def = definitionForUseElement(el, state.lib?.svg, state.srcSvg, XLINK);
      const ux = num(el, "x");
      const uy = num(el, "y");
      const orient = readUseOrient(el);
      const ref = el.getAttribute("data-ref");
      if (!def) return;
      [...def.querySelectorAll('[data-role="conn"]')].forEach((c) => {
        pushConnContactCandidates(
          out,
          c,
          (x, y) => mapLocalToSheet(ux, uy, orient, x, y),
          ref,
          c.getAttribute("data-pin"),
          el
        );
      });
    });
    collectTopoNodeSnapCandidates(node).forEach((c) => out.push(c));
    collectJunctionSnapCandidates(node).forEach((c) => out.push(c));
    return out;
  }

  function nearestJoint(x, y) {
    const max = 9 / state.zoom;
    let best = null;
    let dist = max;
    jointCandidates().forEach((j) => {
      const d = Math.hypot(j.x - x, j.y - y);
      if (d <= dist) {
        dist = d;
        best = j;
      }
    });
    return best;
  }

  function addDrawPoint(x, y) {
    if (!state.drawing) return;
    const node = currentSymNode();

    if (state.drawing.kind === "branch") {
      if (!state.drawing.trunk) {
        const maxDist = Math.max(12 / (state.zoom || 1), (state.step || 5) * 1.5);
        const hit = hitNearestWireOnSheet(node, x, y, maxDist);
        if (!hit) {
          setStatus("Odgałęź: kliknij istniejącą szynę (przewód).", { toast: true, tone: "warning" });
          return;
        }
        state.drawing.trunk = hit;
        state.drawing.pts = [[hit.x, hit.y]];
        state.drawing.snaps = [{ kind: "trunk", x: hit.x, y: hit.y, element: hit.el }];
        drawPreview();
        setStatus("Odgałęź: kliknij cel (pin / punkt).");
        return;
      }
      let snapped = nearestJoint(x, y);
      if (snapped) {
        x = snapped.x;
        y = snapped.y;
      } else if (state.snap) {
        x = snap(x);
        y = snap(y);
      }
      state.drawing.pts.push([x, y]);
      state.drawing.snaps.push(snapped);
      finishBranchDraw();
      return;
    }

    let snapped = null;
    if (state.drawing.kind === "line") snapped = nearestJoint(x, y);
    if (snapped) {
      x = snapped.x;
      y = snapped.y;
    } else if (state.snap) {
      x = snap(x);
      y = snap(y);
    }
    state.drawing.pts.push([x, y]);
    state.drawing.snaps.push(snapped);
    drawPreview();
    if (state.drawing.need !== Infinity && state.drawing.pts.length >= state.drawing.need) finishShape();
  }

  function arcPath(p0, p1, p2) {
    const cx = 2 * p1[0] - (p0[0] + p2[0]) / 2;
    const cy = 2 * p1[1] - (p0[1] + p2[1]) / 2;
    return "M " + fmt(p0[0]) + " " + fmt(p0[1]) + " Q " + fmt(cx) + " " + fmt(cy) + " " + fmt(p2[0]) + " " + fmt(p2[1]);
  }

  function drawPreview() {
    clearHighlight();
    if (!state.drawing) return;
    const scene = getScene();
    const d = state.drawing;
    const k = d.kind;
    const pts = d.pts;
    const cur = d.cursor;
    if (k === "line" || k === "branch") {
      const a = pts.slice();
      if (cur) a.push(cur);
      if (k === "branch" && d.trunk && cur) {
        const preview = buildObliqueBranchPoints(
          { x: d.trunk.x, y: d.trunk.y },
          d.trunk.trunkAxis,
          { x: cur[0], y: cur[1] },
          state.step || 5,
          (opts) => OrthogonalRouter.route(opts)
        );
        if (preview.length >= 2)
          scene.sel.appendChild(mkPrev("polyline", { points: preview.map((p) => p.join(",")).join(" ") }));
      } else if (a.length >= 2) {
        scene.sel.appendChild(mkPrev("polyline", { points: a.map((p) => p.join(",")).join(" ") }));
      }
    } else if (k === "rect" && pts.length >= 1 && cur) {
      scene.sel.appendChild(
        mkPrev("rect", {
          x: Math.min(pts[0][0], cur[0]),
          y: Math.min(pts[0][1], cur[1]),
          width: Math.abs(cur[0] - pts[0][0]),
          height: Math.abs(cur[1] - pts[0][1]),
        })
      );
    } else if (k === "circle" && pts.length >= 1 && cur) {
      scene.sel.appendChild(
        mkPrev("circle", {
          cx: pts[0][0],
          cy: pts[0][1],
          r: Math.hypot(cur[0] - pts[0][0], cur[1] - pts[0][1]),
        })
      );
    } else if (k === "arc") {
      if (pts.length === 1 && cur) {
        scene.sel.appendChild(mkPrev("line", { x1: pts[0][0], y1: pts[0][1], x2: cur[0], y2: cur[1] }));
      } else if (pts.length === 2) {
        scene.sel.appendChild(mkPrev("path", { d: arcPath(pts[0], pts[1], cur || pts[1]) }));
      }
    } else if (k === "lead" && pts.length >= 1 && cur) {
      scene.sel.appendChild(mkPrev("line", { x1: pts[0][0], y1: pts[0][1], x2: cur[0], y2: cur[1] }));
    }
    const rr = k === "lead" || k === "point" ? 2 / state.zoom : 3 / state.zoom;
    pts.forEach((p) => {
      const c = document.createElementNS(SVGNS, "circle");
      c.setAttribute("cx", p[0]);
      c.setAttribute("cy", p[1]);
      c.setAttribute("r", rr);
      c.setAttribute("fill", "#2563eb");
      c.style.pointerEvents = "none";
      scene.sel.appendChild(c);
    });
  }

  function finishBranchDraw() {
    if (!state.drawing?.trunk || (state.drawing.pts || []).length < 2) {
      exitDraw();
      render();
      setStatus("Anulowano odgałęzienie.");
      return;
    }
    const trunk = state.drawing.trunk;
    const endPt = state.drawing.pts[state.drawing.pts.length - 1];
    const endSnap = state.drawing.snaps[state.drawing.snaps.length - 1];
    const node = currentSymNode();
    captureToolStyleFromToolbar();
    exitDraw();
    if (!node) {
      render();
      return;
    }
    const pts = buildObliqueBranchPoints(
      { x: trunk.x, y: trunk.y },
      trunk.trunkAxis,
      { x: endPt[0], y: endPt[1] },
      state.step || 5,
      (opts) => OrthogonalRouter.route(opts)
    );
    if (pts.length < 2) {
      render();
      setStatus("Nie udało się zbudować odgałęzienia.");
      return;
    }
    pushUndo();
    const junc = createJunctionEl(mkEl, trunk.x, trunk.y, node);
    node.appendChild(junc);
    const el = mkEl("polyline", { points: formatPointsAttr(pts), class: "sym" });
    styleLine(el);
    const fromSnap = { ref: junc.getAttribute("data-ref"), pin: "", kind: "junction" };
    const toSnap = endSnap?.ref ? endSnap : { ref: "", pin: "", kind: "free", x: endPt[0], y: endPt[1] };
    if (fromSnap.ref && toSnap.ref && fromSnap.ref !== toSnap.ref) {
      const draft = {
        id: nextProposalId(),
        from: NetlistModel.parseEndpoint(endpointRawFromSnap(fromSnap)),
        to: NetlistModel.parseEndpoint(endpointRawFromSnap(toSnap)),
        net: "—",
        wire: "do ustalenia",
        notes: "odgałęzienie ukośne",
      };
      draft.net = NetlistModel.inferConnectionNet(draft, state.netlist?.connections || []);
      attachProposal(el, draft);
      el.setAttribute("data-branch", "oblique");
    } else {
      el.setAttribute("data-route", "manual");
      el.setAttribute("data-branch", "oblique");
      el.setAttribute("data-from", fromSnap.ref || "");
    }
    node.appendChild(el);
    state.selection = [el];
    state.activeEl = el;
    render();
    setStatus("Dodano odgałęzienie ukośne" + (fromSnap.ref ? " z " + fromSnap.ref : "") + ".", {
      toast: true,
      tone: "success",
    });
  }

  /** Dopnij ukos 45° na początku zaznaczonej trasy, jeśli leży przy szynie. */
  function applyObliqueStubToSelection() {
    const node = currentSymNode();
    const el = state.activeEl || state.selection?.[0];
    if (!node || !el) {
      setStatus("Zaznacz odgałęzienie (line/polyline).", { toast: true, tone: "warning" });
      return false;
    }
    const tag = el.tagName?.toLowerCase?.();
    if (tag !== "line" && tag !== "polyline") {
      setStatus("Zaznacz przewód do ukosu.", { toast: true, tone: "warning" });
      return false;
    }
    const pts = pointsOfWire(el);
    if (pts.length < 2) return false;
    const start = pts[0];
    const maxDist = Math.max(10 / (state.zoom || 1), (state.step || 5) * 1.2);
    let trunkHit = null;
    [...node.children].forEach((other) => {
      if (other === el) return;
      const t = other.tagName?.toLowerCase?.();
      if (t !== "line" && t !== "polyline") return;
      const hit = hitWireSegment(other, start[0], start[1], maxDist);
      if (hit && (!trunkHit || hit.dist < trunkHit.dist)) {
        const a = hit.pts[hit.segmentIndex];
        const b = hit.pts[hit.segmentIndex + 1];
        trunkHit = { ...hit, el: other, trunkAxis: segmentAxis(a, b) };
      }
    });
    if (!trunkHit) {
      setStatus("Początek trasy nie leży przy innej szynie.", { toast: true, tone: "warning" });
      return false;
    }
    const toward = pts[1] || [trunkHit.x + 10, trunkHit.y];
    const next = prependObliqueStub(
      pts,
      trunkHit.trunkAxis,
      { x: toward[0], y: toward[1] },
      Math.max((state.step || 5) * 2, 5)
    );
    if (!next) return false;
    pushUndo();
    if (el.tagName.toLowerCase() === "line") {
      const poly = mkEl("polyline", { points: formatPointsAttr(next) });
      for (const a of [...el.attributes]) {
        if (a.name === "x1" || a.name === "y1" || a.name === "x2" || a.name === "y2" || a.name === "points") continue;
        poly.setAttribute(a.name, a.value);
      }
      poly.setAttribute("data-branch", "oblique");
      poly.setAttribute("data-route", "manual");
      el.parentNode?.replaceChild(poly, el);
      state.selection = [poly];
      state.activeEl = poly;
    } else {
      el.setAttribute("points", formatPointsAttr(next));
      el.setAttribute("data-branch", "oblique");
      el.setAttribute("data-route", "manual");
    }
    render();
    setStatus("Dodano ukos 45° przy szynie.", { toast: true, tone: "success" });
    return true;
  }

  async function finishShape() {
    if (!state.drawMode || !state.drawing) {
      exitDraw();
      return;
    }
    const k = state.drawing.kind;
    if (k === "line") {
      finishLineDraw();
      return;
    }
    if (k === "branch") {
      if (state.drawing.trunk && state.drawing.pts.length >= 2) finishBranchDraw();
      else {
        exitDraw();
        render();
        setStatus("Anulowano odgałęzienie.");
      }
      return;
    }
    captureToolStyleFromToolbar();
    const pts = state.drawing.pts.slice();
    const node = currentSymNode();
    if (k === "point" || k === "lead") {
      const conn = await finishConnDraw(k, pts, node);
      exitDraw();
      if (!node) {
        render();
        return;
      }
      if (!conn) {
        setStatus("Anulowano dodawanie złącza.");
        render();
        return;
      }
      pushUndo();
      node.appendChild(conn);
      state.selection = [conn];
      state.activeEl = conn;
      render();
      setStatus(
        "Dodano złącze " +
          (conn.getAttribute("data-ref") ? conn.getAttribute("data-ref") + ":" : "") +
          conn.getAttribute("data-pin") +
          "."
      );
      return;
    }
    exitDraw();
    if (!node) {
      render();
      return;
    }
    const added = [];
    if (k === "rect") {
      if (pts.length < 2) {
        render();
        return;
      }
      const x = Math.min(pts[0][0], pts[1][0]);
      const y = Math.min(pts[0][1], pts[1][1]);
      const w = Math.abs(pts[1][0] - pts[0][0]);
      const h = Math.abs(pts[1][1] - pts[0][1]);
      if (w < 0.5 || h < 0.5) {
        render();
        setStatus("Za mały prostokąt.");
        return;
      }
      const el = mkEl("rect", { x, y, width: w, height: h, class: "sym" });
      styleShape(el);
      added.push(el);
    } else if (k === "circle") {
      if (pts.length < 2) {
        render();
        return;
      }
      const r = Math.hypot(pts[1][0] - pts[0][0], pts[1][1] - pts[0][1]);
      if (r < 0.5) {
        render();
        setStatus("Za mały okrąg.");
        return;
      }
      const el = mkEl("circle", { cx: pts[0][0], cy: pts[0][1], r: Math.round(r * 100) / 100, class: "sym" });
      styleShape(el);
      added.push(el);
    } else if (k === "arc") {
      if (pts.length < 3) {
        render();
        return;
      }
      const el = mkEl("path", { d: arcPath(pts[0], pts[1], pts[2]), class: "sym" });
      styleShape(el);
      added.push(el);
    } else if (k === "text") {
      const c = pts[0];
      const t = promptFn("Tekst:", "TXT");
      if (t === null) {
        render();
        return;
      }
      const el = mkEl("text", { x: c[0], y: c[1], class: "pin" });
      el.textContent = t;
      styleText(el);
      added.push(el);
    } else if (k === "node") {
      const el = mkEl("circle", { cx: pts[0][0], cy: pts[0][1], r: 4, class: "node" });
      styleNode(el);
      ensureNodeRef(el, node);
      added.push(el);
    }
    if (!added.length) {
      render();
      return;
    }
    pushUndo();
    added.forEach((e) => node.appendChild(e));
    state.selection = added;
    state.activeEl = added[added.length - 1];
    render();
    setStatus("Dodano: " + k);
  }

  function finishLineDraw() {
    if (!state.drawMode) return;
    const snaps = state.drawing ? state.drawing.snaps.slice() : [];
    const pts = (state.drawing ? state.drawing.pts : []).filter(
      (p, i, a) => i === 0 || p[0] !== a[i - 1][0] || p[1] !== a[i - 1][1]
    );
    captureToolStyleFromToolbar();
    exitDraw();
    if (pts.length >= 2) {
      const node = currentSymNode();
      if (node) {
        pushUndo();
        let el;
        if (pts.length === 2)
          el = mkEl("line", { x1: pts[0][0], y1: pts[0][1], x2: pts[1][0], y2: pts[1][1], class: "sym" });
        else el = mkEl("polyline", { points: pts.map((p) => p.join(",")).join(" "), class: "sym" });
        styleLine(el);
        const a = snaps[0];
        const b = snaps[snaps.length - 1];
        if (a && b && a.ref && b.ref && !(a.ref === b.ref && (a.pin || "") === (b.pin || ""))) {
          const draft = {
            id: nextProposalId(),
            from: NetlistModel.parseEndpoint(endpointRawFromSnap(a)),
            to: NetlistModel.parseEndpoint(endpointRawFromSnap(b)),
            net: "—",
            wire: "do ustalenia",
            notes: "propozycja z edytora",
          };
          draft.net = NetlistModel.inferConnectionNet(draft, state.netlist?.connections || []);
          attachProposal(el, draft);
        }
        node.appendChild(el);
        state.selection = [el];
        state.activeEl = el;
        render();
        setStatus("Dodano " + (pts.length === 2 ? "linię" : "łamaną (" + pts.length + " pkt)") + ".");
        return;
      }
    }
    render();
    setStatus("Zakończono rysowanie.");
  }

  function exitDraw() {
    state.drawMode = null;
    state.drawing = null;
    stage.style.cursor = "";
    for (const kk in DRAW_BTN) {
      const b = document.getElementById(DRAW_BTN[kk]);
      if (b) b.classList.remove("primary");
    }
    clearHighlight();
    syncDrawBanner();
  }

  return {
    startDraw,
    startLineDraw,
    addDrawPoint,
    drawPreview,
    finishShape,
    finishLineDraw,
    finishBranchDraw,
    applyObliqueStubToSelection,
    exitDraw,
    jointCandidates,
    nearestJoint,
    DRAW_BTN,
    DRAW_NEED,
  };
}
