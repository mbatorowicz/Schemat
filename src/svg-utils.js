export function num(el, attr, def = 0) {
  const v = el && el.getAttribute ? el.getAttribute(attr) : null;
  return v === null || v === "" ? def : parseFloat(v);
}

export function fmt(v) {
  return String(Math.round(v * 100) / 100);
}

export function fmtRot(v) {
  return String(Math.round(v * 1000000) / 1000000);
}

/** Usuwa typowe wektory XSS z tekstu SVG przed parsowaniem. */
export function sanitizeSvgText(text) {
  let s = String(text || "");
  s = s.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "");
  s = s.replace(/<script\b[^>]*\/?>/gi, "");
  s = s.replace(/<foreignObject[\s\S]*?<\/foreignObject>/gi, "");
  s = s.replace(/\s+on[a-z]+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, "");
  // javascript: / data: w href i xlink:href (use, image, a)
  s = s.replace(/\s(xlink:href|href)\s*=\s*("|')\s*(javascript:|data:)/gi, " $1=$2#");
  s = s.replace(/\s(xlink:href|href)\s*=\s*(javascript:|data:)[^\s>]*/gi, ' $1="#"');
  return s;
}

const XLINK_NS = "http://www.w3.org/1999/xlink";
const DROP_SVG_TAGS = new Set([
  "script",
  "foreignobject",
  "iframe",
  "embed",
  "object",
  "set",
  "animate",
  "animatetransform",
  "animatemotion",
]);

function decodeHrefValue(value) {
  let s = String(value || "");
  for (let i = 0; i < 3; i++) {
    const prev = s;
    s = s
      .replace(/&#x([0-9a-fA-F]+);?/g, (_, h) => {
        const n = parseInt(h, 16);
        return n >= 0 && n < 0x110000 ? String.fromCodePoint(n) : "";
      })
      .replace(/&#(\d+);?/g, (_, d) => {
        const n = parseInt(d, 10);
        return n >= 0 && n < 0x110000 ? String.fromCodePoint(n) : "";
      });
    try {
      s = decodeURIComponent(s);
    } catch {
      s = s.replace(/%([0-9a-fA-F]{2})/g, (_, h) => String.fromCharCode(parseInt(h, 16)));
    }
    if (s === prev) break;
  }
  return s;
}

function stripHrefNoise(s) {
  let out = "";
  for (const ch of s) {
    const c = ch.codePointAt(0);
    if (c <= 0x1f || c === 0x7f || (c >= 0x200b && c <= 0x200d) || c === 0xfeff) continue;
    if (/\s/.test(ch)) continue;
    out += ch;
  }
  return out.toLowerCase();
}

export function isSafeSvgHref(value) {
  const decoded = decodeHrefValue(value);
  const compact = stripHrefNoise(decoded);
  if (/^(javascript|data|vbscript):/.test(compact)) return false;
  const trimmed = decoded.trim();
  if (trimmed.startsWith("#")) return true;
  if (trimmed.startsWith("//")) return false;
  if (/^[a-z][a-z0-9+.-]*:/i.test(trimmed)) return false;
  return true;
}

function neutralizeHref(el, attrName, ns) {
  const raw = ns ? el.getAttributeNS(ns, attrName) : el.getAttribute(attrName);
  if (raw == null || isSafeSvgHref(raw)) return;
  if (ns) {
    el.setAttributeNS(ns, "xlink:href", "#");
    if (el.hasAttribute("xlink:href")) el.setAttribute("xlink:href", "#");
  } else {
    el.setAttribute(attrName, "#");
  }
}

/** Po parsowaniu: zdejmij wektory, których regex nie widzi. Zostaw legalne #SymbolId. */
export function sanitizeSvgDom(root) {
  if (!root || root.nodeType !== 1) return root;
  const tag = root.tagName.toLowerCase().replace(/^.*:/, "");
  if (DROP_SVG_TAGS.has(tag)) {
    root.remove();
    return null;
  }
  [...root.attributes].forEach((attr) => {
    if (/^on/i.test(attr.localName)) root.removeAttribute(attr.name);
  });
  if (root.hasAttribute("href")) neutralizeHref(root, "href");
  if (root.hasAttributeNS?.(XLINK_NS, "href") || root.hasAttribute("xlink:href")) {
    neutralizeHref(root, "href", XLINK_NS);
  }
  [...root.children].forEach((child) => sanitizeSvgDom(child));
  return root;
}

export function parseSvg(text) {
  const doc = new DOMParser().parseFromString(sanitizeSvgText(text), "image/svg+xml");
  const svg = doc.querySelector("svg");
  if (!svg) return null;
  sanitizeSvgDom(svg);
  return { doc, svg };
}

export function serializeSvg(svg) {
  let s = new XMLSerializer().serializeToString(svg);
  if (!/^<\?xml/.test(s)) s = '<?xml version="1.0" encoding="UTF-8"?>\n' + s;
  return s;
}

export function firstSchId(svg) {
  const g = svg.querySelector('[id^="sch-"]');
  return g ? g.id : null;
}
