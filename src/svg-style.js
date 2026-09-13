/**
 * CSS z <style> w SVG nie jest scoped w HTML — surowy klon styluje cały edytor.
 * Zostaw tylko selektory klasy/#id (m.in. #SymbolId) i bezpieczne deklaracje.
 */

const SIMPLE = "[.#][A-Za-z_][\\w-]*";
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
  return !ids.some((id) => DENIED_STYLE_IDS.has(id.slice(1).toLowerCase()));
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

/** Ogranicz selektory i wartości; każdą regułę scope'uj do `svg`, żeby nie stylować chrome. */
export function sanitizeSvgStyleText(css) {
  const body = stripAtRules(stripCssComments(css));
  const out = [];
  const re = /([^{}]+)\{([^{}]*)\}/g;
  let m;
  while ((m = re.exec(body))) {
    const sels = m[1]
      .split(",")
      .map((s) =>
        s
          .trim()
          .replace(/^svg\s+/i, "")
          .trim()
      )
      .filter(isSafeSvgStyleSelector)
      .map((s) => "svg " + s);
    if (!sels.length) continue;
    const decls = sanitizeSvgStyleDecls(m[2]);
    if (!decls) continue;
    out.push(`${sels.join(",")}{${decls}}`);
  }
  return out.join("\n");
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
