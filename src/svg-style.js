/**
 * CSS z <style> w SVG nie jest scoped w HTML — surowy klon styluje cały edytor.
 * Klasy/#id zostaw bez prefiksu `svg ` (inaczej <use> w shadow tree traci .sym/.fr).
 * Selektory typu (path, text…) na klonie ogranicz do sceny, nie do ikon toolbara.
 */

import { connAllCss } from "./conn-theme.js";
import { wireCssRules } from "./wire-theme.js";

export const EDITOR_STYLE_SCOPE = "#stage, #sidebarSymbolDefs";

const SVG_TYPE = "svg|g|path|line|rect|circle|ellipse|polyline|polygon|text|tspan|use|image|marker";
const SVG_TYPE_SET = new Set(SVG_TYPE.split("|"));
const CLASS_OR_ID = "[.#][A-Za-z_][\\w-]*";
const SIMPLE = `(?:(?:${SVG_TYPE})(?:${CLASS_OR_ID})*|${CLASS_OR_ID})`;
const COMPOUND = `(?:${SIMPLE})+`;
const COMB = "(?:\\s*[>+~]\\s*|\\s+)";
const SAFE_SELECTOR = new RegExp(`^${COMPOUND}(?:${COMB}${COMPOUND})*$`);

/** #id chrome edytora — nie mylić z #SymbolId. */
const DENIED_STYLE_IDS = new Set([
  "app",
  "toolbar",
  "toolbarmode",
  "toolbarcontext",
  "main",
  "left",
  "stage",
  "stagewrap",
  "status",
  "hud",
  "filemenu",
  "toasthost",
  "drawbanner",
  "confirmdialog",
  "choicedialog",
  "connmeta",
  "sidebarsymboldefs",
  "savebadge",
  "body",
  "html",
  "head",
  "root",
]);

export function isSafeSvgStyleSelector(sel) {
  const raw = String(sel || "").trim();
  if (!raw) return false;
  const rest = raw.replace(/^svg\s+/i, "").trim();
  if (!rest || /[:[\]@*|\\]/.test(rest)) return false;
  if (!SAFE_SELECTOR.test(rest)) return false;
  const ids = rest.match(/#[A-Za-z_][\w-]*/g) || [];
  return !ids.some((id) => {
    const name = id.slice(1).toLowerCase();
    if ((name === "stage" || name === "sidebarsymboldefs") && rest !== id) return false;
    return DENIED_STYLE_IDS.has(name);
  });
}

function stripCssComments(css) {
  return String(css || "")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/<!--[\s\S]*?-->/g, "");
}

function stripAtRules(css) {
  let i = 0;
  let out = "";
  while (i < css.length) {
    if (css[i] === "@") {
      while (i < css.length && css[i] !== ";" && css[i] !== "{") i++;
      if (css[i] === ";") {
        i++;
        continue;
      }
      if (css[i] === "{") {
        let depth = 0;
        for (; i < css.length; i++) {
          if (css[i] === "{") depth++;
          else if (css[i] === "}") {
            depth--;
            if (depth === 0) {
              i++;
              break;
            }
          }
        }
        continue;
      }
      break;
    }
    out += css[i++];
  }
  return out;
}

