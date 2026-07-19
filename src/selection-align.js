/**
 * Wyrównywanie zaznaczenia — jednostki to instancje (wspólny ref) albo pojedyncze elementy.
 */

export const ALIGN_MODES = ["left", "centerH", "right", "top", "centerV", "bottom"];

/** Grupuje elementy w jednostki ruchu (instancja / singleton). */
export function buildAlignUnits(els, instanceRefOf) {
  const list = (els || []).filter(Boolean);
  const units = [];
  const byRef = new Map();
  const solo = [];

  list.forEach((el) => {
    const ref = typeof instanceRefOf === "function" ? instanceRefOf(el) : "";
    if (ref) {
      if (!byRef.has(ref)) byRef.set(ref, []);
      byRef.get(ref).push(el);
    } else {
      solo.push(el);
    }
  });

  byRef.forEach((members, ref) => {
    units.push({ id: "ref:" + ref, ref, members });
  });
  solo.forEach((el, i) => {
    units.push({ id: "solo:" + i, ref: "", members: [el] });
  });
  return units;
}

export function unionBox(boxes) {
  let minx = Infinity,
    miny = Infinity,
    maxx = -Infinity,
    maxy = -Infinity,
    any = false;
  (boxes || []).forEach((b) => {
    if (!b || !isFinite(b.x) || !isFinite(b.y)) return;
    const w = Number(b.width) || 0;
    const h = Number(b.height) || 0;
    any = true;
    minx = Math.min(minx, b.x);
    miny = Math.min(miny, b.y);
    maxx = Math.max(maxx, b.x + w);
    maxy = Math.max(maxy, b.y + h);
  });
  if (!any) return null;
  return { x: minx, y: miny, width: maxx - minx, height: maxy - miny };
}

/**
 * @param {{ id: string, box: {x,y,width,height} }[]} unitBoxes
 * @param {string} mode
 * @returns {{ id: string, dx: number, dy: number }[]}
 */
export function computeAlignDeltas(unitBoxes, mode) {
  const boxes = (unitBoxes || []).filter((u) => u && u.box);
  if (boxes.length < 2) return [];
  const overall = unionBox(boxes.map((u) => u.box));
  if (!overall) return [];

  return boxes
    .map(({ id, box }) => {
      let dx = 0;
      let dy = 0;
      switch (mode) {
        case "left":
          dx = overall.x - box.x;
          break;
        case "right":
          dx = overall.x + overall.width - (box.x + box.width);
          break;
        case "centerH":
          dx = overall.x + overall.width / 2 - (box.x + box.width / 2);
          break;
        case "top":
          dy = overall.y - box.y;
          break;
        case "bottom":
          dy = overall.y + overall.height - (box.y + box.height);
          break;
        case "centerV":
          dy = overall.y + overall.height / 2 - (box.y + box.height / 2);
          break;
        default:
          break;
      }
      return { id, dx, dy };
    })
    .filter((d) => Math.abs(d.dx) > 1e-9 || Math.abs(d.dy) > 1e-9);
}
