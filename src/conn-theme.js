/** Single source of truth — style złączy (conn). */
export const CONN_THEME = {
  stroke: "#0f172a",
  strokeWidth: 1.5,
  contactFill: "#dc2626",
  stubLinecap: "butt",
  pointJointR: 4,
};

export function connStrokeColorFromState(state) {
  return (state && state.strokeColor) || CONN_THEME.stroke;
}

/** Grubość linii złącza: inline stub/joint → fallback state → THEME. */
export function readConnStrokeWidth(connG, state) {
  if (!connG) return CONN_THEME.strokeWidth;
  const kind = connG.getAttribute("data-kind");
  const isPoint = kind === "point" || kind === "term";
  const primary = isPoint
    ? connG.querySelector('[data-part="joint"]')
    : connG.querySelector('[data-part="stub"]');
  const fallback = connG.querySelector('[data-part="stub"]') || connG.querySelector('[data-part="joint"]');
  for (const el of [primary, fallback]) {
    if (!el) continue;
    const sw = parseFloat(el.style?.strokeWidth || el.getAttribute("stroke-width"));
    if (!isNaN(sw) && sw > 0) return sw;
  }
  return (state && state.strokeW) || CONN_THEME.strokeWidth;
}

/** Promień punktu styku: średnica = grubość linii (r = sw/2). */
export function connContactRadius(connG, state) {
  return readConnStrokeWidth(connG, state) / 2;
}

export function styleConnContact(circle, connG, state, fmt) {
  if (!circle) return;
  const r = connContactRadius(connG, state);
  circle.setAttribute("class", "conn-contact");
  circle.setAttribute("r", fmt(r));
  circle.style.fill = CONN_THEME.contactFill;
  circle.style.stroke = "none";
  circle.style.pointerEvents = "none";
}

export function connStubCss() {
  const t = CONN_THEME;
  return `.conn-stub{fill:none;stroke:var(--object-stroke,${t.stroke});stroke-width:${t.strokeWidth};stroke-linecap:${t.stubLinecap};}`;
}

export function connJointCss() {
  const t = CONN_THEME;
  return `.conn-joint{fill:none;stroke:var(--object-stroke,${t.stroke});stroke-width:${t.strokeWidth};pointer-events:none;}`;
}

export function connContactCss() {
  const t = CONN_THEME;
  return `.conn-contact{fill:${t.contactFill};stroke:none;pointer-events:none;}`;
}

export function connAllCss() {
  return connStubCss() + "\n" + connJointCss() + "\n" + connContactCss() + "\n";
}

/** Wstrzyknij / zaktualizuj reguły conn-* w bloku <style> SVG biblioteki. */
export function syncConnStylesInLib(svg, SVGNS) {
  if (!svg) return;
  let defs = svg.querySelector("defs");
  if (!defs) {
    defs = document.createElementNS(SVGNS, "defs");
    svg.insertBefore(defs, svg.firstChild);
  }
  let st = defs.querySelector("style");
  if (!st) {
    st = document.createElementNS(SVGNS, "style");
    defs.insertBefore(st, defs.firstChild);
  }
  const connBlock = connAllCss().trim();
  let text = st.textContent || "";
  text = text.replace(/\.conn-stub\s*\{[^}]*\}/g, "");
  text = text.replace(/\.conn-joint\s*\{[^}]*\}/g, "");
  text = text.replace(/\.conn-contact\s*\{[^}]*\}/g, "");
  text = text.trim();
  st.textContent = (text ? text + "\n      " : "") + connBlock.replace(/\n/g, "\n      ");
}
