/**
 * Odbicie lustrzane zaznaczenia — geometria i kąty (bez DOM UI).
 */

/** Odbicie punktu. axis "h" = względem osi pionowej (lewo↔prawo), "v" = poziomej (góra↔dół). */
export function flipPoint(x, y, cx, cy, axis) {
  return axis === "h" ? [2 * cx - x, y] : [x, 2 * cy - y];
}

/** Kąt po odbiciu (stopnie). */
export function flipAngleDeg(ang, axis) {
  const a = Number(ang) || 0;
  return axis === "h" ? 180 - a : -a;
}

export function normalizeAngleDeg(ang) {
  let a = Number(ang) || 0;
  while (a > 180) a -= 360;
  while (a <= -180) a += 360;
  return a;
}

/**
 * Zbierz elementy do odbicia: zaznaczenie + członkowie instancji + etykiety owned.
 * @param {Element[]} els
 * @param {Element} node
 * @param {{
 *   expandToInstanceMembers?: Function,
 *   instanceRefOf?: Function,
 *   rotateOwnedLabels?: boolean,
 * }} [opts]
 */
export function collectFlipTargets(els, node, opts = {}) {
  const list = (els || []).filter((el) => el && (!node || el.parentNode === node));
  if (!list.length) return [];
  let out = list;
  if (typeof opts.expandToInstanceMembers === "function" && node) {
    out = opts.expandToInstanceMembers(node, list);
  }
  const selected = new Set(out);
  if (opts.rotateOwnedLabels !== false && node && typeof opts.instanceRefOf === "function") {
    const refs = new Set();
    out.forEach((el) => {
      if (el.tagName?.toLowerCase() === "use") {
        const r = el.getAttribute("data-ref");
        if (r) refs.add(r);
      } else {
        const r = opts.instanceRefOf(el);
        if (r) refs.add(r);
      }
    });
    [...node.children].forEach((el) => {
      if (!el.tagName || el.tagName.toLowerCase() !== "text") return;
      if (selected.has(el)) return;
      if (el.getAttribute("data-role") === "wire-mark") return;
      const owner = el.getAttribute("data-owner-ref");
      if (owner && refs.has(owner)) {
        out.push(el);
        selected.add(el);
      }
    });
  }
  return out;
}
