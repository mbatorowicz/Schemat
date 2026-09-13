/**
 * Składanie <defs> — jedna implementacja klonowania symboli/CSS dla podglądu i zapisu.
 */
import { canonicalSymbolId } from "./symbol-aliases.js";
import {
  libSymbolGroups,
  resolveLibSymbol,
  resolveSheetSymbol,
  syncUseSymbolHrefs,
  parseUseHref,
} from "./symbol-service.js";
import { SVGNS, XLINK } from "./svg-constants.js";
import { sanitizeSvgDom, serializeSvg, fmt as fmtDefault } from "./svg-utils.js";

/** Klon z CSS stroke/fill jako var(--object-stroke) dla edycji kolorów symboli. */
export function useColorAwareClone(node) {
  const clone = node.cloneNode(true);
  if (clone.tagName && clone.tagName.toLowerCase() === "style") {
    clone.textContent = (clone.textContent || "")
      .replace(/stroke\s*:\s*([^;}\n]+)/g, (all, v) => {
        const value = v.trim();
        return value === "none" || value.indexOf("var(") >= 0 ? all : "stroke:var(--object-stroke," + value + ")";
      })
      .replace(/(\.node\s*\{[^}]*?)fill\s*:\s*([^;}\n]+)/g, (all, prefix, v) => {
        const value = v.trim();
        return value === "none" || value.indexOf("var(") >= 0
          ? all
          : prefix + "fill:var(--object-stroke," + value + ")";
      })
      .replace(/(\.pin\s*\{[^}]*?)fill\s*:\s*([^;}\n]+)/g, (all, prefix, v) => {
        const value = v.trim();
        return value === "none" || value.indexOf("var(") >= 0
          ? all
          : prefix + "fill:var(--object-stroke," + value + ")";
      })
      .replace(/(\.did\s*\{[^}]*?)fill\s*:\s*([^;}\n]+)/g, (all, prefix, v) => {
        const value = v.trim();
        return value === "none" || value.indexOf("var(") >= 0
          ? all
          : prefix + "fill:var(--object-stroke," + value + ")";
      });
    return clone;
  }
  [clone, ...clone.querySelectorAll("*")].forEach((n) => {
    const attr = n.getAttribute && n.getAttribute("stroke");
    if (attr && attr !== "none" && attr.indexOf("var(") < 0)
      n.setAttribute("stroke", "var(--object-stroke," + attr + ")");
    if (n.style && n.style.stroke && n.style.stroke !== "none" && n.style.stroke.indexOf("var(") < 0)
      n.style.stroke = "var(--object-stroke," + n.style.stroke + ")";
    if (n.classList && (n.classList.contains("node") || n.classList.contains("pin") || n.classList.contains("did"))) {
      const fill = n.getAttribute("fill");
      if (fill && fill !== "none" && fill.indexOf("var(") < 0)
        n.setAttribute("fill", "var(--object-stroke," + fill + ")");
      if (n.style && n.style.fill && n.style.fill !== "none" && n.style.fill.indexOf("var(") < 0)
        n.style.fill = "var(--object-stroke," + n.style.fill + ")";
    }
  });
  return clone;
}

function appendSymbolAlias(aliasId, canonId, editDefs, added, xlinkNs) {
  if (!aliasId || aliasId === canonId || added.has(aliasId) || !added.has(canonId)) return;
  const alias = document.createElementNS(SVGNS, "g");
  alias.id = aliasId;
  const inner = document.createElementNS(SVGNS, "use");
  inner.setAttribute("href", "#" + canonId);
  inner.setAttributeNS(xlinkNs, "xlink:href", "#" + canonId);
  alias.appendChild(inner);
  editDefs.appendChild(alias);
  added.add(aliasId);
}

function resolveSymbolForEdit(id, libSvg, sheetSvg) {
  const canon = canonicalSymbolId(id);
  return (
    resolveLibSymbol(libSvg, id) ||
    resolveLibSymbol(libSvg, canon) ||
    resolveSheetSymbol(sheetSvg, canon) ||
    resolveSheetSymbol(sheetSvg, id)
  );
}

