/** Reguły oznaczeń instancji (spis połączeń) — testowalne bez stanu edytora. */

export const INSTANCE_REF_RULES = {
  PSU: { base: "G", numbered: true, start: 1 },
  WD: { base: "WD", numbered: true, start: 1 },
  NO: { base: "SK", numbered: true, start: 1 },
  Q: { base: "Q", numbered: false },
  F1: { base: "F", numbered: true, start: 1 },
  "X-3": { base: "X", numbered: true, start: 1 },
  "X-4": { base: "X", numbered: true, start: 1 },
  SK1: { base: "SK", numbered: true, start: 1 },
};

export function isValidInstanceRef(v) {
  return !!v && /^[\p{L}_][\p{L}\p{N}_\-]*$/u.test(v);
}

export function refPrefixForSymbol(id) {
  const s = String(id || "").toLowerCase();
  if (s.includes("psu")) return "G";
  if (s.includes("sk1")) return "SK";
  if (s.includes("drv")) return "T";
  if (s.includes("motor")) return "M";
  if (s.includes("f1")) return "F";
  if (/^q$/i.test(id)) return "Q";
  if (s.includes("a1")) return "A";
  if (s.includes("r1")) return "R";
  if (s.includes("b1")) return "B";
  if (s.includes("y1")) return "Y";
  if (s.includes("cyl")) return "C";
  return "U";
}

export function refBaseFromSymbolNode(symNode) {
  if (!symNode || !symNode.getAttribute) return null;
  const prefix = (symNode.getAttribute("data-inst-prefix") || "").trim();
  if (!prefix) return null;
  const numbered = symNode.getAttribute("data-inst-numbered") !== "0";
  const start = parseInt(symNode.getAttribute("data-inst-start") || "1", 10) || 1;
  return { base: prefix, numbered, start };
}

/** @param {string} id — identyfikator symbolu w bibliotece */
/** @param {{ getAttribute?: (n: string) => string | null } | null} [symNode] */
export function refBaseForSymbol(id, symNode = null) {
  const fromSym = refBaseFromSymbolNode(symNode);
  if (fromSym) return fromSym;
  if (INSTANCE_REF_RULES[id]) return { ...INSTANCE_REF_RULES[id] };
  const s = String(id || "").trim();
  const lower = s.toLowerCase();
  if (/^q$/i.test(s)) return { base: "Q", numbered: false };
  if (/^f1$/i.test(s) || /^f$/i.test(s)) return { base: "F", numbered: true, start: 1 };
  if (lower.includes("psu") || /^g\d*$/i.test(s)) return { base: "G", numbered: true, start: 1 };
  if (lower.includes("sk") || /^no$/i.test(s)) return { base: "SK", numbered: true, start: 1 };
  if (/^motor/i.test(lower)) return { base: "M", numbered: true, start: 1 };
  if (/^y1$/i.test(s) || lower.includes("y1")) return { base: "Y", numbered: true, start: 1 };
  if (/^k\d*$/i.test(s)) return { base: "K", numbered: true, start: 1 };
  if (/^t\d*$/i.test(s) || lower.includes("drv")) return { base: "T", numbered: true, start: 1 };
  if (/^wd\d*$/i.test(s)) return { base: "WD", numbered: true, start: 1 };
  const m = s.match(/^([\p{L}_]+)(\d+)$/u);
  if (m) return { base: m[1], numbered: true, start: parseInt(m[2], 10) || 1 };
  if (/^[\p{L}_][\p{L}\p{N}_-]*$/u.test(s) && s.length <= 8) return { base: s, numbered: false };
  return { base: refPrefixForSymbol(id), numbered: true, start: 1 };
}
