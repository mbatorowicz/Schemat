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
  s = s.replace(/<script[\s\S]*?<\/script>/gi, "");
  s = s.replace(/<foreignObject[\s\S]*?<\/foreignObject>/gi, "");
  s = s.replace(/\s+on[a-z]+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, "");
  // javascript: / data: w href i xlink:href (use, image, a)
  s = s.replace(/\s(xlink:href|href)\s*=\s*("|')\s*(javascript:|data:)/gi, " $1=$2#");
  s = s.replace(/\s(xlink:href|href)\s*=\s*(javascript:|data:)[^\s>]*/gi, ' $1="#"');
  return s;
}

export function parseSvg(text) {
  const doc = new DOMParser().parseFromString(sanitizeSvgText(text), "image/svg+xml");
  const svg = doc.querySelector("svg");
  return svg ? { doc, svg } : null;
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
