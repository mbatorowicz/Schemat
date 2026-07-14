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
  drv: "DRV",
  motor: "MOTOR",
  a1: "A1",
  r1: "R1",
  b1: "B1",
  y1: "Y1",
  cyl: "CYL",
};

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
