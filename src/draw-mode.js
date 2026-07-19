/**
 * Tryb rysowania kształtów i linii — wydzielone z main.js.
 */
import { DRAW_HINT } from "./draw-mode-ui.js";
import { NetlistModel } from "./netlist-model.js";

export const DRAW_NEED = {
  line: Infinity,
  rect: 2,
  circle: 2,
  arc: 3,
  text: 1,
  pin: 1,
  point: 1,
  node: 1,
  lead: 2,
};

export const DRAW_BTN = {
  line: "btnAddLine",
  rect: "btnAddRect",
  circle: "btnAddCircle",
  arc: "btnAddArc",
  text: "btnAddText",
  pin: "btnAddPin",
  point: "btnAddPoint",
  node: "btnAddNode",
  lead: "btnAddLead",
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
    prompt: promptFn = typeof window !== "undefined" ? window.prompt.bind(window) : () => null,
  } = deps;

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
      const angle = parseFloat(el.getAttribute("data-ang") || "0");
      const ref = el.getAttribute("data-ref");
      if (!def) return;
      [...def.querySelectorAll('[data-role="conn"]')].forEach((c) => {
        pushConnContactCandidates(
          out,
          c,
          (x, y) => rotatePoint(ux + x, uy + y, ux, uy, angle),
          ref,
          c.getAttribute("data-pin"),
          el
        );
      });
    });
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
    if (k === "line") {
      const a = pts.slice();
      if (cur) a.push(cur);
      if (a.length >= 2) scene.sel.appendChild(mkPrev("polyline", { points: a.map((p) => p.join(",")).join(" ") }));
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
    } else if (k === "pin") {
      const c = pts[0];
      const t = promptFn("Etykieta przyłącza (pin):", "A1");
      if (t === null) {
        render();
        return;
      }
      const anch = promptFn("Wyrównanie: start / middle / end", "start");
      if (anch === null) {
        render();
        return;
      }
      const el = mkEl("text", { x: c[0], y: c[1], class: "pin" });
      if (["start", "middle", "end"].includes(anch)) el.setAttribute("text-anchor", anch);
      el.textContent = t;
      styleText(el);
      added.push(el);
    } else if (k === "node") {
      const el = mkEl("circle", { cx: pts[0][0], cy: pts[0][1], r: 4, class: "node" });
      styleNode(el);
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
        if (a && b && !(a.ref === b.ref && a.pin === b.pin)) {
          const net = (promptFn("Oznacznik/potencjał połączenia:", "—") || "—").trim();
          const id = nextProposalId();
          const proposal = {
            id,
            from: { ref: a.ref, pin: a.pin, raw: a.ref + ":" + a.pin },
            to: { ref: b.ref, pin: b.pin, raw: b.ref + ":" + b.pin },
            signal: "",
            net,
            wire: "do ustalenia",
            notes: "propozycja z edytora",
          };
          const cls = NetlistModel.wireClass(proposal);
          el.setAttribute("class", cls);
          el.style.stroke = wireColor(cls);
          el.setAttribute("data-conn-id", id);
          el.setAttribute("data-route", "manual");
          el.setAttribute("data-from", proposal.from.raw);
          el.setAttribute("data-to", proposal.to.raw);
          el.setAttribute("data-net", net);
          el.setAttribute("data-wire", proposal.wire);
          el.setAttribute("data-notes", proposal.notes);
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
    exitDraw,
    jointCandidates,
    nearestJoint,
    DRAW_BTN,
    DRAW_NEED,
  };
}
