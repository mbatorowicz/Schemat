/**
 * Resolver celów stylu — jeden model dla koloru, obrysu, wypełnienia i typografii.
 */
import { qsaByOwnerRef } from "./dom-selectors.js";
import { paintVisible } from "./selection-model.js";

export const STROKE_TAGS = new Set(["line", "rect", "circle", "polyline", "polygon", "path"]);
export const FILL_TAGS = new Set(["rect", "circle", "polygon", "path"]);

export function emptyStyleTargets() {
  return { cssVarHosts: [], strokes: [], fills: [], texts: [] };
}

function pushUnique(arr, seen, el) {
  if (!el || seen.has(el)) return;
  seen.add(el);
  arr.push(el);
}

/** Łączy wiele zestawów celów z deduplikacją elementów DOM. */
export function mergeStyleTargets(list) {
  const out = emptyStyleTargets();
  const seen = new Set();
  for (const t of list || []) {
    if (!t) continue;
    for (const el of t.cssVarHosts || []) pushUnique(out.cssVarHosts, seen, el);
    for (const el of t.strokes || []) pushUnique(out.strokes, seen, el);
    for (const el of t.fills || []) pushUnique(out.fills, seen, el);
    for (const el of t.texts || []) pushUnique(out.texts, seen, el);
  }
  return out;
}

/** Etykiety oznaczenia instancji powiązane z <use data-ref>. */
export function ownedLabelsForUse(useEl, sheetNode) {
  if (!useEl || !sheetNode) return [];
  const ref = (useEl.getAttribute("data-ref") || "").trim();
  if (!ref) return [];
  return qsaByOwnerRef(sheetNode, ref);
}

/**
 * @param {object} record — rekord z selectedRecords()
 * @param {object} ctx — isConnGroup, isConnPoint, connParts, connStrokeTargets, connFillTarget, sheetNode, isConnLabelMode
 */
export function resolveStyleTargets(record, ctx) {
  const targets = emptyStyleTargets();
  if (!record?.el) return targets;

  const { el, tag, cs } = record;
  const seen = new Set();

  if (ctx.isConnLabelMode?.()) {
    pushUnique(targets.texts, seen, el);
    return targets;
  }

  if (tag === "use") {
    pushUnique(targets.cssVarHosts, seen, el);
    for (const lbl of ownedLabelsForUse(el, ctx.sheetNode)) pushUnique(targets.texts, seen, lbl);
    return targets;
  }

  if (ctx.isConnGroup?.(el)) {
    pushUnique(targets.cssVarHosts, seen, el);
    for (const n of ctx.connStrokeTargets(record) || []) pushUnique(targets.strokes, seen, n);
    if (ctx.isConnPoint?.(el)) {
      const joint = ctx.connFillTarget?.(record);
      if (joint) pushUnique(targets.fills, seen, joint);
    }
    const label = ctx.connParts?.(el)?.label;
    if (label) pushUnique(targets.texts, seen, label);
    return targets;
  }

  if (tag === "text") {
    pushUnique(targets.texts, seen, el);
    return targets;
  }

  if (STROKE_TAGS.has(tag)) {
    pushUnique(targets.strokes, seen, el);
    if (FILL_TAGS.has(tag)) pushUnique(targets.fills, seen, el);
    return targets;
  }

  if (el.classList?.contains("node")) {
    pushUnique(targets.fills, seen, el);
    return targets;
  }

  if (cs && paintVisible(cs.stroke)) pushUnique(targets.strokes, seen, el);
  else if (cs && paintVisible(cs.fill)) pushUnique(targets.fills, seen, el);

  return targets;
}

export function resolveStyleTargetsForRecords(records, ctx) {
  return mergeStyleTargets((records || []).map((r) => resolveStyleTargets(r, ctx)));
}

/** Odczyt koloru głównego z rekordu (toolbar / syncSelectionToolbar). */
export function primaryColorFromRecord(record, ctx, helpers = {}) {
  const { rgbToHex, sceneDefs } = helpers;
  if (!record?.el || !rgbToHex) return null;

  const targets = resolveStyleTargets(record, ctx);

  for (const host of targets.cssVarHosts) {
    const own = host.style?.getPropertyValue("--object-stroke")?.trim();
    if (own) return rgbToHex(own) || own;
  }

  for (const el of targets.texts) {
    const inline = el.style?.fill;
    if (inline && paintVisible(inline)) {
      const hex = rgbToHex(inline);
      if (hex) return hex;
    }
    if (typeof getComputedStyle === "function") {
      const cs = getComputedStyle(el);
      if (paintVisible(cs.fill)) return rgbToHex(cs.fill);
    }
  }

  if (record.tag === "use" && sceneDefs) {
    const href = (record.el.getAttribute("href") || record.el.getAttributeNS?.("http://www.w3.org/1999/xlink", "href") || "").replace(/^#/, "");
    const def = [...sceneDefs.querySelectorAll("[id]")].find((n) => n.id === href);
    if (def) {
      for (const n of [def, ...def.querySelectorAll("*")]) {
        const cs = getComputedStyle(n);
        if (paintVisible(cs.stroke)) {
          const hex = rgbToHex(cs.stroke);
          if (hex) return hex;
        }
        if (n.classList?.contains("node") && paintVisible(cs.fill)) {
          const hex = rgbToHex(cs.fill);
          if (hex) return hex;
        }
        if (n.classList?.contains("pin") && paintVisible(cs.fill)) {
          const hex = rgbToHex(cs.fill);
          if (hex) return hex;
        }
      }
    }
  }

  for (const el of targets.strokes) {
    const inline = el.style?.stroke;
    if (inline && paintVisible(inline)) {
      const hex = rgbToHex(inline);
      if (hex) return hex;
    }
    if (typeof getComputedStyle === "function") {
      const cs = getComputedStyle(el);
      if (paintVisible(cs.stroke)) return rgbToHex(cs.stroke);
    }
  }

  for (const el of targets.fills) {
    const inline = el.style?.fill;
    if (inline && paintVisible(inline)) {
      const hex = rgbToHex(inline);
      if (hex) return hex;
    }
    if (typeof getComputedStyle === "function") {
      const cs = getComputedStyle(el);
      if (paintVisible(cs.fill)) return rgbToHex(cs.fill);
    }
  }

  if (record.cs) {
    if (paintVisible(record.cs.stroke)) return rgbToHex(record.cs.stroke);
    if (paintVisible(record.cs.fill)) return rgbToHex(record.cs.fill);
  }

  return null;
}
