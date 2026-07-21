/**
 * Pipeline renderowania: źródłowy SVG (src) ↔ klon podglądu (gHost).
 */
import { assembleEditDefs } from "./defs-assembler.js";
import { childIndex, childPair } from "./dom-pairing.js";

export { useColorAwareClone, assembleEditDefs, appendEditDefSymbol } from "./defs-assembler.js";
export { childIndex, childPair, cloneChild, forEachPaired } from "./dom-pairing.js";

export function createRenderPipeline(ctx) {
  const { state, XLINK: xlinkNs, createSVGPoint, isSheetActive, currentSymNode } = ctx;

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
    const sheetNode = onSheet ? currentSymNode() : null;
    return assembleEditDefs(editDefs, {
      libSvg,
      sheetSvg,
      sheetNode,
      xlinkNs,
      libraryPreview: !onSheet && !!libSvg,
      hidePinLabels: onSheet,
    });
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
