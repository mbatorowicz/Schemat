/** Styl elementów tekstowych — zapis inline, bez nadpisywania istniejących wartości. */

export function readFontSizePx(el, fallback = 9) {
  if (!el) return fallback;
  const inline = parseFloat(el.style?.fontSize);
  if (!isNaN(inline) && inline > 0) return inline;
  return fallback;
}

/** Ustaw typografię; domyślnie tylko puste pola (zachowuje edycje użytkownika). */
export function applyTextStyle(el, style, opts = {}) {
  if (!el || !style) return;
  const force = !!opts.force;
  if (force || !el.style.fontSize) el.style.fontSize = style.fontSize + "px";
  if (force || !el.style.fontWeight) el.style.fontWeight = String(style.fontWeight ?? 400);
  if (force || !el.style.fill) el.style.fill = style.strokeColor || style.fill || "#0f172a";
}

const CSS_VAR_STROKE = "--object-stroke";

/** Kolor główny: CSS var na hoście + stroke/fill/tekst. */
export function applyPrimaryColor(targets, color) {
  if (!targets || !color) return;
  for (const host of targets.cssVarHosts || []) {
    host.style.setProperty(CSS_VAR_STROKE, color);
  }
  for (const el of targets.strokes || []) {
    el.style.stroke = color;
  }
  for (const el of targets.fills || []) {
    el.style.fill = color;
  }
  for (const el of targets.texts || []) {
    el.style.fill = color;
  }
}

export function applyStrokeWidth(targets, width, fmt) {
  if (!targets || width == null) return;
  const w = typeof fmt === "function" ? fmt(width) : String(width);
  for (const el of targets.strokes || []) {
    el.style.strokeWidth = w;
  }
}

export function applyStrokeDash(targets, dashed) {
  if (!targets) return;
  const dash = dashed ? "4 3" : "none";
  for (const el of targets.strokes || []) {
    el.style.strokeDasharray = dash;
  }
}

export function applyFill(targets, color, enabled) {
  if (!targets) return;
  const fill = enabled ? color : "none";
  for (const el of targets.fills || []) {
    el.style.fill = fill;
  }
}

export function applyFont(targets, { fontSize, fontWeight }) {
  if (!targets) return;
  for (const el of targets.texts || []) {
    if (fontSize != null && !isNaN(fontSize)) el.style.fontSize = fontSize + "px";
    if (fontWeight != null && fontWeight !== "") el.style.fontWeight = String(fontWeight);
  }
}
