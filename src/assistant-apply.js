/**
 * Zastosowanie zaakceptowanej propozycji AI przez istniejące write-pathy edytora.
 */
import { validateProposal } from "./assistant-proposals.js";
import { nextConnectionId, normalizeConnection, endpointRaw } from "./netlist-model.js";
import { collectInstanceMembers } from "./sheet-elements.js";
import { findUseByRef } from "./instance-labels.js";

function asRecord(rec) {
  const n = normalizeConnection(rec);
  return {
    id: n.id,
    section: n.section,
    from: endpointRaw(n.from),
    to: endpointRaw(n.to),
    net: n.net,
    wire: n.wire,
    length: n.length,
    notes: n.notes,
  };
}

/**
 * @param {object} deps
 */
export function createAssistantApply(deps) {
  const {
    getState,
    getSheetNode,
    catalogIds,
    insertUse,
    applyConnectionRecord,
    ensureNetlist,
    routeConnection,
    setLabel,
    selectElements,
    afterApply,
  } = deps;

  /**
   * @param {object} raw
   * @returns {Promise<{ ok: boolean, error?: string, message?: string }>}
   */
  async function applyProposal(raw) {
    const ids = typeof catalogIds === "function" ? catalogIds() : catalogIds;
    const v = validateProposal(raw, { catalogIds: ids });
    if (!v.ok) return { ok: false, error: v.error };
    const p = v.proposal;
    const state = typeof getState === "function" ? getState() : null;
    const node = typeof getSheetNode === "function" ? getSheetNode() : null;

    if (p.type === "highlight") {
      if (!node || typeof selectElements !== "function") return { ok: false, error: "Brak arkusza." };
      const els = p.refs.flatMap((ref) => collectInstanceMembers(node, ref));
      if (!els.length) return { ok: false, error: "Nie znaleziono: " + p.refs.join(", ") };
      selectElements(els);
      return { ok: true, message: p.summary };
    }

    if (!node) return { ok: false, error: "Najpierw otwórz schemat." };

    if (p.type === "insert_symbol") {
      if (typeof insertUse !== "function") return { ok: false, error: "Brak wstawiania symboli." };
      const opts = { ref: p.ref || undefined };
      if (p.x != null) opts.x = p.x;
      if (p.y != null) opts.y = p.y;
      const el = insertUse(p.symbolId, false, opts);
      if (!el) return { ok: false, error: "Nie wstawiono " + (p.ref || p.symbolId) + "." };
      if (typeof afterApply === "function") afterApply();
      return { ok: true, message: p.summary };
    }

    if (p.type === "add_connection") {
      if (typeof applyConnectionRecord !== "function") return { ok: false, error: "Brak zapisu spisu." };
      if (typeof ensureNetlist === "function") ensureNetlist();
      const id = p.id || nextConnectionId(state?.netlist?.connections);
      applyConnectionRecord({
        id,
        from: p.from,
        to: p.to,
        net: p.net,
        wire: p.wire,
        length: p.length,
        notes: p.notes,
      });
      if (typeof afterApply === "function") afterApply();
      return { ok: true, message: p.summary };
    }

    if (p.type === "update_connection") {
      if (typeof applyConnectionRecord !== "function") return { ok: false, error: "Brak zapisu spisu." };
      if (typeof ensureNetlist === "function") ensureNetlist();
      const existing = (state?.netlist?.connections || []).find((c) => String(c.id) === p.id);
      if (!existing) return { ok: false, error: "Brak połączenia " + p.id + " w spisie." };
      const merged = { ...asRecord(existing), ...p.patch, id: p.id };
      applyConnectionRecord(merged);
      if (typeof afterApply === "function") afterApply();
      return { ok: true, message: p.summary };
    }

    if (p.type === "route_connection") {
      if (typeof routeConnection !== "function") return { ok: false, error: "Brak trasowania." };
      if (typeof ensureNetlist === "function") ensureNetlist();
      if (state) state.selectedConnId = p.id;
      await routeConnection(p.id);
      if (typeof afterApply === "function") afterApply();
      return { ok: true, message: p.summary };
    }

    if (p.type === "set_label") {
      if (typeof setLabel !== "function") return { ok: false, error: "Brak etykiet." };
      const use = findUseByRef(node, p.ref);
      if (!use) return { ok: false, error: "Brak instancji " + p.ref + "." };
      setLabel({ use, ref: p.ref, text: p.text, role: p.role });
      if (typeof afterApply === "function") afterApply();
      return { ok: true, message: p.summary };
    }

    return { ok: false, error: "Nieobsługiwany typ." };
  }

  return { applyProposal };
}
