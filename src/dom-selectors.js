/** Bezpieczne selektory CSS z dynamicznymi wartościami atrybutów. */

export function cssEsc(value) {
  const s = String(value);
  if (typeof CSS !== "undefined" && typeof CSS.escape === "function") {
    return CSS.escape(s);
  }
  return s.replace(/([\\"])/g, "\\$1");
}

export function qsById(root, id) {
  if (!root?.querySelector || id == null || id === "") return null;
  return root.querySelector('[id="' + cssEsc(id) + '"]');
}

export function qsByData(root, name, value) {
  if (!root?.querySelector || value == null) return null;
  return root.querySelector('[data-' + name + '="' + cssEsc(String(value)) + '"]');
}

export function qsaByData(root, name, value) {
  if (!root?.querySelectorAll || value == null) return [];
  return [...root.querySelectorAll('[data-' + name + '="' + cssEsc(String(value)) + '"]')];
}

export function qsByOwnerRef(root, ref) {
  if (!root?.querySelector || ref == null) return null;
  return root.querySelector('text[data-owner-ref="' + cssEsc(String(ref)) + '"]');
}

export function qsaByOwnerRef(root, ref) {
  if (!root?.querySelectorAll || ref == null) return [];
  return [...root.querySelectorAll('text[data-owner-ref="' + cssEsc(String(ref)) + '"]')];
}
