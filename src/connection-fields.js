/**
 * Wspólna mapa pól połączenia (belka / edytor spisu / promocja).
 * Sygnał w UI = model.net
 * Typ / Długość / Uwagi: tylko edycja spisu (propId = null).
 */
import { W } from "./ui-wording.js";

export const CONNECTION_FIELD_DEFS = [
  {
    key: "net",
    ui: "signal",
    label: () => W.field.signal,
    tip: () => W.fieldTip.connSignal,
    formId: "neNet",
    propId: "selPropNet",
    promoteId: "pcNet",
  },
  {
    key: "wire",
    ui: "wire",
    label: () => W.field.wire,
    tip: () => W.fieldTip.connWire,
    formId: "neWire",
    propId: null,
    promoteId: "pcWire",
  },
  {
    key: "length",
    ui: "wireLength",
    label: () => W.field.wireLength,
    tip: () => W.fieldTip.connLength,
    formId: "neLength",
    propId: null,
    promoteId: "pcLength",
  },
  {
    key: "notes",
    ui: "notes",
    label: () => W.field.notes,
    tip: () => W.fieldTip.connNotes,
    formId: "neNotes",
    propId: null,
    promoteId: "pcNotes",
  },
];

/** Odczyt pól połączenia z belki właściwości (tylko net na belce). */
export function readConnectionFieldsFromProps(els) {
  return {
    net: ((els.netInp && els.netInp.value) || "").trim() || "—",
    wire: ((els.wireInp && els.wireInp.value) || "").trim(),
    length: ((els.lengthInp && els.lengthInp.value) || "").trim(),
    notes: ((els.notesInp && els.notesInp.value) || "").trim(),
  };
}

/** Zapisz wartości do inputów belki. */
export function writeConnectionFieldsToProps(els, st) {
  if (els.netInp) els.netInp.value = st.net || "";
  if (els.wireInp) els.wireInp.value = st.wire || "";
  if (els.lengthInp) els.lengthInp.value = st.length || "";
  if (els.notesInp) els.notesInp.value = st.notes || "";
}

/** Ustaw widoczność pól belki trybu wire — tylko sygnał. */
export function setConnectionPropsVisible(els, visible) {
  if (els.netField) els.netField.classList.toggle("context-hidden", !visible);
  ["wireField", "lengthField", "notesField"].forEach((k) => {
    if (els[k]) els[k].classList.add("context-hidden");
  });
}

/** Zastosuj etykiety z wording do DOM (belka + formularze). */
export function applyConnectionFieldLabels(doc = document) {
  CONNECTION_FIELD_DEFS.forEach((d) => {
    const label = d.label();
    const tip = d.tip();
    if (d.propId) {
      const propLabel = doc.querySelector(`label[for="${d.propId}"]`);
      if (propLabel) {
        propLabel.textContent = label;
        if (tip) propLabel.title = tip;
      }
      const inp = doc.getElementById(d.propId);
      if (inp && tip) inp.title = tip;
    }
    if (d.formId) {
      const formLabel = doc.querySelector(`label[for="${d.formId}"]`);
      if (formLabel) {
        formLabel.textContent = label;
        if (tip) formLabel.title = tip;
      }
      const formInp = doc.getElementById(d.formId);
      if (formInp && tip) formInp.title = tip;
    }
    if (d.promoteId) {
      const promoteLabel = doc.querySelector(`label[for="${d.promoteId}"]`);
      if (promoteLabel) {
        promoteLabel.textContent = label;
        if (tip) promoteLabel.title = tip;
      }
    }
  });
}
