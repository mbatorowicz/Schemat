/** SSOT — szablony pustych dokumentów SVG (biblioteka, schemat) i nazewnictwo plików. */

import { mkChromeEl, mkChromeText } from "./element-factory.js";
import { SVGNS } from "./svg-constants.js";
import { SHEET_TITLE_ATTR } from "./sheet-catalog.js";
import { LIBRARY_FILE_NAMES } from "./project-files.js";

export const DEFAULT_LIBRARY_FILE = LIBRARY_FILE_NAMES[0];

export function emptySvgMarkup(styleContent) {
  return (
    '<?xml version="1.0" encoding="UTF-8"?>\n' +
    `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 1485 1050" width="1485" height="1050">` +
    `<defs><style>${styleContent}</style></defs></svg>`
  );
}

export function libraryRelPathInProject(fileName = DEFAULT_LIBRARY_FILE) {
  return fileName;
}

export function uniqueFileName(existingNames, base, ext = ".svg") {
  const set = new Set((existingNames || []).map((n) => String(n).toLowerCase()));
  const root = String(base || "schemat").replace(/[^\w\-]+/g, "_") || "schemat";
  let fn = root + ext;
  let k = 1;
  while (set.has(fn.toLowerCase())) {
    fn = `${root}-${++k}${ext}`;
  }
  return fn;
}

export function uniqueLibraryFileName(existingNames) {
  const set = new Set((existingNames || []).map((n) => String(n).toLowerCase()));
  for (const name of LIBRARY_FILE_NAMES) {
    if (!set.has(name.toLowerCase())) return name;
  }
  let k = 2;
  while (set.has(`E-00_symbole-${k}.svg`.toLowerCase())) k++;
  return `E-00_symbole-${k}.svg`;
}

export function nextSheetGroupId(existingIds, svg) {
  const used = new Set(existingIds || []);
  let n = 1;
  let id;
  do {
    id = `sch-${n++}`;
  } while (used.has(id) || svg?.querySelector?.(`[id="${id}"]`));
  return id;
}

/** Grupa arkusza A4 z ramką dokumentu — używana przy tworzeniu nowego schematu. */
export function buildSheetGroup(id, cfg, svgNs = SVGNS) {
  const land = cfg.orient !== "portrait";
  const W = land ? 1485 : 1050;
  const H = land ? 1050 : 1485;
  const g = document.createElementNS(svgNs, "g");
  g.setAttribute("id", id);
  const docTitle = cfg.doc || "Schemat";
  g.setAttribute(SHEET_TITLE_ATTR, docTitle);
  g.appendChild(mkChromeEl("rect", { x: 12, y: 12, width: W - 24, height: H - 24, class: "fr" }));
  g.appendChild(mkChromeEl("rect", { x: 20, y: 20, width: W - 40, height: H - 40, class: "fr2" }));
  g.appendChild(mkChromeText(34, 52, "ttl", docTitle));
  g.appendChild(mkChromeText(34, 72, "sub", (cfg.maker || "") + (cfg.norm ? `  ·  ${cfg.norm}` : "")));
  const tH = 120;
  const tX = 34;
  const tW = W - 68;
  const tY = H - 34 - tH;
  g.appendChild(mkChromeEl("rect", { x: tX, y: tY, width: tW, height: tH, class: "fr" }));
  const splitX = tX + Math.round(tW * 0.6);
  g.appendChild(mkChromeEl("line", { x1: splitX, y1: tY, x2: splitX, y2: tY + tH, class: "fr2" }));
  g.appendChild(mkChromeEl("line", { x1: tX, y1: tY + 28, x2: splitX, y2: tY + 28, class: "fr2" }));
  g.appendChild(mkChromeText(tX + 12, tY + 19, "tbb", "Dokument"));
  g.appendChild(mkChromeText(tX + 12, tY + 52, "tb", cfg.doc || ""));
  const x0 = splitX;
  const x1 = tX + tW;
  const midX = Math.round((x0 + x1) / 2);
  const colW = (x1 - x0) / 2;
  const rowH = tH / 3;
  g.appendChild(mkChromeEl("line", { x1: midX, y1: tY, x2: midX, y2: tY + tH, class: "fr2" }));
  for (let r = 1; r < 3; r++) {
    g.appendChild(mkChromeEl("line", { x1: x0, y1: tY + r * rowH, x2: x1, y2: tY + r * rowH, class: "fr2" }));
  }
  const fields = [
    ["Nr seryjny", cfg.serial],
    ["Wytwórca", cfg.maker],
    ["Wersja", cfg.version],
    ["Arkusz", cfg.sheet],
    ["Norma", cfg.norm],
    ["Data", cfg.date],
  ];
  fields.forEach((f, i) => {
    const r = Math.floor(i / 2);
    const c = i % 2;
    const cx = x0 + c * colW;
    const cy = tY + r * rowH;
    g.appendChild(mkChromeText(cx + 8, cy + 15, "tbb", f[0]));
    g.appendChild(mkChromeText(cx + 8, cy + rowH - 8, "tb", f[1] || ""));
  });
  return g;
}

export function projectSettingsForNewProject(dirName, overrides = {}) {
  return {
    orient: "landscape",
    doc: dirName || "",
    serial: "",
    maker: "",
    version: "1.0",
    sheet: "Schemat",
    norm: "EN 60204-1",
    library: libraryRelPathInProject(DEFAULT_LIBRARY_FILE),
    ...overrides,
  };
}
