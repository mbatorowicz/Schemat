/** SSOT kolorów i klas przewodów (spójne z netlist-model.wireClass). */

export const WIRE_CLASS_COLORS = {
  wL: "#8B4513",
  wN: "#2563eb",
  wPE: "#228B22",
  w48: "#c2410c",
  w0v: "#64748b",
  wsafe: "#ca8a04",
  wsig: "#6b21a8",
  wenc: "#0d9488",
  w24: "#1e3a8a",
};

const WIRE_CLASS_STROKE = {
  wPE: "stroke-width:2;stroke-dasharray:7 4;stroke-linecap:round;",
  wL: "stroke-width:2.2;stroke-linecap:round;stroke-linejoin:round;",
  default: "stroke-width:2;stroke-linecap:round;stroke-linejoin:round;",
};

export function wireColor(cls) {
  return WIRE_CLASS_COLORS[cls] || "#0f172a";
}

export function wireCssRules() {
  return Object.keys(WIRE_CLASS_COLORS)
    .map((cls) => {
      const color = WIRE_CLASS_COLORS[cls];
      const extra = WIRE_CLASS_STROKE[cls] || WIRE_CLASS_STROKE.default;
      return `.${cls}{fill:none;stroke:${color};${extra}}`;
    })
    .join("\n");
}
