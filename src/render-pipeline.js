/**
 * Pipeline renderowania: źródłowy SVG (src) ↔ klon podglądu (gHost).
 */
import { assembleEditDefs } from "./defs-assembler.js";
import { childIndex, childPair } from "./dom-pairing.js";
import { libSymbolGroups, parseUseHref, resolveSymbol, syncUseSymbolHrefs } from "./symbol-service.js";

export { useColorAwareClone, assembleEditDefs, appendEditDefSymbol } from "./defs-assembler.js";
export { childIndex, childPair, cloneChild, forEachPaired } from "./dom-pairing.js";

let nextOid = 1;
const objectIds = new WeakMap();

function oid(obj) {
  if (!obj || (typeof obj !== "object" && typeof obj !== "function")) return "0";
  let id = objectIds.get(obj);
  if (!id) {
    id = String(nextOid++);
    objectIds.set(obj, id);
  }
  return id;
}

function styleFingerprint(libSvg, sheetSvg) {
  const styleEl = (libSvg && libSvg.querySelector("defs style")) || (sheetSvg && sheetSvg.querySelector("defs style"));
  return styleEl ? `${oid(styleEl)}:${styleEl.textContent || ""}` : "";
}

function symbolFingerprint(node) {
  return node ? `${oid(node)}:${node.innerHTML || ""}` : "-";
}

/** Sygnatura tego, co `assembleEditDefs` klonuje — bez geometrii arkusza. */
export function editDefsCacheKey({ libSvg, sheetSvg, sheetNode, previewNode, libraryPreview, hidePinLabels, xlinkNs }) {
  const flags = `${libraryPreview ? 1 : 0}:${hidePinLabels ? 1 : 0}`;
  const styleKey = styleFingerprint(libSvg, sheetSvg);

  if (libraryPreview && libSvg) {
    const ids = libSymbolGroups(libSvg)
      .map((s) => s.id)
      .sort()
      .join(",");
    return `lib|${flags}|${oid(libSvg)}|${ids}|${symbolFingerprint(previewNode)}|${styleKey}`;
  }

  if (!sheetNode) {
    return `empty|${flags}|${oid(libSvg)}|${oid(sheetSvg)}|${styleKey}`;
  }

  const hrefs = [];
  sheetNode.querySelectorAll("use").forEach((u) => {
    const href = parseUseHref(u, xlinkNs);
    if (href) hrefs.push(href);
  });
  const unique = [...new Set(hrefs)].sort();
  const bodies = unique.map((id) => {
    const sym = resolveSymbol(libSvg, sheetSvg, id);
    return `${id}:${symbolFingerprint(sym)}`;
  });
  return `sheet|${flags}|${oid(libSvg)}|${oid(sheetSvg)}|${oid(sheetNode)}|${unique.join(",")}|${bodies.join(";")}|${styleKey}`;
}

export function createRenderPipeline(ctx) {
  const { state, XLINK: xlinkNs, createSVGPoint, isSheetActive, currentSymNode } = ctx;
  let defsCache = null;

  function bboxInRoot(el, root) {
    const b = el.getBBox();
    const em = el.getCTM && el.getCTM();
    const rm = root.getCTM && root.getCTM();
    if (!em || !rm) return b;
    const m = rm.inverse().multiply(em);
    const corners = [
      [b.x, b.y],
      [b.x + b.width, b.y],
      [b.x + b.width, b.y + b.height],
      [b.x, b.y + b.height],
    ].map(([x, y]) => {
      const p = createSVGPoint();
      p.x = x;
      p.y = y;
      return p.matrixTransform(m);
    });
    const xs = corners.map((p) => p.x);
    const ys = corners.map((p) => p.y);
    const x = Math.min(...xs);
    const y = Math.min(...ys);
    return { x, y, width: Math.max(...xs) - x, height: Math.max(...ys) - y };
  }

  function rebuildEditDefs(editDefs) {
    const onSheet = isSheetActive();
    const libSvg = state.lib?.svg || null;
    const sheetSvg = state.srcSvg || null;
    const previewNode = currentSymNode();
    const sheetNode = onSheet ? previewNode : null;
    const libraryPreview = !onSheet && !!libSvg;
    const hidePinLabels = onSheet;

    if (sheetNode) syncUseSymbolHrefs(sheetNode, xlinkNs, libSvg);

    const key = editDefsCacheKey({
      libSvg,
      sheetSvg,
      sheetNode,
      previewNode,
      libraryPreview,
      hidePinLabels,
      xlinkNs,
    });
    if (defsCache && defsCache.defs === editDefs && defsCache.key === key) {
      return { missing: defsCache.missing, reused: true };
    }

    const result = assembleEditDefs(editDefs, {
      libSvg,
      sheetSvg,
      sheetNode,
      xlinkNs,
      libraryPreview,
      hidePinLabels,
    });
    defsCache = { defs: editDefs, key, missing: result.missing };
    return { missing: result.missing, reused: false };
  }

  function rebuildHost(gHost) {
    gHost.innerHTML = "";
    const node = currentSymNode();
    if (!node) return null;
    const clone = node.cloneNode(true);
    clone.removeAttribute("id");
    gHost.appendChild(clone);
    return clone;
  }

  return {
    childIndex,
    childPair,
    bboxInRoot,
    rebuildEditDefs,
    rebuildHost,
  };
}
