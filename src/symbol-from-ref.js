/**
 * Mapowanie oznaczenia instancji (WD1) na symbol biblioteki (#WD).
 * Przy wielu kandydatach — ambiguous; bez zgadywania.
 */
import { splitInstanceRef, refBaseForSymbol } from "./instance-refs.js";
import { libSymbolGroups } from "./symbol-resolver.js";
import { symbolDisplayName } from "./symbol-save.js";

export function catalogFromLibrary(libSvg) {
  return libSymbolGroups(libSvg).map((g) => {
    const base = refBaseForSymbol(g.id, g);
    return {
      id: g.id,
      prefix: base.base,
      numbered: !!base.numbered,
      name: symbolDisplayName(g),
    };
  });
}

function sameToken(a, b) {
  return String(a || "").toUpperCase() === String(b || "").toUpperCase();
}

/**
 * @param {string} ref
 * @param {Array<{ id: string, prefix?: string, name?: string }>} catalog
 * @returns {{ status: "unique"|"ambiguous"|"none", prefix: string, matches: typeof catalog }}
 */
export function matchSymbolsForRef(ref, catalog) {
  const { prefix } = splitInstanceRef(ref);
  const raw = String(ref || "")
    .trim()
    .replace(/^-/, "");
  if (!raw && !prefix) return { status: "none", prefix: "", matches: [] };
  const list = catalog || [];
  const exactRef = list.filter((s) => sameToken(s.id, raw));
  if (exactRef.length === 1) return { status: "unique", prefix: prefix || raw, matches: exactRef };
  if (exactRef.length > 1) return { status: "ambiguous", prefix: prefix || raw, matches: exactRef };
  const exactId = list.filter((s) => sameToken(s.id, prefix));
  if (exactId.length === 1) return { status: "unique", prefix, matches: exactId };
  if (exactId.length > 1) return { status: "ambiguous", prefix, matches: exactId };
  const byPrefix = list.filter((s) => sameToken(s.prefix, prefix));
  if (byPrefix.length === 1) return { status: "unique", prefix, matches: byPrefix };
  if (byPrefix.length > 1) return { status: "ambiguous", prefix, matches: byPrefix };
  return { status: "none", prefix: prefix || raw, matches: [] };
}

export function symbolChoiceLabel(entry) {
  if (!entry) return "";
  const name = (entry.name || "").trim();
  return name ? entry.id + " · " + name : entry.id;
}
