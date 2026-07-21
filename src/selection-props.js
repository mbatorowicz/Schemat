/**
 * Tryb i stan formularza właściwości zaznaczenia na belce kontekstowej.
 * use | conn | text | wire | null
 */

import { splitInstanceRef } from "./instance-refs.js";
import { isWireGeometry, wireConnId } from "./wire-geometry.js";

/** Oznaczenie instancji z elementu (use / text / conn). */
export function selectionElRef(el) {
  if (!el?.getAttribute) return "";
  if (el.getAttribute("data-role") === "conn") return (el.getAttribute("data-ref") || "").trim();
  const t = el.tagName ? el.tagName.toLowerCase() : "";
  if (t === "use") return (el.getAttribute("data-ref") || "").trim();
  if (t === "text") return (el.getAttribute("data-owner-ref") || "").trim();
  return "";
}

/**
 * Gdy zaznaczenie to jedna instancja (wspólny ref + dokładnie jeden use) — zwraca ten use.
 */
export function selectionInstanceUse(selection) {
  if (!selection || !selection.length) return null;
  let useEl = null;
  let ref = "";
  for (const el of selection) {
    if (!el?.tagName) return null;
    const r = selectionElRef(el);
    if (!r) return null;
    if (!ref) ref = r;
    else if (r !== ref) return null;
    if (el.tagName.toLowerCase() === "use") {
      if (useEl) return null;
      useEl = el;
    }
  }
  return useEl;
}

/** @param {{ onSheet: boolean, selection?: Element[], connLabelSel?: Element|null }} ctx */
export function resolveSelectionPropsMode({ onSheet, selection, connLabelSel }) {
  if (!onSheet) return null;
  if (connLabelSel) return "text";
  if (!selection || !selection.length) return null;

  if (selection.length === 1) {
    const el = selection[0];
    if (!el || !el.tagName) return null;
    if (el.getAttribute && el.getAttribute("data-role") === "conn") return "conn";
    if (isWireGeometry(el) && wireConnId(el)) return "wire";
    const t = el.tagName.toLowerCase();
    if (t === "use") return "use";
    if (t === "text") return "text";
    return null;
  }

  return selectionInstanceUse(selection) ? "use" : null;
}

/**
 * @param {{
 *   mode: string|null,
 *   el?: Element|null,
 *   connLabelEl?: Element|null,
 *   descText?: string,
 *   desc2Text?: string,
 *   getHref?: (el: Element) => string,
 *   lead?: { len: string, dir: string }|null,
 * }} ctx
 */
export function readSelectionPropsState({
  mode,
  el,
  connLabelEl,
  descText = "",
  desc2Text = "",
  getHref,
  lead = null,
}) {
  const empty = {
    ref: "",
    prefix: "",
    num: "",
    pin: "",
    text: "",
    desc: "",
    desc2: "",
    symId: "",
    len: "",
    dir: "",
    isLead: false,
    net: "",
    signal: "",
    wire: "",
    length: "",
    notes: "",
    connId: "",
  };
  if (!mode) return empty;
  if (mode === "text") {
    const textEl = connLabelEl || el;
    return {
      ...empty,
      text: textEl ? String(textEl.textContent || "") : "",
    };
  }
  if (!el) return empty;
  if (mode === "wire") {
    return {
      ...empty,
      connId: wireConnId(el) || "",
      net: (el.getAttribute("data-net") || "").trim(),
      signal: "",
      wire: (el.getAttribute("data-wire") || "").trim(),
      length: (el.getAttribute("data-length") || "").trim(),
      notes: (el.getAttribute("data-notes") || "").trim(),
      ref: (el.getAttribute("data-from") || "").trim(),
    };
  }
  const ref = (el.getAttribute("data-ref") || "").trim();
  if (mode === "conn") {
    return {
      ...empty,
      ref,
      pin: (el.getAttribute("data-pin") || "").trim(),
      len: lead?.len != null ? String(lead.len) : "",
      dir: lead?.dir || "",
      isLead: !!lead,
    };
  }
  let symId = (el.getAttribute("data-sym") || "").trim();
  if (!symId && typeof getHref === "function") {
    symId = String(getHref(el) || "")
      .replace(/^#/, "")
      .trim();
  } else if (!symId) {
    const href = el.getAttribute("href") || "";
    symId = href.replace(/^#/, "").trim();
  }
  const parts = splitInstanceRef(ref);
  const localDesc = (el.getAttribute("data-inst-desc") || "").trim();
  const localDesc2 = (el.getAttribute("data-inst-desc2") || "").trim();
  return {
    ref,
    prefix: parts.prefix,
    num: parts.num,
    pin: "",
    text: "",
    desc: localDesc || String(descText || ""),
    desc2: localDesc2 || String(desc2Text || ""),
    symId,
    len: "",
    dir: "",
    isLead: false,
  };
}

/** Które pole belki fokusować po dblclick / editElement. */
export function selectionPropsFocusField(mode, { isLead = false } = {}) {
  if (mode === "use") return "selPropRef";
  if (mode === "conn") return isLead ? "selPropLen" : "selPropPin";
  if (mode === "text") return "selPropText";
  if (mode === "wire") return "selPropNet";
  return null;
}

/** Długość i kierunek kreski z geometrii stub. */
export function leadPropsFromConn(el, parts, { num, fmt }) {
  if (!el || !parts?.stub) return null;
  if (el.getAttribute("data-kind") !== "lead") return null;
  const stub = parts.stub;
  const dx = num(stub, "x2") - num(stub, "x1");
  const dy = num(stub, "y2") - num(stub, "y1");
  const lenAttr = el.getAttribute("data-len");
  const len = lenAttr != null && lenAttr !== "" ? num(el, "data-len") : Math.hypot(dx, dy);
  const dir = (el.getAttribute("data-dir") || "E").toUpperCase();
  return { len: fmt(len), dir: ["N", "E", "S", "W"].includes(dir) ? dir : "E" };
}
