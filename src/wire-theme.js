/** SSOT klas przewodów — kolor schematu domyślnie czarny (jak wydruk). */

export const WIRE_DEFAULT_STROKE = "#0f172a";

/** Zachowane nazwy klas (grubość / dash PE); kolor zawsze czarny. */
export const WIRE_CLASS_COLORS = {
  wL: WIRE_DEFAULT_STROKE,
  wN: WIRE_DEFAULT_STROKE,
  wPE: WIRE_DEFAULT_STROKE,
  w48: WIRE_DEFAULT_STROKE,
  w0v: WIRE_DEFAULT_STROKE,
  wsafe: WIRE_DEFAULT_STROKE,
  wsig: WIRE_DEFAULT_STROKE,
  wenc: WIRE_DEFAULT_STROKE,
  w24: WIRE_DEFAULT_STROKE,
};

const WIRE_CLASS_STROKE = {
  wPE: "stroke-width:2;stroke-dasharray:7 4;stroke-linecap:round;",
  wL: "stroke-width:2.2;stroke-linecap:round;stroke-linejoin:round;",
  default: "stroke-width:2;stroke-linecap:round;stroke-linejoin:round;",
};

export function wireColor(_cls) {
  return WIRE_DEFAULT_STROKE;
}

export const WIRE_STROKE_OPTIONS = ["", "1.5", "2", "2.2", "3"];

export function wireCssRules() {
  return Object.keys(WIRE_CLASS_COLORS)
    .map((cls) => {
      const color = WIRE_DEFAULT_STROKE;
      const extra = WIRE_CLASS_STROKE[cls] || WIRE_CLASS_STROKE.default;
      return `.${cls}{fill:none;stroke:${color};${extra}}`;
    })
    .join("\n");
}
