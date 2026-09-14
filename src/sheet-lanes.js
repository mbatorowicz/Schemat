/**
 * Pasy rysunku A4 (EN 60204-1): szyny zasilania u góry, kolumny, listwy X z prawej.
 * Współrzędne zgodne z document-scaffold (ramka + tabelka).
 */

export const SHEET_SIZE = {
  landscape: { width: 1485, height: 1050 },
  portrait: { width: 1050, height: 1485 },
};

const FRAME_INSET = 20;
const TITLE_BLOCK_H = 120;
const TITLE_BLOCK_BOTTOM = 34;
const CONTENT_PAD = 20;
const HEADER_Y = 96;

export function snapToGrid(v, step = 5) {
  const s = Math.max(1, +step || 5);
  return Math.round(v / s) * s;
}

/** Pole rysunku wewnątrz ramki, nad tabelką dokumentu. */
export function sheetContentBounds(orient = "landscape") {
  const land = orient !== "portrait";
  const size = land ? SHEET_SIZE.landscape : SHEET_SIZE.portrait;
  const titleBlockY = size.height - TITLE_BLOCK_BOTTOM - TITLE_BLOCK_H;
  const x = FRAME_INSET + CONTENT_PAD;
  const y = HEADER_Y;
  const width = size.width - 2 * (FRAME_INSET + CONTENT_PAD);
  const height = titleBlockY - y - CONTENT_PAD;
  return {
    x,
    y,
    width,
    height,
    pageWidth: size.width,
    pageHeight: size.height,
    titleBlockY,
  };
}

/**
 * @param {ReturnType<typeof sheetContentBounds>} bounds
 * @param {number} [step]
 */
export function laneRects(bounds, step = 5) {
  const s = Math.max(1, +step || 5);
  const railH = snapToGrid(Math.max(s * 10, 50), s);
  const innerY = bounds.y + railH;
  const innerH = Math.max(s * 8, bounds.height - railH);
  const innerW = bounds.width;
  const x0 = bounds.x;

  const powerW = snapToGrid(innerW * 0.28, s);
  const controlW = snapToGrid(innerW * 0.28, s);
  const driveW = snapToGrid(innerW * 0.22, s);
  const terminalsW = innerW - powerW - controlW - driveW;

  const powerX = x0;
  const controlX = powerX + powerW;
  const driveX = controlX + controlW;
  const terminalsX = driveX + driveW;

  const col = (x, w) => ({ x, y: innerY, width: w, height: innerH });

  return {
    rails: { x: x0, y: bounds.y, width: innerW, height: railH },
    power: col(powerX, powerW),
    control: col(controlX, controlW),
    drive: col(driveX, driveW),
    terminals: col(terminalsX, terminalsW),
  };
}

export function laneOverlapsTitleBlock(lane, titleBlockY) {
  if (!lane) return false;
  return lane.y + lane.height > titleBlockY;
}
