/**
 * Walidacja propozycji edycji z pomocnika AI — bez mutacji DOM.
 */

export const PROPOSAL_TYPES = [
  "insert_symbol",
  "add_connection",
  "update_connection",
  "route_connection",
  "set_label",
  "highlight",
];

const LABEL_ROLES = new Set(["desig", "desc", "desc2"]);

function str(v) {
  return v == null ? "" : String(v).trim();
}

function finiteOrNull(v) {
  if (v == null || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

/**
 * @param {unknown} raw
 * @param {{ catalogIds?: string[] }} [opts]
 * @returns {{ ok: boolean, proposal?: object, error?: string }}
 */
export function validateProposal(raw, opts = {}) {
  if (!raw || typeof raw !== "object") return { ok: false, error: "Pusta propozycja." };
  const type = str(raw.type);
  if (!PROPOSAL_TYPES.includes(type)) return { ok: false, error: "Nieznany typ propozycji." };

  if (type === "insert_symbol") {
    const symbolId = str(raw.symbolId);
    if (!symbolId) return { ok: false, error: "Brak symbolId." };
    const catalog = opts.catalogIds;
    if (Array.isArray(catalog) && catalog.length && !catalog.includes(symbolId)) {
      return { ok: false, error: "Symbol spoza biblioteki: " + symbolId };
    }
    return {
      ok: true,
      proposal: {
        type,
        symbolId,
        ref: str(raw.ref),
        x: finiteOrNull(raw.x),
        y: finiteOrNull(raw.y),
        summary: str(raw.summary) || "Wstaw " + (str(raw.ref) || symbolId),
      },
    };
  }

  if (type === "add_connection") {
    const from = str(raw.from);
    const to = str(raw.to);
    if (!from || !to) return { ok: false, error: "Połączenie wymaga from i to (np. WD1:L)." };
    return {
      ok: true,
      proposal: {
        type,
        id: str(raw.id),
        from,
        to,
        net: str(raw.net) || "—",
        wire: str(raw.wire) || "do ustalenia",
        length: str(raw.length),
        notes: str(raw.notes),
        summary: str(raw.summary) || "Dodaj " + from + " → " + to,
      },
    };
  }

  if (type === "update_connection") {
    const id = str(raw.id);
    if (!id) return { ok: false, error: "Brak id połączenia." };
    const patch = raw.patch && typeof raw.patch === "object" ? raw.patch : {};
    const next = {};
    ["from", "to", "net", "wire", "length", "notes"].forEach((k) => {
      if (patch[k] != null) next[k] = str(patch[k]);
    });
    return {
      ok: true,
      proposal: {
        type,
        id,
        patch: next,
        summary: str(raw.summary) || "Zmień połączenie " + id,
      },
    };
  }

  if (type === "route_connection") {
    const id = str(raw.id);
    if (!id) return { ok: false, error: "Brak id połączenia." };
    return {
      ok: true,
      proposal: { type, id, summary: str(raw.summary) || "Wytycz trasę " + id },
    };
  }

  if (type === "set_label") {
    const ref = str(raw.ref);
    const text = raw.text == null ? "" : String(raw.text);
    if (!ref) return { ok: false, error: "Brak oznaczenia instancji." };
    const role = str(raw.role) || "desc";
    if (!LABEL_ROLES.has(role)) return { ok: false, error: "Nieznana rola etykiety." };
    return {
      ok: true,
      proposal: {
        type,
        ref,
        text,
        role,
        summary: str(raw.summary) || "Etykieta " + ref,
      },
    };
  }

  const refs = Array.isArray(raw.refs) ? raw.refs.map(str).filter(Boolean) : str(raw.ref) ? [str(raw.ref)] : [];
  if (!refs.length) return { ok: false, error: "Brak refs do podświetlenia." };
  return {
    ok: true,
    proposal: {
      type: "highlight",
      refs,
      summary: str(raw.summary) || "Pokaż " + refs.join(", "),
    },
  };
}

/**
 * @param {unknown} list
 * @param {{ catalogIds?: string[] }} [opts]
 */
export function validateProposals(list, opts = {}) {
  const arr = Array.isArray(list) ? list : [];
  const accepted = [];
  const rejected = [];
  arr.forEach((raw, i) => {
    const r = validateProposal(raw, opts);
    if (r.ok) accepted.push(r.proposal);
    else rejected.push({ index: i, error: r.error });
  });
  return { accepted, rejected };
}
