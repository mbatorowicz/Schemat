/** Zapis parametrów symbolu — nazwa wyświetlana + oznaczenie (id SVG) + domyślna numeracja na schemacie. */



import { libSymbolGroups } from "./symbol-resolver.js";

import { status as Wstatus } from "./ui-wording.js";



/** Nazwa widoczna w UI (np. „Czujnik fotooptyczny”). */

export const SYMBOL_NAME_ATTR = "data-symbol-name";



export function symbolDisplayName(node) {

  if (!node?.getAttribute) return "";

  return (node.getAttribute(SYMBOL_NAME_ATTR) || "").trim();

}



/** Etykieta główna w listach, breadcrumb i nagłówku zaznaczenia. Nazwa > oznaczenie > id. */
export function symbolCatalogLabel(node, id = "") {
  const name = symbolDisplayName(node);
  if (name) return name;
  return symbolDesignation(node, id) || id || "";
}

/** Druga linia listy symboli — oznaczenie techniczne, gdy główna linia to nazwa. */
export function symbolCatalogSubtitle(node, id = "") {
  const name = symbolDisplayName(node);
  const ozn = symbolDesignation(node, id);
  if (!name || !ozn || ozn === name) return "";
  return ozn;
}

/** Etykieta na liście: nazwa wyświetlana lub oznaczenie (nie legacy id typu B1). */
export function symbolListPrimaryLabel(node, id) {
  return symbolCatalogLabel(node, id);
}



/** Oznaczenie techniczne typu elementu (B, SK, SB…) — wspólne dla wielu symboli w bibliotece. */
export function symbolDesignation(node, fallbackId = "") {
  if (!node) return fallbackId || "";
  const fromAttr = (node.getAttribute?.("data-inst-prefix") || "").trim();
  return fromAttr || node.id || fallbackId || "";
}



export function isValidSymbolDisplayName(v) {

  const s = (v || "").trim();

  return s.length >= 1 && s.length <= 120;

}



/** Id techniczne / oznaczenie (href SVG) — litery, cyfry, _, - */

export function isValidSymbolName(v) {

  return !!v && /^[\p{L}_][\p{L}\p{N}_\-]*$/u.test(v);

}



export function libSymbolIdExists(libSvg, id, exceptId) {

  if (!libSvg || !id) return false;

  return libSymbolGroups(libSvg).some((g) => g.id === id && g.id !== exceptId);

}



/**

 * @param {{

 *   sym: { node: Element },

 *   libSvg: Element,

 *   sheets: { svg: Element }[],

 *   form: { name: string, prefix: string, numbered: boolean, start: number },

 *   rewriteSymbolIdRefs: Function,

 *   XLINK: string,

 * }} ctx

 */

export function applySymbolForm(ctx) {

  const { sym, libSvg, sheets, form, rewriteSymbolIdRefs, XLINK } = ctx;

  const node = sym.node;

  const name = (form.name || "").trim();

  const designation = (form.prefix || "").trim();

  const oldId = node.id;

  const prevDisplay = symbolDisplayName(node);



  if (!isValidSymbolDisplayName(name)) {

    return { ok: false, message: Wstatus.symbolInvalidName };

  }

  if (!designation) {

    return { ok: false, message: Wstatus.symbolEmptyDesignation };

  }

  if (!isValidSymbolName(designation)) {
    return { ok: false, message: Wstatus.symbolInvalidDesignation };
  }

  let idChanged = false;
  const canRenameId =
    designation !== oldId && !libSymbolIdExists(libSvg, designation, oldId);

  if (canRenameId) {
    rewriteSymbolIdRefs(libSvg, oldId, designation, XLINK);
    sheets.forEach((sh) => {
      if (sh.svg) rewriteSymbolIdRefs(sh.svg, oldId, designation, XLINK);
    });
    node.id = designation;
    node.setAttribute("data-alias-lock", "1");
    idChanged = true;
  }

  node.setAttribute(SYMBOL_NAME_ATTR, name);
  node.setAttribute("data-inst-prefix", designation);
  node.setAttribute("data-inst-numbered", form.numbered ? "1" : "0");
  node.setAttribute("data-inst-start", String(form.start || 1));

  const displayChanged = name !== prevDisplay;
  const message = Wstatus.symbolSaved(name, designation);

  return {
    ok: true,
    newId: node.id,
    displayName: name,
    ozn: designation,
    idChanged,
    displayChanged,
    message,
  };
}



export function readSymbolFormFromDom(doc = document) {

  const nameEl = doc.getElementById("symName");

  const prefixEl = doc.getElementById("instPrefix");

  const numEl = doc.getElementById("instNumbered");

  const startEl = doc.getElementById("instStart");

  return {

    name: (nameEl?.value || "").trim(),

    prefix: (prefixEl?.value || "").trim(),

    numbered: numEl ? numEl.checked : true,

    start: parseInt(startEl?.value, 10) || 1,

  };

}


