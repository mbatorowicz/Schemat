/**
 * Model zaznaczenia: mapowanie src → klon (gHost) i rekordy do edycji stylów.
 */

import { childPair } from "./dom-pairing.js";
import { hostRootFrom } from "./stage-layers.js";
import { STROKE_TAGS, FILL_TAGS } from "./style-targets.js";

export function paintVisible(v) {
  return !!v && v !== "none" && v !== "transparent" && !/rgba\([^)]*,\s*0\)$/.test(v);
}

export function createSelectionModel(ctx) {
  const {
    state,
    getHost,
    currentSymNode,
    selEls,
    isConnLabelMode,
    connParts,
    isConnGroup,
    isConnPoint,
    connStrokeTargets,
    connFillTarget,
    connStyleSampleEl,
  } = ctx;

  function selectedRecords() {
    const node = currentSymNode();
    const root = hostRootFrom(getHost);
    if (!node || !root) return [];
    if (isConnLabelMode()) {
      const conn = state.connLabelSel;
      const label = connParts(conn).label;
      const { cel: labelHost } = childPair(node, conn, root);
      const cel = labelHost ? labelHost.querySelector('[data-part="label"]') : null;
      return cel ? [{ el: label, cel, tag: "text", cs: getComputedStyle(cel) }] : [];
    }
    return selEls()
      .filter((el) => el.parentNode === node)
      .map((el) => {
        const { cel } = childPair(node, el, root);
        if (!cel) return null;
        const styleCel = connStyleSampleEl(el, cel);
        return { el, cel, tag: el.tagName.toLowerCase(), cs: getComputedStyle(styleCel || cel) };
      })
      .filter(Boolean);
  }

  function strokeRecords(records = selectedRecords()) {
    // Nie wymagaj paintVisible — przewody ze stylu CSS (.wL itd.) na klonie hosta
    // często mają puste/computed „none”, a i tak da się ustawić stroke/grubość inline.
    return records.filter((r) => STROKE_TAGS.has(r.tag) || isConnGroup(r.el));
  }

  function strokeTarget(r) {
    return connStrokeTargets(r)[0];
  }

  function fillRecords(records = selectedRecords()) {
    return records.filter((r) => FILL_TAGS.has(r.tag) || (isConnGroup(r.el) && isConnPoint(r.el)));
  }

  function fillTarget(r) {
    return connFillTarget(r);
  }

  function textRecords(records = selectedRecords()) {
    const out = [];
    records.forEach((r) => {
      if (r.tag === "text") out.push(r);
      else if (isConnGroup(r.el)) {
        const label = connParts(r.el).label;
        const root = hostRootFrom(getHost);
        const { cel: host } = childPair(r.el.parentNode, r.el, root);
        const labelCel = host && host.querySelector ? host.querySelector('[data-part="label"]') : null;
        if (labelCel) out.push({ el: label, cel: labelCel, tag: "text", cs: getComputedStyle(labelCel) });
      }
    });
    return out;
  }

  function commonValue(values) {
    const vals = values.filter((v) => v !== null && v !== undefined && v !== "");
    if (!vals.length) return { value: null, mixed: false };
    const first = String(vals[0]).toLowerCase();
    return { value: vals[0], mixed: vals.some((v) => String(v).toLowerCase() !== first) };
  }

  return {
    STROKE_TAGS,
    FILL_TAGS,
    selectedRecords,
    strokeRecords,
    strokeTarget,
    fillRecords,
    fillTarget,
    textRecords,
    commonValue,
  };
}
