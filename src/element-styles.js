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
