/**
 * Belka właściwości — sync/init + commit trybu wire (SSOT z connection-fields).
 */
import {
  resolveSelectionPropsMode,
  readSelectionPropsState,
  selectionPropsFocusField,
  leadPropsFromConn,
} from "./selection-props.js";
import { NetlistModel } from "./netlist-model.js";
import { wireConnId } from "./wire-geometry.js";
import {
  readConnectionFieldsFromProps,
  writeConnectionFieldsToProps,
  setConnectionPropsVisible,
  applyConnectionFieldLabels,
} from "./connection-fields.js";

export function selectionPropsEls(doc = document) {
  return {
    refInp: doc.getElementById("selPropRef"),
    numInp: doc.getElementById("selPropNum"),
    pinInp: doc.getElementById("selPropPin"),
    descInp: doc.getElementById("selPropDesc"),
    desc2Inp: doc.getElementById("selPropDesc2"),
    textInp: doc.getElementById("selPropText"),
    lenInp: doc.getElementById("selPropLen"),
    dirInp: doc.getElementById("selPropDir"),
    symSel: doc.getElementById("selPropSym"),
    netInp: doc.getElementById("selPropNet"),
    wireInp: doc.getElementById("selPropWire"),
    lengthInp: doc.getElementById("selPropLength"),
    notesInp: doc.getElementById("selPropNotes"),
    refField: doc.getElementById("selPropRefField"),
    numField: doc.getElementById("selPropNumField"),
    pinField: doc.getElementById("selPropPinField"),
    descField: doc.getElementById("selPropDescField"),
    desc2Field: doc.getElementById("selPropDesc2Field"),
    textField: doc.getElementById("selPropTextField"),
    lenField: doc.getElementById("selPropLenField"),
    dirField: doc.getElementById("selPropDirField"),
    symField: doc.getElementById("selPropSymField"),
    netField: doc.getElementById("selPropNetField"),
    wireField: doc.getElementById("selPropWireField"),
    lengthField: doc.getElementById("selPropLengthField"),
    notesField: doc.getElementById("selPropNotesField"),
  };
}

/**
 * @param {object} deps
 */