/** Ukryj napisy pinów w klonie defs (malują się przez <use> — na arkuszu są osobne teksty). */
export function hideDefPinLabels(clone) {
  if (!clone?.querySelectorAll) return;
  clone.querySelectorAll('[data-part="label"]').forEach((el) => {
    el.setAttribute("display", "none");
  });
}

export function appendEditDefSymbol(id, editDefs, added, { libSvg, sheetSvg, xlinkNs, hidePinLabels = false }) {
  const raw = String(id || "").replace(/^#/, "");
  if (!raw) return;
  const sym = resolveSymbolForEdit(raw, libSvg, sheetSvg);
  const targetId = sym?.id || canonicalSymbolId(raw);

  if (!added.has(targetId)) {
    if (!sym) {
      console.warn("Brak symbolu (bibl./arkusz):", raw, "→", targetId);
    } else {
      const clone = useColorAwareClone(sym);
      clone.id = targetId;
      if (hidePinLabels) hideDefPinLabels(clone);
      editDefs.appendChild(clone);
      added.add(targetId);
    }
  }

  if (raw !== targetId) appendSymbolAlias(raw, targetId, editDefs, added, xlinkNs);
}

/**
 * Buduje editDefs na scenie edycji — SSOT dla rozwiązywania <use> w podglądzie.
 * @returns {{ missing: string[] }}
 */
export function assembleEditDefs(editDefs, opts) {
  const { libSvg, sheetSvg, sheetNode, xlinkNs, libraryPreview = false, hidePinLabels = false } = opts;
  editDefs.innerHTML = "";
  const styleEl = (libSvg && libSvg.querySelector("defs style")) || (sheetSvg && sheetSvg.querySelector("defs style"));
  if (styleEl) editDefs.appendChild(useColorAwareClone(styleEl));

  const added = new Set();
  const missing = [];
  const defOpts = { libSvg, sheetSvg, xlinkNs, hidePinLabels: !libraryPreview && hidePinLabels };

  if (libraryPreview && libSvg) {
    libSymbolGroups(libSvg).forEach((s) => appendEditDefSymbol(s.id, editDefs, added, defOpts));
    return { missing };
  }

  if (!sheetNode) return { missing };

  syncUseSymbolHrefs(sheetNode, xlinkNs, libSvg);
  sheetNode.querySelectorAll("use").forEach((u) => {
    const href = parseUseHref(u, xlinkNs);
    if (!href) return;
    const before = added.size;
    appendEditDefSymbol(href, editDefs, added, defOpts);
    const sym = resolveSymbolForEdit(href, libSvg, sheetSvg);
    const targetId = sym?.id || canonicalSymbolId(href);
    if (!added.has(targetId) && before === added.size) missing.push(targetId);
  });

  return { missing: [...new Set(missing)] };
}

/**
 * Dokument SVG eksportu symbolu — te same klony defs co podgląd.
 * Nie skleja XML ręcznie.
 */
export function exportSymbolSvg({
  node,
  libSvg,
  sheetSvg,
  bbox,
  fmt: fmtFn = fmtDefault,
  xlinkNs = XLINK,
  margin = 8,
}) {
  if (!node) return "";
  const x = bbox ? fmtFn(bbox.x - margin) : "-20";
  const y = bbox ? fmtFn(bbox.y - margin) : "-20";
  const w = bbox ? fmtFn(bbox.width + 2 * margin) : "200";
  const h = bbox ? fmtFn(bbox.height + 2 * margin) : "200";

  const svg = document.createElementNS(SVGNS, "svg");
  svg.setAttribute("xmlns", SVGNS);
  svg.setAttribute("xmlns:xlink", xlinkNs);
  svg.setAttribute("viewBox", x + " " + y + " " + w + " " + h);
  svg.setAttribute("width", w);
  svg.setAttribute("height", h);

  const defs = document.createElementNS(SVGNS, "defs");
  svg.appendChild(defs);
  assembleEditDefs(defs, {
    libSvg,
    sheetSvg: sheetSvg || libSvg,
    sheetNode: null,
    xlinkNs,
    libraryPreview: true,
  });

  const body = node.cloneNode(true);
  if (body.removeAttribute) body.removeAttribute("id");
  svg.appendChild(body);

  sanitizeSvgDom(svg);
  return serializeSvg(svg) + "\n";
}
