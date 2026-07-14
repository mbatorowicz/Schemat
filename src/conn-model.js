import {
  CONN_THEME,
  connStrokeColorFromState,
  readConnStrokeWidth,
  connContactRadius,
  styleConnContact,
  connAllCss,
  syncConnStylesInLib,
} from "./conn-theme.js";
import { pickPointContactByToward } from "./conn-contact-pick.js";
import { qsaByData } from "./dom-selectors.js";

const CONN_CONTACT_DIRS = { N: [0, -1], E: [1, 0], S: [0, 1], W: [-1, 0] };

export function createConnModel(ctx) {
  const { state, num, fmt, mkEl, setPositionedElement, styleText, isSchematicSheet, askConnMeta } = ctx;

  function isConnGroup(el) {
    return !!el && el.tagName && el.tagName.toLowerCase() === "g" && el.getAttribute("data-role") === "conn";
  }

  function connParts(g) {
    return {
      stub: g.querySelector('[data-part="stub"]'),
      joint: g.querySelector('[data-part="joint"]'),
      label: g.querySelector('[data-part="label"]'),
      contacts: [...g.querySelectorAll('[data-part="contact"]')],
    };
  }

  function connKind(g) {
    const k = g && g.getAttribute("data-kind");
    if (k === "point" || k === "term") return "point";
    return "lead";
  }

  function isConnPoint(g) {
    return isConnGroup(g) && connKind(g) === "point";
  }

  function isConnLead(g) {
    return isConnGroup(g) && connKind(g) === "lead";
  }

  function connJointR(g) {
    const attr = parseFloat(g.getAttribute("data-joint-r"));
    if (!isNaN(attr) && attr > 0) return attr;
    return connKind(g) === "point" ? CONN_THEME.pointJointR : 0;
  }

  function dirFromDelta(dx, dy) {
    return Math.abs(dx) >= Math.abs(dy) ? (dx >= 0 ? "E" : "W") : dy >= 0 ? "S" : "N";
  }

  function connDirVector(dir) {
    return ({ N: [0, -1], E: [1, 0], S: [0, 1], W: [-1, 0] })[dir] || [1, 0];
  }

  function syncConnJointAnchor(g) {
    const p = connParts(g);
    if (!p.stub || !p.joint) return;
    if (isConnLead(g)) {
      p.joint.setAttribute("cx", fmt(num(p.stub, "x2")));
      p.joint.setAttribute("cy", fmt(num(p.stub, "y2")));
    } else if (isConnPoint(g)) {
      const cx = num(p.joint, "cx"),
        cy = num(p.joint, "cy");
      p.stub.setAttribute("x1", fmt(cx));
      p.stub.setAttribute("y1", fmt(cy));
      p.stub.setAttribute("x2", fmt(cx));
      p.stub.setAttribute("y2", fmt(cy));
    }
  }

  function ensureConnContacts(g) {
    if (!g || !isConnGroup(g)) return;
    const kind = connKind(g),
      have = new Set([...g.querySelectorAll('[data-part="contact"]')].map((c) => c.getAttribute("data-contact")));
    const r = connContactRadius(g, state);
    if (kind === "point") {
      ["N", "E", "S", "W"].forEach((dir) => {
        if (have.has(dir)) return;
        g.appendChild(
          mkEl("circle", {
            class: "conn-contact",
            "data-part": "contact",
            "data-contact": dir,
            r,
          })
        );
      });
      [...g.querySelectorAll('[data-part="contact"][data-contact="tip"]')].forEach((c) => c.remove());
    } else {
      if (!have.has("tip"))
        g.appendChild(
          mkEl("circle", {
            class: "conn-contact",
            "data-part": "contact",
            "data-contact": "tip",
            r,
          })
        );
      [...g.querySelectorAll('[data-part="contact"]')]
        .filter((c) => c.getAttribute("data-contact") !== "tip")
        .forEach((c) => c.remove());
    }
  }

  function styleAllContacts(g) {
    const p = connParts(g);
    p.contacts.forEach((c) => styleConnContact(c, g, state, fmt));
  }

  function updateConnContacts(g) {
    if (!g || !isConnGroup(g)) return;
    ensureConnContacts(g);
    const p = connParts(g);
    if (isConnPoint(g)) {
      const cx = num(p.joint, "cx"),
        cy = num(p.joint, "cy"),
        r = connJointR(g);
      p.contacts.forEach((c) => {
        const dir = c.getAttribute("data-contact"),
          v = CONN_CONTACT_DIRS[dir];
        if (!v) return;
        c.setAttribute("cx", fmt(cx + v[0] * r));
        c.setAttribute("cy", fmt(cy + v[1] * r));
      });
    } else if (isConnLead(g)) {
      const tip = p.contacts.find((c) => c.getAttribute("data-contact") === "tip");
      if (tip) {
        tip.setAttribute("cx", fmt(num(p.stub, "x2")));
        tip.setAttribute("cy", fmt(num(p.stub, "y2")));
      }
    }
    styleAllContacts(g);
  }

  function applyConnStyle(g, opts = {}) {
    if (!g || !isConnGroup(g)) return;
    const touchLabel = !!opts.label;
    const p = connParts(g),
      kind = connKind(g),
      col = connStrokeColorFromState(state),
      sw = fmt(readConnStrokeWidth(g, state));
    syncConnJointAnchor(g);
    if (kind === "point") {
      const jr = connJointR(g);
      if (p.joint) {
        p.joint.setAttribute("class", "conn-joint");
        p.joint.setAttribute("r", fmt(jr));
        p.joint.style.display = "";
        p.joint.style.visibility = "visible";
        p.joint.style.stroke = col;
        p.joint.style.strokeWidth = sw;
        p.joint.style.fill = "none";
        p.joint.style.pointerEvents = "none";
        g.setAttribute("data-joint-r", fmt(jr));
      }
      if (p.stub) {
        p.stub.setAttribute("class", "conn-stub");
        p.stub.style.stroke = "none";
        p.stub.style.fill = "none";
      }
    } else {
      if (p.stub) {
        p.stub.setAttribute("class", "conn-stub");
        p.stub.style.stroke = col;
        p.stub.style.strokeWidth = sw;
        p.stub.style.fill = "none";
        p.stub.style.strokeDasharray = "none";
        p.stub.style.strokeLinecap = CONN_THEME.stubLinecap;
      }
      if (p.joint) {
        p.joint.setAttribute("class", "conn-joint");
        p.joint.setAttribute("r", "0");
        p.joint.style.display = "none";
        p.joint.style.visibility = "hidden";
        p.joint.style.stroke = "none";
        p.joint.style.fill = "none";
        p.joint.style.pointerEvents = "none";
      }
    }
    ensureConnContacts(g);
    updateConnContacts(g);
    if (p.label && touchLabel) styleText(p.label, { force: true });
  }

  function updateConnLabel(g) {
    const p = connParts(g);
    const pin = (g.getAttribute("data-pin") || "PIN").trim();
    const refRaw = (g.getAttribute("data-ref") || "").trim();
    const ref = refRaw.replace(/^[-\s]+/, "");
    p.label.textContent = ref ? `-${ref}:${pin}` : pin;
    if (g.getAttribute("data-label-manual") === "1") return;
    const dir = g.getAttribute("data-dir") || "E",
      x = num(p.joint, "cx"),
      y = num(p.joint, "cy"),
      off = 4;
    let lx = x + off,
      ly = y - 4,
      anchor = "start";
    if (dir === "E") {
      lx = x - off;
      ly = y - 4;
      anchor = "end";
    } else if (dir === "W") {
      lx = x + off;
      ly = y - 4;
      anchor = "start";
    } else if (dir === "N") {
      lx = x - 4;
      ly = y + 10;
      anchor = "end";
    } else {
      lx = x + 4;
      ly = y - 6;
      anchor = "start";
    }
    setPositionedElement(p.label, lx, ly);
    p.label.setAttribute("text-anchor", anchor);
  }

  function updateConnGeometry(g) {
    const p = connParts(g),
      x1 = num(p.stub, "x1"),
      y1 = num(p.stub, "y1"),
      x2 = num(p.stub, "x2"),
      y2 = num(p.stub, "y2");
    g.setAttribute("data-dir", dirFromDelta(x2 - x1, y2 - y1));
    g.setAttribute("data-len", fmt(Math.hypot(x2 - x1, y2 - y1)));
    syncConnJointAnchor(g);
    updateConnContacts(g);
    updateConnLabel(g);
  }

  function setConnOuterFree(g, x, y) {
    const p = connParts(g);
    p.stub.setAttribute("x2", fmt(x));
    p.stub.setAttribute("y2", fmt(y));
    p.joint.setAttribute("cx", fmt(x));
    p.joint.setAttribute("cy", fmt(y));
    updateConnGeometry(g);
  }

  function setConnOuter(g, x, y) {
    const p = connParts(g),
      ix = num(p.stub, "x1"),
      iy = num(p.stub, "y1"),
      dir = dirFromDelta(x - ix, y - iy),
      v = connDirVector(dir);
    const len = Math.max(state.step, Math.max(Math.abs(x - ix), Math.abs(y - iy)));
    const ox = ix + v[0] * len,
      oy = iy + v[1] * len;
    p.stub.setAttribute("x2", fmt(ox));
    p.stub.setAttribute("y2", fmt(oy));
    p.joint.setAttribute("cx", fmt(ox));
    p.joint.setAttribute("cy", fmt(oy));
    g.setAttribute("data-dir", dir);
    g.setAttribute("data-len", fmt(len));
    updateConnLabel(g);
    updateConnContacts(g);
  }

  function setConnPointCenter(g, cx, cy) {
    const p = connParts(g),
      ox = num(p.joint, "cx"),
      oy = num(p.joint, "cy"),
      dx = cx - ox,
      dy = cy - oy;
    p.stub.setAttribute("x1", fmt(cx));
    p.stub.setAttribute("y1", fmt(cy));
    p.stub.setAttribute("x2", fmt(cx));
    p.stub.setAttribute("y2", fmt(cy));
    p.joint.setAttribute("cx", fmt(cx));
    p.joint.setAttribute("cy", fmt(cy));
    setPositionedElement(p.label, num(p.label, "x") + dx, num(p.label, "y") + dy);
    updateConnContacts(g);
  }

  function moveConn(g, dx, dy) {
    const p = connParts(g);
    if (isConnPoint(g)) {
      setConnPointCenter(g, num(p.joint, "cx") + dx, num(p.joint, "cy") + dy);
      return;
    }
    [
      ["x1", "y1"],
      ["x2", "y2"],
    ].forEach(([ax, ay]) => {
      p.stub.setAttribute(ax, fmt(num(p.stub, ax) + dx));
      p.stub.setAttribute(ay, fmt(num(p.stub, ay) + dy));
    });
    p.joint.setAttribute("cx", fmt(num(p.joint, "cx") + dx));
    p.joint.setAttribute("cy", fmt(num(p.joint, "cy") + dy));
    setPositionedElement(p.label, num(p.label, "x") + dx, num(p.label, "y") + dy);
    updateConnContacts(g);
  }

  function pushConnContactCandidates(out, g, mapXY, ref, pin, element) {
    updateConnContacts(g);
    if (isConnPoint(g)) {
      connParts(g).contacts.forEach((c) => {
        const q = mapXY(num(c, "cx"), num(c, "cy"));
        out.push({ x: q[0], y: q[1], dir: c.getAttribute("data-contact") || "E", ref, pin, element });
      });
    } else {
      const ep = connEndpointCoords(g, mapXY);
      out.push({ x: ep.x, y: ep.y, dir: ep.dir, ref, pin, element });
    }
  }

  /** Wybór najlepszego styku punktu w kierunku towardXY (układ arkusza). */
  function bestPointContact(g, mapXY, towardXY) {
    updateConnContacts(g);
    const map = mapXY || ((x, y) => [x, y]);
    const p = connParts(g);
    const centerQ = map(num(p.joint, "cx"), num(p.joint, "cy"));
    const center = { x: centerQ[0], y: centerQ[1] };
    const toward = towardXY && (towardXY.x != null || towardXY[0] != null)
      ? { x: towardXY.x != null ? towardXY.x : towardXY[0], y: towardXY.y != null ? towardXY.y : towardXY[1] }
      : { x: center.x + 1, y: center.y };
    const contacts = p.contacts.map((c) => {
      const q = map(num(c, "cx"), num(c, "cy"));
      return { x: q[0], y: q[1], dir: c.getAttribute("data-contact") || "E" };
    });
    return pickPointContactByToward(contacts, center, toward);
  }

  /** Wspólny punkt styku dla snapu i routingu netlisty (nie środek jointa). */
  function connEndpointCoords(g, mapXY, towardXY) {
    updateConnContacts(g);
    const map = mapXY || ((x, y) => [x, y]);
    if (isConnPoint(g)) {
      if (towardXY != null) return bestPointContact(g, map, towardXY);
      const p = connParts(g);
      const c = p.contacts.find((x) => x.getAttribute("data-contact") === "E") || p.contacts[0];
      if (c) {
        const q = map(num(c, "cx"), num(c, "cy"));
        return { x: q[0], y: q[1], dir: c.getAttribute("data-contact") || "E" };
      }
      const j = p.joint;
      const q = map(num(j, "cx"), num(j, "cy"));
      return { x: q[0], y: q[1], dir: "E" };
    }
    const p = connParts(g);
    const q = map(num(p.stub, "x2"), num(p.stub, "y2"));
    const dir = g.getAttribute("data-dir") || dirFromDelta(num(p.stub, "x2") - num(p.stub, "x1"), num(p.stub, "y2") - num(p.stub, "y1"));
    return { x: q[0], y: q[1], dir };
  }

  function lastConnRefOnSheet(node) {
    const refs = [...node.querySelectorAll('[data-role="conn"][data-ref]')]
      .map((c) => c.getAttribute("data-ref"))
      .filter(Boolean);
    return refs.length ? refs[refs.length - 1] : "X1";
  }

  function nextConnPinOnSheet(node, ref) {
    const pins = qsaByData(node, "ref", ref)
      .filter((c) => c.getAttribute("data-role") === "conn")
      .map((c) => (c.getAttribute("data-pin") || "").trim())
      .filter(Boolean);
    const nums = pins.map((p) => parseInt(p, 10)).filter((n) => !isNaN(n));
    if (nums.length) return String(Math.max(...nums) + 1);
    return "1";
  }

  async function promptConnMeta(node) {
    if (askConnMeta) return askConnMeta(node);
    let ref = "";
    let pin = "";
    if (isSchematicSheet(node)) {
      ref = (prompt("Oznaczenie listwy/elementu:", lastConnRefOnSheet(node)) || "").trim().replace(/^-/, "");
      if (!ref) return null;
      pin = (prompt("Numer przyłącza (pin):", nextConnPinOnSheet(node, ref)) || "").trim();
    } else {
      pin = (prompt("Numer przyłącza (pin):", "1") || "").trim();
    }
    if (!pin) return null;
    return { ref, pin };
  }

  function mkConn({ kind, ix, iy, ox, oy, pin, ref }) {
    const isPoint = kind === "point";
    const jx = isPoint ? ix : ox,
      jy = isPoint ? iy : oy;
    const jr = isPoint ? CONN_THEME.pointJointR : 0;
    const g = mkEl("g", {
      "data-role": "conn",
      "data-kind": isPoint ? "point" : "lead",
      "data-pin": pin || "1",
      "data-dir": isPoint ? "E" : dirFromDelta(ox - ix, oy - iy),
    });
    if (isPoint) g.setAttribute("data-joint-r", fmt(CONN_THEME.pointJointR));
    const stub = mkEl("line", {
      x1: ix,
      y1: iy,
      x2: isPoint ? ix : ox,
      y2: isPoint ? iy : oy,
      class: "conn-stub",
      "data-part": "stub",
    });
    const joint = mkEl("circle", {
      cx: jx,
      cy: jy,
      r: isPoint ? jr : 0,
      class: "conn-joint",
      "data-part": "joint",
      "data-joint": "outer",
    });
    const label = mkEl("text", { x: jx, y: jy, class: "pin", "data-part": "label", "data-rotate-with": "1" });
    g.append(stub, joint, label);
    if (ref) g.setAttribute("data-ref", ref);
    if (!isPoint) updateConnGeometry(g);
    applyConnStyle(g, { label: true });
    updateConnLabel(g);
    return g;
  }

  async function finishConnDraw(drawKind, pts, node) {
    if (!node) return null;
    if (drawKind === "point") {
      if (!pts.length) return null;
      const meta = await promptConnMeta(node);
      if (!meta) return null;
      const g = mkConn({
        kind: "point",
        ix: pts[0][0],
        iy: pts[0][1],
        ox: pts[0][0],
        oy: pts[0][1],
        pin: meta.pin,
        ref: meta.ref || undefined,
      });
      return g;
    }
    if (drawKind === "lead") {
      if (pts.length < 2) return null;
      const len = Math.hypot(pts[1][0] - pts[0][0], pts[1][1] - pts[0][1]);
      if (len < state.step) return null;
      const meta = await promptConnMeta(node);
      if (!meta) return null;
      return mkConn({
        kind: "lead",
        ix: pts[0][0],
        iy: pts[0][1],
        ox: pts[1][0],
        oy: pts[1][1],
        pin: meta.pin,
        ref: meta.ref || undefined,
      });
    }
    return null;
  }

  function connStrokeTargets(r) {
    if (!isConnGroup(r.el)) return [r.el];
    const p = connParts(r.el);
    if (isConnPoint(r.el)) return [p.joint].filter(Boolean);
    return [p.stub].filter(Boolean);
  }

  function connFillTarget(r) {
    if (isConnGroup(r.el) && isConnPoint(r.el)) return connParts(r.el).joint;
    return r.el;
  }

  function connStyleSampleEl(el, cel) {
    if (!isConnGroup(el)) return cel;
    return isConnPoint(el) ? cel.querySelector('[data-part="joint"]') : cel.querySelector('[data-part="stub"]');
  }

  function migrateConnModel(lib, sheets, SVGNS) {
    let changed = false;
    function normalizeConn(g) {
      if (!g || g.getAttribute("data-role") !== "conn") return;
      const p = connParts(g);
      if (!p.stub || !p.joint) return;
      let kind = g.getAttribute("data-kind");
      if (kind === "term") {
        g.setAttribute("data-kind", "point");
        kind = "point";
        changed = true;
      } else if (kind === "stub") {
        g.setAttribute("data-kind", "lead");
        kind = "lead";
        changed = true;
      } else if (!kind) {
        const len = Math.hypot(num(p.stub, "x2") - num(p.stub, "x1"), num(p.stub, "y2") - num(p.stub, "y1"));
        const hidden = p.stub.getAttribute("stroke") === "none" || p.stub.style.stroke === "none" || len < 0.5;
        kind = hidden ? "point" : "lead";
        g.setAttribute("data-kind", kind);
        changed = true;
      }
      const jr = parseFloat(g.getAttribute("data-joint-r"));
      const defR = kind === "point" ? CONN_THEME.pointJointR : 0;
      if (kind === "point" && (isNaN(jr) || jr <= 0)) {
        g.setAttribute("data-joint-r", fmt(defR));
        changed = true;
      }
      syncConnJointAnchor(g);
      applyConnStyle(g);
      if (p.joint.classList && p.joint.classList.contains("term")) {
        p.joint.classList.remove("term");
        changed = true;
      }
    }
    function walk(svg) {
      if (!svg) return;
      [...svg.querySelectorAll('[data-role="conn"]')].forEach(normalizeConn);
    }
    if (lib) {
      walk(lib.svg);
      syncConnStylesInLib(lib.svg, SVGNS);
    }
    sheets.forEach((sh) => walk(sh.svg));
    return changed;
  }

  return {
    isConnGroup,
    isConnPoint,
    isConnLead,
    connParts,
    connKind,
    connJointR,
    connStrokeTargets,
    connFillTarget,
    connStyleSampleEl,
    applyConnStyle,
    ensureConnContacts,
    updateConnContacts,
    updateConnGeometry,
    updateConnLabel,
    syncConnJointAnchor,
    setConnOuter,
    setConnOuterFree,
    setConnPointCenter,
    moveConn,
    pushConnContactCandidates,
    connEndpointCoords,
    bestPointContact,
    promptConnMeta,
    lastConnRefOnSheet,
    nextConnPinOnSheet,
    mkConn,
    finishConnDraw,
    migrateConnModel,
    dirFromDelta,
    connDirVector,
  };
}

export { connAllCss, syncConnStylesInLib };