export function createSelectionPropsUi(deps) {
  const {
    state,
    XLINK,
    num,
    fmt,
    pushUndo,
    render,
    markActiveDirty,
    buildElementList,
    syncElementListSelection,
    refreshNetlistUI,
    saveProject,
    setStatus,
    applyConnectionRecord,
    syncToolbarContext,
    selectionUseTarget,
    selectionTextTarget,
    connLabelEl,
    isConnLabelMode,
    updateConnLabel,
    updateHostOnly,
    highlightActive,
    instanceTextByLabel,
    libDescForUse,
    libDesc2ForUse,
    fillSelPropSymOptions,
    isConnLead,
    connParts,
    commitNonWire,
  } = deps;

  function syncSelectionProps(mode) {
    const els = selectionPropsEls();
    const {
      refInp,
      numInp,
      pinInp,
      descInp,
      desc2Inp,
      textInp,
      lenInp,
      dirInp,
      symSel,
      refField,
      numField,
      pinField,
      descField,
      desc2Field,
      textField,
      lenField,
      dirField,
      symField,
    } = els;
    const propsInputs = [
      refInp,
      numInp,
      pinInp,
      descInp,
      desc2Inp,
      textInp,
      lenInp,
      dirInp,
      symSel,
      els.netInp,
      els.wireInp,
      els.lengthInp,
      els.notesInp,
    ].filter(Boolean);
    const editing = propsInputs.some((inp) => document.activeElement === inp);
    if (!mode) {
      if (!editing) {
        if (refInp) refInp.value = "";
        if (numInp) numInp.value = "";
        if (pinInp) pinInp.value = "";
        if (descInp) descInp.value = "";
        if (desc2Inp) desc2Inp.value = "";
        if (textInp) textInp.value = "";
        if (lenInp) lenInp.value = "";
        writeConnectionFieldsToProps(els, { net: "", wire: "", length: "", notes: "" });
      }
      [refField, numField, pinField, descField, desc2Field, textField, lenField, dirField, symField].forEach((f) => {
        if (f) f.classList.add("context-hidden");
      });
      setConnectionPropsVisible(els, false);
      state._selPropTextEl = null;
      return;
    }
    const useEl = mode === "use" ? selectionUseTarget() : null;
    const el = mode === "use" ? useEl : state.selection.length === 1 ? state.selection[0] : null;
    const labelEl = connLabelEl();
    const refNow = useEl ? useEl.getAttribute("data-ref") || "" : "";
    const descLbl = mode === "use" && useEl?.parentNode ? instanceTextByLabel(useEl.parentNode, refNow, "desc") : null;
    const desc2Lbl = mode === "use" && useEl?.parentNode ? instanceTextByLabel(useEl.parentNode, refNow, "desc2") : null;
    const lead =
      mode === "conn" && el && typeof isConnLead === "function" && isConnLead(el)
        ? leadPropsFromConn(el, connParts(el), { num, fmt })
        : null;
    const st = readSelectionPropsState({
      mode,
      el,
      connLabelEl: labelEl,
      descText: descLbl ? descLbl.textContent || "" : useEl ? libDescForUse(useEl) : "",
      desc2Text: desc2Lbl ? desc2Lbl.textContent || "" : useEl ? libDesc2ForUse(useEl) : "",
      getHref: (node) => node.getAttribute("href") || node.getAttributeNS(XLINK, "href") || "",
      lead,
    });
    if (!editing) {
      if (mode === "use") {
        if (refInp) refInp.value = st.prefix;
        if (numInp) numInp.value = st.num;
        if (descInp) descInp.value = st.desc;
        if (desc2Inp) desc2Inp.value = st.desc2;
      } else if (refInp) refInp.value = st.ref;
      if (pinInp) pinInp.value = st.pin;
      if (textInp) textInp.value = st.text;
      if (lenInp) lenInp.value = st.len;
      if (dirInp && st.dir) dirInp.value = st.dir;
      if (mode === "wire") writeConnectionFieldsToProps(els, st);
      if (mode === "use") fillSelPropSymOptions(symSel, st.symId);
    } else if (mode === "use" && symSel && !symSel.options.length) {
      fillSelPropSymOptions(symSel, st.symId);
    }
    if (refField) refField.classList.toggle("context-hidden", mode !== "use" && mode !== "conn");
    if (numField) numField.classList.toggle("context-hidden", mode !== "use");
    if (pinField) pinField.classList.toggle("context-hidden", mode !== "conn");
    if (lenField) lenField.classList.toggle("context-hidden", !(mode === "conn" && st.isLead));
    if (dirField) dirField.classList.toggle("context-hidden", !(mode === "conn" && st.isLead));
    if (descField) descField.classList.toggle("context-hidden", mode !== "use");
    if (desc2Field) desc2Field.classList.toggle("context-hidden", mode !== "use");
    if (textField) textField.classList.toggle("context-hidden", mode !== "text");
    if (symField) symField.classList.toggle("context-hidden", mode !== "use");
    setConnectionPropsVisible(els, mode === "wire");
    if (mode === "text") state._selPropTextEl = selectionTextTarget();
    else state._selPropTextEl = null;
  }

  function focusSelectionPropsField(mode, opts) {
    const id = selectionPropsFocusField(mode, opts);
    if (!id) return;
    syncToolbarContext();
    requestAnimationFrame(() => {
      const inp = document.getElementById(id);
      if (!inp) return;
      inp.focus();
      if (typeof inp.select === "function") inp.select();
    });
  }

  async function commitWireProps() {
    const els = selectionPropsEls();
    const el = state.selection[0];
    if (!el) return;
    const connId = wireConnId(el);
    const fields = readConnectionFieldsFromProps(els);
    const prevNet = (el.getAttribute("data-net") || "").trim();
    if (fields.net === (prevNet || "—")) return;
    pushUndo();
    const existing = state.netlist?.connections?.find((c) => c.id === connId);
    // Typ / długość / uwagi — tylko w edycji spisu; belka nie nadpisuje
    const record = NetlistModel.normalizeConnection({
      ...(existing || { id: connId, from: el.getAttribute("data-from"), to: el.getAttribute("data-to") }),
      net: fields.net,
      wire: existing?.wire || el.getAttribute("data-wire") || "do ustalenia",
      length: existing?.length ?? el.getAttribute("data-length") ?? "",
      notes: existing?.notes ?? el.getAttribute("data-notes") ?? "",
    });
    applyConnectionRecord(record, {
      el,
      routeKind: el.getAttribute("data-route") || "manual",
      strokeWidth: state.routeOpts?.strokeWidth || (state.strokeW != null ? String(state.strokeW) : "") || "",
      persist: true,
      upsert: !!existing || !!connId,
    });
    markActiveDirty();
    render();
    buildElementList();
    syncElementListSelection();
    syncSelectionProps("wire");
    if (typeof refreshNetlistUI === "function") refreshNetlistUI();
    setStatus("Zaktualizowano sygnał połączenia" + (connId ? " " + connId : "") + ".", {
      toast: true,
      tone: "success",
    });
    saveProject();
  }

  async function commitSelectionProps() {
    const onSheet = !!(state.active && state.active !== state.lib);
    const mode = resolveSelectionPropsMode({
      onSheet,
      selection: state.selection,
      connLabelSel: state.connLabelSel,
    });
    if (!mode) return;
    if (mode === "wire") {
      await commitWireProps();
      return;
    }
    if (typeof commitNonWire === "function") await commitNonWire(mode, selectionPropsEls());
  }

  function initSelectionPropsForm() {
    applyConnectionFieldLabels(document);
    const els = selectionPropsEls();
    const wireCommit = (inp) => {
      if (!inp) return;
      inp.addEventListener("focus", () => {
        if (inp === els.textInp) {
          const el = selectionTextTarget();
          state._selPropTextEl = el;
          state._selPropOrig = el ? el.textContent : "";
          if (el && !state._selPropUndoPushed) {
            pushUndo();
            state._selPropUndoPushed = true;
          }
        } else {
          state._selPropOrig = inp.value;
        }
      });
      inp.addEventListener("keydown", (e) => {
        e.stopPropagation();
        if (e.key === "Enter") {
          e.preventDefault();
          commitSelectionProps();
          inp.blur();
        } else if (e.key === "Escape") {
          e.preventDefault();
          if (inp === els.textInp && state._selPropTextEl && state._selPropOrig != null) {
            state._selPropTextEl.textContent = state._selPropOrig;
            if (isConnLabelMode()) state.connLabelSel.setAttribute("data-pin", state._selPropOrig);
            inp.value = state._selPropOrig;
            render();
          } else if (state._selPropOrig != null) {
            inp.value = state._selPropOrig;
          }
          state._selPropUndoPushed = false;
          inp.blur();
        }
      });
      if (inp === els.textInp) {
        inp.addEventListener("input", () => {
          const el = state._selPropTextEl || selectionTextTarget();
          if (!el) return;
          el.textContent = inp.value;
          if (isConnLabelMode()) state.connLabelSel.setAttribute("data-pin", inp.value);
          updateHostOnly();
          highlightActive();
          markActiveDirty();
        });
      }
      inp.addEventListener("change", () => {
        commitSelectionProps();
      });
    };
    [
      els.refInp,
      els.numInp,
      els.pinInp,
      els.descInp,
      els.desc2Inp,
      els.textInp,
      els.lenInp,
      els.dirInp,
      els.symSel,
      els.netInp,
      els.wireInp,
      els.lengthInp,
      els.notesInp,
    ].forEach(wireCommit);
  }

  return {
    selectionPropsEls,
    syncSelectionProps,
    focusSelectionPropsField,
    commitSelectionProps,
    initSelectionPropsForm,
  };
}
