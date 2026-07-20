/**
 * Mapowanie starych id symboli / instancji na kanoniczne id z biblioteki E-00.
 * Używane przy migracji SVG i rozwiązywaniu <use href="#…"> w edytorze.
 */

/** Stare id symbolu (biblioteka, osadzone defs, href) → aktualne id */
export const SYMBOL_ID_ALIASES = {
  Przylacze: "WD",
  Przyłącze: "WD",
  "Xx-3": "X-3",
  sk1: "SK",
  SK1: "SK",
  NO: "SK",
  PSU: "G",
  drv: "DRV",
  motor: "MOTOR",
  a1: "A1",
  r1: "R1",
  b1: "B",
  y1: "Y1",
  cyl: "CYL",
};

/** Historia id na węźle biblioteki — po ręcznej/migracyjnej zmianie `id`. */
export const SYMBOL_ID_ALIASES_ATTR = "data-id-aliases";

export function parseSymbolIdAliases(node) {
  if (!node?.getAttribute) return [];
  return (node.getAttribute(SYMBOL_ID_ALIASES_ATTR) || "").trim().split(/\s+/).filter(Boolean);
}

/** Zapamiętaj poprzednie id, żeby arkusze ze starym href/#data-sym znalazły symbol w bibliotece. */
export function rememberSymbolIdAlias(node, oldId) {
  if (!node || !oldId) return;
  const currentId = node.id || "";
  if (!currentId || oldId === currentId) return;
  const aliases = parseSymbolIdAliases(node).filter((a) => a !== oldId && a !== currentId);
  aliases.push(oldId);
  node.setAttribute(SYMBOL_ID_ALIASES_ATTR, aliases.join(" "));
}

/** Stare oznaczenie instancji (data-ref) → kanoniczne */
export const INSTANCE_REF_ALIASES = {
  Przylacze: "WD1",
  Przyłącze: "WD1",
};

export function canonicalSymbolId(id) {
  return SYMBOL_ID_ALIASES[id] || id;
}

export function canonicalInstanceRef(ref) {
  return INSTANCE_REF_ALIASES[ref] || ref;
}

/** Kolejność migracji id w bibliotece (unikaj kolizji przy łańcuchowych aliasach). */
export function symbolAliasMigrations() {
  return Object.entries(SYMBOL_ID_ALIASES).filter(([oldId, newId]) => oldId !== newId);
}
