/**
 * Tryb i stan formularza właściwości zaznaczenia na belce kontekstowej.
 * use | conn | text | null
 */

/** @param {{ onSheet: boolean, selection?: Element[], connLabelSel?: Element|null }} ctx */
export function resolveSelectionPropsMode({ onSheet, selection, connLabelSel }) {
  if (!onSheet) return null;
  if (connLabelSel) return "text";
  if (!selection || selection.length !== 1) return null;
  const el = selection[0];
  if (!el || !el.tagName) return null;
  if (el.getAttribute && el.getAttribute("data-role") === "conn") return "conn";
  const t = el.tagName.toLowerCase();
  if (t === "use") return "use";
  if (t === "text") return "text";
  return null;
}

/**
 * @param {{
 *   mode: string|null,
 *   el?: Element|null,
 *   connLabelEl?: Element|null,
 *   getHref?: (el: Element) => string,
 *   lead?: { len: string, dir: string }|null,
 * }} ctx
 */
export function readSelectionPropsState({ mode, el, connLabelEl, getHref, lead = null }) {
  if (!mode) {
    return { ref: "", pin: "", text: "", symId: "", len: "", dir: "", isLead: false };
  }
  if (mode === "text") {
    const textEl = connLabelEl || el;
    return {
      ref: "",
      pin: "",
      text: textEl ? String(textEl.textContent || "") : "",
      symId: "",
      len: "",
      dir: "",
      isLead: false,
    };
  }
  if (!el) return { ref: "", pin: "", text: "", symId: "", len: "", dir: "", isLead: false };
  const ref = (el.getAttribute("data-ref") || "").trim();
  if (mode === "conn") {
    return {
      ref,
      pin: (el.getAttribute("data-pin") || "").trim(),
      text: "",
      symId: "",
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
  return { ref, pin: "", text: "", symId, len: "", dir: "", isLead: false };
}

/** Które pole belki fokusować po dblclick / editElement. */
export function selectionPropsFocusField(mode, { isLead = false } = {}) {
  if (mode === "use") return "selPropSym";
  if (mode === "conn") return isLead ? "selPropLen" : "selPropPin";
  if (mode === "text") return "selPropText";
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
