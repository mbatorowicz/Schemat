/** Lista elementów arkusza i opis właściwości do panelu bocznego. */
import { qsByOwnerRef, qsaByOwnerRef } from "./dom-selectors.js";

const SHEET_CHROME_CLASSES = new Set(["fr", "fr2", "ttl", "sub", "tb", "tbb"]);

export function isSheetChromeElement(el) {
  if (!el || !el.getAttribute) return false;
  if (el.getAttribute("data-sheet-chrome") === "1") return true;
  const cls = (el.getAttribute("class") || "").split(/\s+/).filter(Boolean);
  const tag = el.tagName ? el.tagName.toLowerCase() : "";
  if (tag === "rect" || tag === "line") return cls.some((c) => c === "fr" || c === "fr2");
  if (tag === "text") return cls.some((c) => SHEET_CHROME_CLASSES.has(c));
  return false;
}

export function schematicSheetChildren(node) {
  if (!node || !node.children) return [];
  return [...node.children].filter((el) => !isSheetChromeElement(el));
}

/** Oznaczenie instancji łączące use + etykiety + złącza (data-ref / data-owner-ref). */
export function instanceRefOf(el) {
  if (!el?.getAttribute) return "";
  if (isConnGroupEl(el)) return (el.getAttribute("data-ref") || "").trim();
  const tag = el.tagName ? el.tagName.toLowerCase() : "";
  if (tag === "use") return (el.getAttribute("data-ref") || "").trim();
  if (tag === "text") return (el.getAttribute("data-owner-ref") || "").trim();
  return "";
}

/** Członkowie jednej instancji na arkuszu (dzieci węzła schematu). */
export function collectInstanceMembers(node, ref) {
  const r = String(ref || "").trim();
  if (!node?.children || !r) return [];
  const seen = new Set();
  const out = [];
  const push = (el) => {
    if (!el || seen.has(el) || el.parentNode !== node) return;
    seen.add(el);
    out.push(el);
  };
  [...node.children].forEach((el) => {
    if (el.tagName && el.tagName.toLowerCase() === "use" && (el.getAttribute("data-ref") || "").trim() === r) {
      push(el);
    }
  });
  qsaByOwnerRef(node, r).forEach(push);
  [...node.children].forEach((el) => {
    if (isConnGroupEl(el) && (el.getAttribute("data-ref") || "").trim() === r) push(el);
  });
  return out;
}

/**
 * Grupuje elementy listy: instancje (wspólny ref, ≥2 człony lub jest use) oraz singletony.
 * Kolejność = pierwsze wystąpienie w dokumencie.
 */
export function groupSchematicElements(children) {
  const list = Array.isArray(children) ? children : [];
  const byRef = new Map();
  list.forEach((el, i) => {
    const ref = instanceRefOf(el);
    if (!ref) return;
    if (!byRef.has(ref)) byRef.set(ref, []);
    byRef.get(ref).push({ el, i });
  });

  const groupedRefs = new Set();
  byRef.forEach((items, ref) => {
    const hasUse = items.some(({ el }) => el.tagName && el.tagName.toLowerCase() === "use");
    if (hasUse || items.length >= 2) groupedRefs.add(ref);
  });

  const used = new Set();
  const groups = [];
  list.forEach((el, index) => {
    if (used.has(el)) return;
    const ref = instanceRefOf(el);
    if (ref && groupedRefs.has(ref)) {
      const members = byRef.get(ref).map((x) => x.el);
      members.forEach((m) => used.add(m));
      groups.push({ type: "instance", ref, members, index });
    } else {
      used.add(el);
      groups.push({ type: "singleton", el, members: [el], index });
    }
  });
  return groups;
}

/** Rozszerza listę elementów o pełne zestawy instancji (po data-ref). */
export function expandToInstanceMembers(node, els) {
  const out = [];
  const seen = new Set();
  (els || []).forEach((el) => {
    if (!el) return;
    const ref = instanceRefOf(el);
    const pack = ref ? collectInstanceMembers(node, ref) : [el];
    pack.forEach((m) => {
      if (!m || seen.has(m)) return;
      seen.add(m);
      out.push(m);
    });
  });
  return out;
}

function ownerLabelForRef(parent, ref) {
  if (!parent || !ref) return "";
  const lbl = qsByOwnerRef(parent, ref);
  return lbl ? (lbl.textContent || "").trim() : "";
}

const KIND_LABELS = {
  use: "Symbol",
  line: "Linia",
  polyline: "Łamana",
  polygon: "Wielokąt",
  rect: "Prostokąt",
  circle: "Koło",
  path: "Ścieżka",
  text: "Tekst",
  node: "Węzeł",
  junction: "Rozgałęzienie",
  connLead: "Złącze · kreska",
  connPoint: "Złącze · punkt",
  other: "Element",
};

