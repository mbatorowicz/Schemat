/**
 * Orientacja opisów instancji — zawsze czytelne (kąt 0° na stronie).
 * Pozycja x/y może jeździć z symbolem; napisy nie obracają się razem z <use>.
 * Numery styków z defs → osobne text na arkuszu (syncInstancePinLabels).
 */

import { num } from "./svg-utils.js";
import { SVGNS } from "./svg-constants.js";
import { readUseOrient, mapLocalToSheet, mapSheetToLocal } from "./instance-orient.js";

function fmtAng(v) {
  const n = Number(v);
  if (!Number.isFinite(n)) return "0";
  const t = Math.round(n * 1000) / 1000;
  return String(t);
}

function normalizeAngleDeg(ang) {
  let a = Number(ang) || 0;
  while (a > 180) a -= 360;
  while (a <= -180) a += 360;
  return a;
}

function findUseByRef(node, ref) {
  if (!node || !ref) return null;
  return (
    [...node.children].find(
      (el) => el.tagName && el.tagName.toLowerCase() === "use" && (el.getAttribute("data-ref") || "") === ref
    ) || null
  );
}

/** Wymuś czytelny napis (0°) w aktualnej pozycji. */
function applyUprightText(textEl) {
  if (!textEl) return;
  if (textEl.getAttribute("data-rotate-with") === "0") return;
  if (textEl.getAttribute("data-role") === "wire-mark") return;
  const x = num(textEl, "x");
  const y = num(textEl, "y");
  textEl.setAttribute("data-ang", "0");
  textEl.setAttribute("transform", `rotate(0 ${fmtAng(x)} ${fmtAng(y)})`);
}

function findSheetPinLabel(node, ref, pin) {
  return (
    [...node.children].find(
      (el) =>
        el.tagName &&
        el.tagName.toLowerCase() === "text" &&
        (el.getAttribute("data-owner-ref") || "") === ref &&
        (el.getAttribute("data-label") || "") === "pin" &&
        (el.getAttribute("data-pin") || "") === pin
    ) || null
  );
}

function sheetHasConnPin(node, ref, pin) {
  return [...node.children].some(
    (el) =>
      el.getAttribute?.("data-role") === "conn" &&
      (el.getAttribute("data-ref") || "") === ref &&
      (el.getAttribute("data-pin") || "") === pin
  );
}

function mkPinText(attrs) {
  const el = document.createElementNS(SVGNS, "text");
  for (const [k, v] of Object.entries(attrs)) {
    if (v != null) el.setAttribute(k, String(v));
  }
  return el;
}

export function isSheetPinLabel(el) {
  return !!(el && el.tagName?.toLowerCase() === "text" && (el.getAttribute("data-label") || "") === "pin");
}

/**
 * Zapisz ręczną pozycję pinu w układzie lokalnym symbolu (przetrwa sync/render).
 * @returns {boolean}
 */
export function markSheetPinLabelManual(lbl, use) {
  if (!isSheetPinLabel(lbl) || !use) return false;
  const ux = num(use, "x");
  const uy = num(use, "y");
  const orient = readUseOrient(use);
  const [lx, ly] = mapSheetToLocal(ux, uy, orient, num(lbl, "x"), num(lbl, "y"));
  lbl.setAttribute("data-label-manual", "1");
  lbl.setAttribute("data-local-x", fmtAng(lx));
  lbl.setAttribute("data-local-y", fmtAng(ly));
  return true;
}

/**
 * Materializuj czytelne numery styków na arkuszu (z defs, poza transformem <use>).
 * @param {Element} node — węzeł arkusza
 * @param {{
 *   definitionForUse?: (use: Element) => Element|null,
 *   mkEl?: Function,
 *   styleText?: (el: Element) => void,
 * }} [opts]
 * @returns {number} ile napisów pinów zaktualizowano/utworzono
 */