function isSafeStyleValue(value) {
  const v = String(value || "").trim();
  if (!v) return false;
  const compact = v.replace(/\s+/g, "").toLowerCase();
  if (compact.includes("expression(") || compact.includes("behavior:") || compact.includes("-moz-binding")) {
    return false;
  }
  if (/javascript:|vbscript:|data:/i.test(compact)) return false;
  const urls = [...v.matchAll(/url\s*\(([^)]*)\)/gi)];
  for (const m of urls) {
    const inner = m[1]
      .trim()
      .replace(/^['"]|['"]$/g, "")
      .trim();
    if (!/^#[A-Za-z_][\w-]*$/.test(inner)) return false;
  }
  return true;
}

export function sanitizeSvgStyleDecls(block) {
  const parts = [];
  for (const raw of String(block || "").split(";")) {
    const chunk = raw.trim();
    if (!chunk) continue;
    const colon = chunk.indexOf(":");
    if (colon < 1) continue;
    const prop = chunk.slice(0, colon).trim();
    const value = chunk.slice(colon + 1).trim();
    if (!/^[a-zA-Z-]+$/.test(prop)) continue;
    if (!isSafeStyleValue(value)) continue;
    parts.push(`${prop}:${value}`);
  }
  return parts.join(";");
}

function startsWithSvgType(sel) {
  const m = String(sel || "").match(/^[a-zA-Z][\w-]*/);
  return !!(m && SVG_TYPE_SET.has(m[0].toLowerCase()));
}

function rewriteSelector(sel, scopeTypes) {
  const s = String(sel || "")
    .trim()
    .replace(/^svg\s+/i, "")
    .trim();
  if (!s) return [];
  if (!scopeTypes) return [s];
  if (s.toLowerCase() === "svg") {
    return String(scopeTypes)
      .split(",")
      .map((sc) => sc.trim())
      .filter(Boolean);
  }
  if (!startsWithSvgType(s)) return [s];
  return String(scopeTypes)
    .split(",")
    .map((sc) => sc.trim() + " " + s)
    .filter((x) => x.trim().length > s.length);
}

/** Ogranicz selektory i wartości. Nie dodawaj `svg ` — psuje style w <use>. */
export function sanitizeSvgStyleText(css, opts = {}) {
  const scopeTypes = opts.scopeTypes || "";
  const body = stripAtRules(stripCssComments(css));
  const out = [];
  const re = /([^{}]+)\{([^{}]*)\}/g;
  let m;
  while ((m = re.exec(body))) {
    const sels = m[1]
      .split(",")
      .flatMap((s) => rewriteSelector(s, scopeTypes))
      .filter(isSafeSvgStyleSelector);
    if (!sels.length) continue;
    const decls = sanitizeSvgStyleDecls(m[2]);
    if (!decls) continue;
    out.push(`${sels.join(",")}{${decls}}`);
  }
  return out.join("\n");
}

export function essentialSvgStyleText() {
  return (
    ".fr{fill:none;stroke:#0f172a;stroke-width:2;}\n" +
    ".fr2{fill:none;stroke:#0f172a;stroke-width:1;}\n" +
    ".ttl{font:700 22px Arial,sans-serif;fill:#0f172a;}\n" +
    ".sub{font:400 11px Arial,sans-serif;fill:#475569;}\n" +
    ".tb{font:400 11px Arial,sans-serif;fill:#0f172a;}\n" +
    ".tbb{font:700 11px Arial,sans-serif;fill:#0f172a;}\n" +
    ".cap{font:700 12px Arial,sans-serif;fill:#0f172a;}\n" +
    ".capd{font:400 10px Arial,sans-serif;fill:#475569;}\n" +
    ".cat{font:700 9px Arial,sans-serif;fill:#94a3b8;}\n" +
    ".cell{fill:#ffffff;stroke:#cbd5e1;stroke-width:1;}\n" +
    ".sym{fill:none;stroke:#0f172a;stroke-width:1.5;stroke-linecap:round;stroke-linejoin:round;}\n" +
    ".symt{fill:none;stroke:#0f172a;stroke-width:1.5;stroke-linecap:round;stroke-linejoin:round;}\n" +
    connAllCss() +
    ".dash{stroke-dasharray:4 3;}\n" +
    ".node{fill:#0f172a;}\n" +
    ".pin{font:400 9px Arial,sans-serif;fill:var(--object-stroke,#334155);}\n" +
    ".did{font:700 12px Arial,sans-serif;fill:var(--object-stroke,#0f172a);}\n" +
    wireCssRules() +
    "\n"
  );
}

function hasEssentialClasses(css) {
  return /\.sym\b/.test(css) && /\.fr\b/.test(css);
}

/** Po czyszczeniu: zdejmij `svg .klasa` i uzupełnij brakujące .sym/.fr (odtworzenie po złym zapisie). */
export function finalizeSvgStyleText(css, opts = {}) {
  const cleaned = sanitizeSvgStyleText(css, opts);
  if (hasEssentialClasses(cleaned)) return cleaned;
  const extra = sanitizeSvgStyleText(essentialSvgStyleText(), opts);
  return [cleaned, extra].filter(Boolean).join("\n");
}

/**
 * Idempotentna migracja <style> w dokumencie SVG (lib / arkusz).
 * Stary zapis `svg .sym` → `.sym`; brakujące klasy edytora wracają.
 */
export function migrateSvgDocumentStyle(svg, svgNs) {
  if (!svg) return false;
  const ns = svgNs || svg.namespaceURI;
  const doc = svg.ownerDocument;
  if (!doc) return false;
  let defs = svg.querySelector("defs");
  if (!defs) {
    defs = doc.createElementNS(ns, "defs");
    svg.insertBefore(defs, svg.firstChild);
  }
  const styles = [...svg.querySelectorAll("style")];
  if (!styles.length) {
    const style = doc.createElementNS(ns, "style");
    defs.insertBefore(style, defs.firstChild);
    styles.push(style);
  }
  let changed = false;
  for (const style of styles) {
    const prev = style.textContent || "";
    const next = finalizeSvgStyleText(prev);
    if (next !== prev) {
      style.textContent = next;
      changed = true;
    }
  }
  return changed;
}

/** Stroke/fill klas symboli jako var(--object-stroke) — jak dawniej w useColorAwareClone. */
export function applyColorAwareCss(css) {
  return String(css || "")
    .replace(/stroke\s*:\s*([^;}\n]+)/g, (all, v) => {
      const value = v.trim();
      return value === "none" || value.indexOf("var(") >= 0 ? all : "stroke:var(--object-stroke," + value + ")";
    })
    .replace(/(\.node\s*\{[^}]*?)fill\s*:\s*([^;}\n]+)/g, (all, prefix, v) => {
      const value = v.trim();
      return value === "none" || value.indexOf("var(") >= 0 ? all : prefix + "fill:var(--object-stroke," + value + ")";
    })
    .replace(/(\.pin\s*\{[^}]*?)fill\s*:\s*([^;}\n]+)/g, (all, prefix, v) => {
      const value = v.trim();
      return value === "none" || value.indexOf("var(") >= 0 ? all : prefix + "fill:var(--object-stroke," + value + ")";
    })
    .replace(/(\.did\s*\{[^}]*?)fill\s*:\s*([^;}\n]+)/g, (all, prefix, v) => {
      const value = v.trim();
      return value === "none" || value.indexOf("var(") >= 0 ? all : prefix + "fill:var(--object-stroke," + value + ")";
    });
}
