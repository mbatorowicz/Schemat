/** Domyślne pola projekt.json — kopia robocza ustawień. */

export const SETTINGS_DEFAULT = {
  orient: "landscape",
  doc: "",
  serial: "",
  maker: "",
  version: "1.0",
  sheet: "",
  norm: "",
  date: "",
  library: "",
  /** SSOT połączeń: { [sheetKey]: ConnectionJson[] } */
  sheetConnections: {},
};

const FORM_FIELDS = ["orient", "doc", "serial", "maker", "version", "sheet", "norm", "date"];

function pad2(n) {
  return ("0" + n).slice(-2);
}

export function settingsTodayStr(d = new Date()) {
  return d.getFullYear() + "-" + pad2(d.getMonth() + 1) + "-" + pad2(d.getDate());
}

/**
 * Nadpisuje w `cfg` wyłącznie pola formularza ustawień.
 * Nie rusza `sheetConnections` ani `library` — nawet gdy form je zawiera lub jest pusty.
 * @param {object} cfg
 * @param {Record<string, unknown>|null|undefined} form
 * @returns {object} ten sam `cfg`
 */
export function applySettingsForm(cfg, form) {
  if (!cfg || typeof cfg !== "object") return cfg;
  const src = form && typeof form === "object" ? form : {};
  for (const key of FORM_FIELDS) {
    if (!Object.prototype.hasOwnProperty.call(src, key)) continue;
    const raw = src[key];
    if (raw === undefined) continue;
    const value = typeof raw === "string" ? raw.trim() : String(raw).trim();
    cfg[key] = key === "date" ? value || settingsTodayStr() : value;
  }
  return cfg;
}