export function syncInstancePinLabels(node, opts = {}) {
  if (!node) return 0;
  const definitionForUse = typeof opts.definitionForUse === "function" ? opts.definitionForUse : null;
  if (!definitionForUse) return 0;
  const makeText = typeof opts.mkEl === "function" ? opts.mkEl : null;
  const styleText = typeof opts.styleText === "function" ? opts.styleText : null;
  let n = 0;

  [...node.children].forEach((use) => {
    if (!use.tagName || use.tagName.toLowerCase() !== "use") return;
    const ref = (use.getAttribute("data-ref") || "").trim();
    if (!ref) return;
    const def = definitionForUse(use);
    if (!def) return;
    const ux = num(use, "x");
    const uy = num(use, "y");
    const orient = readUseOrient(use);
    const keepPins = new Set();

    [...def.querySelectorAll('[data-role="conn"]')].forEach((conn) => {
      const pin = (conn.getAttribute("data-pin") || "").trim();
      if (!pin) return;
      if (sheetHasConnPin(node, ref, pin)) return;
      const defLabel = conn.querySelector?.('[data-part="label"]');
      if (!defLabel) return;
      keepPins.add(pin);

      let lbl = findSheetPinLabel(node, ref, pin);
      if (!lbl) {
        const attrs = {
          x: ux,
          y: uy,
          class: "pin",
          "data-owner-ref": ref,
          "data-label": "pin",
          "data-pin": pin,
          "data-ang": "0",
        };
        lbl = makeText ? makeText("text", attrs) : mkPinText(attrs);
        lbl.textContent = pin;
        if (styleText) styleText(lbl);
        node.appendChild(lbl);
      }

      const manual = lbl.getAttribute("data-label-manual") === "1" && lbl.hasAttribute("data-local-x");
      const lx = manual ? parseFloat(lbl.getAttribute("data-local-x")) : num(defLabel, "x");
      const ly = manual ? parseFloat(lbl.getAttribute("data-local-y") || "0") : num(defLabel, "y");
      const [sx, sy] = mapLocalToSheet(ux, uy, orient, lx, ly);
      lbl.setAttribute("x", fmtAng(sx));
      lbl.setAttribute("y", fmtAng(sy));
      lbl.textContent = pin;
      lbl.setAttribute("data-ang", "0");
      lbl.setAttribute("transform", `rotate(0 ${fmtAng(sx)} ${fmtAng(sy)})`);

      if (!manual) {
        let anchor = defLabel.getAttribute("text-anchor") || "start";
        if (orient.flipH) {
          if (anchor === "start") anchor = "end";
          else if (anchor === "end") anchor = "start";
        }
        lbl.setAttribute("text-anchor", anchor);
      }
      n += 1;
    });

    [...node.children].forEach((el) => {
      if (!el.tagName || el.tagName.toLowerCase() !== "text") return;
      if ((el.getAttribute("data-owner-ref") || "") !== ref) return;
      if ((el.getAttribute("data-label") || "") !== "pin") return;
      const pin = (el.getAttribute("data-pin") || "").trim();
      if (pin && keepPins.has(pin)) return;
      if (sheetHasConnPin(node, ref, pin)) return;
      el.remove();
    });
  });

  return n;
}

/**
 * Ustaw kąt 0° na wszystkich opisach instancji (desig/desc + pin labels).
 * @returns {number} ile tekstów zaktualizowano
 */
export function syncInstanceLabelAngles(node, ref, opts = {}) {
  if (!node || !ref) return 0;
  const use = typeof opts.findUse === "function" ? opts.findUse(node, ref) : findUseByRef(node, ref);
  if (!use) return 0;
  let n = 0;
  [...node.children].forEach((el) => {
    if (!el.tagName || el.tagName.toLowerCase() !== "text") return;
    if ((el.getAttribute("data-owner-ref") || "") !== ref) return;
    applyUprightText(el);
    n += 1;
  });
  const connParts = typeof opts.connParts === "function" ? opts.connParts : null;
  [...node.children].forEach((el) => {
    if (!el.getAttribute || el.getAttribute("data-role") !== "conn") return;
    if ((el.getAttribute("data-ref") || "") !== ref) return;
    const label = connParts ? connParts(el).label : el.querySelector?.('[data-part="label"]');
    if (!label) return;
    applyUprightText(label);
    n += 1;
  });
  return n;
}

/** Ustaw czytelne napisy dla wszystkich instancji na arkuszu. */
export function syncAllInstanceLabelAngles(node, opts = {}) {
  if (!node) return 0;
  const refs = new Set();
  [...node.children].forEach((el) => {
    if (el.tagName && el.tagName.toLowerCase() === "use") {
      const r = (el.getAttribute("data-ref") || "").trim();
      if (r) refs.add(r);
    }
  });
  let n = 0;
  refs.forEach((r) => {
    n += syncInstanceLabelAngles(node, r, opts);
  });
  return n;
}

export function instanceRefsFromElements(els) {
  const refs = new Set();
  (els || []).forEach((el) => {
    if (!el) return;
    const tag = el.tagName?.toLowerCase?.() || "";
    if (tag === "use") {
      const r = (el.getAttribute("data-ref") || "").trim();
      if (r) refs.add(r);
      return;
    }
    if (el.getAttribute?.("data-role") === "conn") {
      const r = (el.getAttribute("data-ref") || "").trim();
      if (r) refs.add(r);
      return;
    }
    if (tag === "text") {
      const r = (el.getAttribute("data-owner-ref") || "").trim();
      if (r) refs.add(r);
    }
  });
  return [...refs];
}

/** Czy tekst to opis instancji (desig/desc) — pozycja z symbolem, kąt zawsze 0. */
export function isInstanceOwnedText(el) {
  return !!(el && el.tagName?.toLowerCase() === "text" && (el.getAttribute("data-owner-ref") || "").trim());
}

export { normalizeAngleDeg, findUseByRef };