export function isConnGroupEl(el) {
  return !!(el && el.getAttribute && el.getAttribute("data-role") === "conn");
}

export function connKindEl(el) {
  if (!isConnGroupEl(el)) return null;
  const k = (el.getAttribute("data-kind") || "").toLowerCase();
  if (k === "lead") return "connLead";
  if (k === "point") return "connPoint";
  const stub = el.querySelector('[data-part="stub"]');
  return stub && stub.tagName && stub.tagName.toLowerCase() === "line" ? "connLead" : "connPoint";
}

export function sheetElementKind(el) {
  if (!el || !el.tagName) return "other";
  if (isConnGroupEl(el)) return connKindEl(el) || "other";
  if (el.getAttribute && el.getAttribute("data-role") === "junction") return "junction";
  const t = el.tagName.toLowerCase();
  if (el.classList && el.classList.contains("node")) return "node";
  return KIND_LABELS[t] ? t : "other";
}

export function kindDisplay(kind) {
  return KIND_LABELS[kind] || kind;
}

function symId(el) {
  const href =
    el.getAttribute("href") || (el.getAttributeNS && el.getAttributeNS("http://www.w3.org/1999/xlink", "href")) || "";
  return href.replace(/^#/, "");
}

function shortText(s, max = 28) {
  const t = (s || "").replace(/\s+/g, " ").trim();
  if (!t) return "";
  return t.length > max ? t.slice(0, max - 1) + "…" : t;
}

export function sheetElementListLabel(el, index) {
  const kind = sheetElementKind(el);
  if (kind === "use") {
    const ref = el.getAttribute("data-ref") || "";
    if (!ref) return `Symbol ${index + 1}`;
    const lbl = ownerLabelForRef(el.parentNode, ref);
    return lbl && lbl !== "-" + ref ? `${ref} (${lbl})` : ref;
  }
  if (kind === "connLead" || kind === "connPoint") {
    const ref = el.getAttribute("data-ref") || "";
    const pin = el.getAttribute("data-pin") || "";
    const tag = kind === "connLead" ? "kreska" : "punkt";
    return ref || pin ? `${ref}:${pin} (${tag})` : `Złącze ${index + 1} (${tag})`;
  }
  if (kind === "text") {
    const txt = shortText(el.textContent);
    return txt ? `Tekst „${txt}"` : `Tekst ${index + 1}`;
  }
  if (kind === "line" || kind === "polyline") {
    const cid = el.getAttribute("data-conn-id");
    if (cid) return `Połączenie ${cid}`;
    return kind === "line" ? `Linia ${index + 1}` : `Łamana ${index + 1}`;
  }
  if (kind === "node") {
    const ref = (el.getAttribute("data-ref") || "").trim();
    return ref ? `Węzeł ${ref}` : `Węzeł ${index + 1}`;
  }
  if (kind === "junction") {
    const ref = (el.getAttribute("data-ref") || "").trim();
    return ref ? `Rozgałęzienie ${ref}` : `Rozgałęzienie ${index + 1}`;
  }
  return `${kindDisplay(kind)} ${index + 1}`;
}

function num(el, a) {
  const v = el.getAttribute(a);
  return v === null ? null : parseFloat(v);
}

function geomSummary(el, kind) {
  const t = el.tagName ? el.tagName.toLowerCase() : "";
  if (kind === "use" || t === "text") {
    const x = num(el, "x"),
      y = num(el, "y");
    const ang = el.getAttribute("data-ang");
    const parts = [];
    if (x != null && y != null) parts.push(`x=${x}, y=${y}`);
    if (ang != null) parts.push(`kąt=${ang}°`);
    const tr = (el.getAttribute("transform") || "").trim();
    if (tr) parts.push(`transform=${tr}`);
    return parts.join(" · ") || "—";
  }
  if (t === "line") {
    return `(${num(el, "x1")}, ${num(el, "y1")}) → (${num(el, "x2")}, ${num(el, "y2")})`;
  }
  if (t === "rect") {
    return `x=${num(el, "x")}, y=${num(el, "y")}, ${num(el, "width")}×${num(el, "height")}`;
  }
  if (t === "circle") {
    return `środek (${num(el, "cx")}, ${num(el, "cy")}), r=${num(el, "r")}`;
  }
  if (t === "polyline" || t === "polygon") {
    const pts = (el.getAttribute("points") || "").trim().split(/\s+/).filter(Boolean);
    return `${pts.length} punktów`;
  }
  if (t === "path") {
    const d = (el.getAttribute("d") || "").trim();
    return d.length > 60 ? d.slice(0, 57) + "…" : d || "—";
  }
  if (isConnGroupEl(el)) {
    const stub = el.querySelector('[data-part="stub"]');
    if (stub && stub.tagName.toLowerCase() === "line") {
      return `(${num(stub, "x1")}, ${num(stub, "y1")}) → (${num(stub, "x2")}, ${num(stub, "y2")})`;
    }
    const joint = el.querySelector('[data-part="joint"]');
    if (joint) return `(${num(joint, "cx")}, ${num(joint, "cy")})`;
  }
  return "—";
}

function styleRows(el) {
  const rows = [];
  const push = (k, v) => {
    if (v != null && v !== "" && v !== "none") rows.push([k, v]);
  };
  push("class", el.getAttribute("class"));
  push("stroke", el.style.stroke || el.getAttribute("stroke"));
  push("stroke-width", el.style.strokeWidth || el.getAttribute("stroke-width"));
  push("stroke-dasharray", el.style.strokeDasharray || el.getAttribute("stroke-dasharray"));
  push("fill", el.style.fill || el.getAttribute("fill"));
  if (el.tagName && el.tagName.toLowerCase() === "text") {
    push("font-size", el.style.fontSize);
    push("font-weight", el.style.fontWeight);
    push("text-anchor", el.getAttribute("text-anchor"));
  }
  if (isConnGroupEl(el)) {
    const label = el.querySelector('[data-part="label"]');
    if (label) {
      push("label font-size", label.style.fontSize);
      push("label font-weight", label.style.fontWeight);
      push("label fill", label.style.fill);
    }
  }
  const own = el.style && el.style.getPropertyValue("--object-stroke");
  if (own) push("--object-stroke", own.trim());
  return rows;
}

function dataRows(el) {
  const rows = [];
  [...el.attributes].forEach((a) => {
    if (a.name.startsWith("data-")) rows.push([a.name, a.value]);
  });
  rows.sort((a, b) => a[0].localeCompare(b[0]));
  return rows;
}

function attrRows(el, skipData = true) {
  const skip = new Set(["href", "xlink:href"]);
  const rows = [];
  [...el.attributes].forEach((a) => {
    if (skipData && a.name.startsWith("data-")) return;
    if (skip.has(a.name)) return;
    rows.push([a.name, a.value]);
  });
  rows.sort((a, b) => a[0].localeCompare(b[0]));
  return rows;
}

/** Sekcje właściwości do panelu szczegółów. */
export function sheetElementPropertySections(el, index) {
  const kind = sheetElementKind(el);
  const sections = [
    {
      title: "Ogólne",
      rows: [
        ["Lp.", String(index + 1)],
        ["Typ", kindDisplay(kind)],
        ["Tag", el.tagName ? el.tagName.toLowerCase() : "—"],
        ["Etykieta", sheetElementListLabel(el, index)],
      ],
    },
    { title: "Geometria", rows: [["Pozycja / kształt", geomSummary(el, kind)]] },
  ];

  const ident = [];
  if (kind === "use") {
    const ref = el.getAttribute("data-ref") || "";
    ident.push(["Oznaczenie", ref || "—"]);
    ident.push(["Etykieta na schemacie", ownerLabelForRef(el.parentNode, ref) || "—"]);
    const ang = el.getAttribute("data-ang");
    if (ang != null && ang !== "") ident.push(["Kąt", ang + "°"]);
  }
  if (isConnGroupEl(el)) {
    ident.push(["Oznaczenie", el.getAttribute("data-ref") || "—"]);
    ident.push(["Pin", el.getAttribute("data-pin") || "—"]);
    if (connKindEl(el) === "connPoint") {
      ident.push(["Kierunek", "auto (przy trasowaniu)"]);
    } else {
      ident.push(["Kierunek", el.getAttribute("data-dir") || "—"]);
    }
  }
  const connId = el.getAttribute("data-conn-id");
  if (connId) {
    ident.push(["data-conn-id", connId]);
    ident.push(["data-route", el.getAttribute("data-route") || "—"]);
    ident.push(["data-from", el.getAttribute("data-from") || "—"]);
    ident.push(["data-to", el.getAttribute("data-to") || "—"]);
    ident.push(["data-net", el.getAttribute("data-net") || "—"]);
    ident.push(["data-wire", el.getAttribute("data-wire") || "—"]);
  }
  if (el.tagName && el.tagName.toLowerCase() === "text") {
    ident.push(["treść", el.textContent || ""]);
    ident.push(["data-owner-ref", el.getAttribute("data-owner-ref") || "—"]);
  }
  if (ident.length) sections.push({ title: "Oznaczenia (spis połączeń)", rows: ident });

  const style = styleRows(el);
  if (style.length) sections.push({ title: "Styl", rows: style });

  const data = dataRows(el);
  if (data.length) sections.push({ title: "Atrybuty data-*", rows: data });

  const attrs = attrRows(el);
  if (attrs.length) sections.push({ title: "Atrybuty SVG", rows: attrs });

  return sections;
}
