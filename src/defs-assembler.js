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
import { SVGNS } from "./svg-constants.js";

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
        return value === "none" || value.indexOf("var(") >= 0 ? all : prefix + "fill:var(--object-stroke," + value + ")";
      });
    return clone;
  }
  [clone, ...clone.querySelectorAll("*")].forEach((n) => {
    const attr = n.getAttribute && n.getAttribute("stroke");
    if (attr && attr !== "none" && attr.indexOf("var(") < 0) n.setAttribute("stroke", "var(--object-stroke," + attr + ")");
    if (n.style && n.style.stroke && n.style.stroke !== "none" && n.style.stroke.indexOf("var(") < 0)
      n.style.stroke = "var(--object-stroke," + n.style.stroke + ")";
    if (n.classList && n.classList.contains("node")) {
      const fill = n.getAttribute("fill");
      if (fill && fill !== "none" && fill.indexOf("var(") < 0) n.setAttribute("fill", "var(--object-stroke," + fill + ")");
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
    resolveLibSymbol(libSvg, canon) ||
    resolveLibSymbol(libSvg, id) ||
    resolveSheetSymbol(sheetSvg, canon) ||
    resolveSheetSymbol(sheetSvg, id)
  );
}

export function appendEditDefSymbol(id, editDefs, added, { libSvg, sheetSvg, xlinkNs }) {
  const raw = String(id || "").replace(/^#/, "");
  if (!raw) return;
  const canon = canonicalSymbolId(raw);

  if (!added.has(canon)) {
    const sym = resolveSymbolForEdit(raw, libSvg, sheetSvg);
    if (!sym) {
      console.warn("Brak symbolu (bibl./arkusz):", raw, "→", canon);
    } else {
      const clone = useColorAwareClone(sym);
      clone.id = canon;
      editDefs.appendChild(clone);
      added.add(canon);
    }
  }

  if (raw !== canon) appendSymbolAlias(raw, canon, editDefs, added, xlinkNs);
}

/**
 * Buduje editDefs na scenie edycji — SSOT dla rozwiązywania <use> w podglądzie.
 * @returns {{ missing: string[] }}
 */
export function assembleEditDefs(editDefs, opts) {
  const { libSvg, sheetSvg, sheetNode, xlinkNs, libraryPreview = false } = opts;
  editDefs.innerHTML = "";
  const styleEl =
    (libSvg && libSvg.querySelector("defs style")) || (sheetSvg && sheetSvg.querySelector("defs style"));
  if (styleEl) editDefs.appendChild(useColorAwareClone(styleEl));

  const added = new Set();
  const missing = [];

  if (libraryPreview && libSvg) {
    libSymbolGroups(libSvg).forEach((s) => appendEditDefSymbol(s.id, editDefs, added, { libSvg, sheetSvg, xlinkNs }));
    return { missing };
  }

  if (!sheetNode) return { missing };

  syncUseSymbolHrefs(sheetNode, xlinkNs);
  sheetNode.querySelectorAll("use").forEach((u) => {
    const href = parseUseHref(u, xlinkNs);
    if (!href) return;
    const before = added.size;
    appendEditDefSymbol(href, editDefs, added, { libSvg, sheetSvg, xlinkNs });
    const canon = canonicalSymbolId(href);
    if (!added.has(canon) && before === added.size) missing.push(canon);
  });

  return { missing: [...new Set(missing)] };
}
