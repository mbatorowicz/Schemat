/** Wczytywanie i normalizacja biblioteki symboli z dysku projektu. */
import { syncConnStylesInLib } from "./conn-theme.js";
import { parseSvg } from "./svg-utils.js";
import { pickLibraryFile, resolveSharedLibrary, normalizeRelPath } from "./project-files.js";
import { libSymbolGroups } from "./symbol-resolver.js";
import { qsById } from "./dom-selectors.js";

export function hasLibSymbols(svg) {
  return libSymbolGroups(svg).length > 0;
}

export function rewriteSymbolIdRefs(svg, oldId, newId, xlinkNs) {
  if (!svg || !oldId || !newId || oldId === newId) return;
  svg.querySelectorAll("use").forEach((u) => {
    const href = u.getAttribute("href") || u.getAttributeNS(xlinkNs, "href") || "";
    if (href.replace(/^#/, "") === oldId) {
      u.setAttribute("href", "#" + newId);
      u.setAttributeNS(xlinkNs, "xlink:href", "#" + newId);
    }
    if (u.getAttribute("data-sym") === oldId) u.setAttribute("data-sym", newId);
  });
}

export function normalizeLibLayout(svg, svgNs) {
  if (!svg) return;
  let defs = svg.querySelector("defs");
  if (!defs) {
    defs = svg.ownerDocument.createElementNS(svgNs, "defs");
    svg.insertBefore(defs, svg.firstChild);
  }
  [...svg.children].forEach((child) => {
    if (child === defs) return;
    const tag = child.tagName?.toLowerCase();
    if (tag === "g" && child.id && !child.id.startsWith("sch-")) defs.appendChild(child);
  });
}

export function stripSymPrefixInSvg(svg, xlinkNs) {
  if (!svg) return false;
  let changed = false;
  [...svg.querySelectorAll('[id^="sym-"]')].forEach((node) => {
    const newId = node.id.slice(4);
    if (!newId || qsById(svg, newId)) return;
    rewriteSymbolIdRefs(svg, node.id, newId, xlinkNs);
    node.id = newId;
    changed = true;
  });
  return changed;
}

export function prepareLibrarySvg(parsed, svgNs) {
  normalizeLibLayout(parsed.svg, svgNs);
  stripSymPrefixInSvg(parsed.svg, svgNs);
  syncConnStylesInLib(parsed.svg, svgNs);
  return parsed;
}

/**
 * Szuka biblioteki w plikach projektu i katalogach nadrzędnych.
 * @returns {Promise<{handle,name,relPath,parsed}|null>}
 */
export async function findLibraryInProject(walked, settingsLibrary, svgCandidates) {
  let libPick = pickLibraryFile(svgCandidates, settingsLibrary);
  if (libPick) return libPick;

  const shared = await resolveSharedLibrary(walked.root, settingsLibrary);
  if (!shared) return null;

  try {
    const text = await (await shared.handle.getFile()).text();
    const parsed = parseSvg(text);
    if (!parsed) return null;
    return {
      handle: shared.handle,
      name: shared.handle.name,
      relPath: normalizeRelPath(shared.relPath),
      parsed,
      isSheet: false,
    };
  } catch {
    return null;
  }
}

export function createLibraryRecord(parsed, name, handle) {
  return {
    handle: handle || null,
    name: name || "E-00_symbole.svg",
    svg: parsed.svg,
    doc: parsed.doc,
  };
}
