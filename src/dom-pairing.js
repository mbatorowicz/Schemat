/** Mapowanie src (state.srcSvg) ↔ klon podglądu (gHost) — jedyny dozwolony sposób parowania elementów. */

export function childIndex(node, el) {
  if (!node || !el || el.parentNode !== node) return -1;
  return Array.prototype.indexOf.call(node.children, el);
}

export function childPair(node, el, hostRoot) {
  const index = childIndex(node, el);
  const cel = index >= 0 && hostRoot ? hostRoot.children[index] : null;
  return { src: el, cel, index };
}

export function cloneChild(node, el, hostRoot) {
  return childPair(node, el, hostRoot).cel;
}

export function forEachPaired(node, hostRoot, fn) {
  if (!node || !hostRoot) return;
  const n = Math.min(node.children.length, hostRoot.children.length);
  for (let i = 0; i < n; i++) fn(node.children[i], hostRoot.children[i], i);
}
