import { describe, it, expect } from "vitest";
import { applySettingsForm, SETTINGS_DEFAULT } from "../src/project-settings.js";

function sampleCfg() {
  return {
    ...SETTINGS_DEFAULT,
    library: "../lib/symbole.svg",
    sheetConnections: {
      "CS/Zasilanie.svg": [{ id: "1", from: "G1:1", to: "F1:2", net: "L" }],
    },
    doc: "Stary tytuł",
    sheet: "Zasilanie",
  };
}

describe("applySettingsForm", () => {
  it("zostawia sheetConnections i library po zapisie formularza", () => {
    const cfg = sampleCfg();
    const conns = cfg.sheetConnections;
    applySettingsForm(cfg, {
      orient: "portrait",
      doc: "Nowy tytuł",
      serial: "SN-1",
      maker: "ACME",
      version: "2.0",
      sheet: "Bezpieczenstwo",
      norm: "IEC",
      date: "2026-09-13",
    });
    expect(cfg.sheetConnections).toBe(conns);
    expect(cfg.sheetConnections["CS/Zasilanie.svg"]).toHaveLength(1);
    expect(cfg.library).toBe("../lib/symbole.svg");
    expect(cfg.doc).toBe("Nowy tytuł");
    expect(cfg.orient).toBe("portrait");
    expect(cfg.sheet).toBe("Bezpieczenstwo");
  });

  it("puste pola formularza nie wstawiają undefined w sheetConnections i library", () => {
    const cfg = sampleCfg();
    applySettingsForm(cfg, {
      orient: "",
      doc: "",
      serial: "",
      maker: "",
      version: "",
      sheet: "",
      norm: "",
      date: "",
      library: undefined,
      sheetConnections: undefined,
    });
    expect(cfg.library).toBe("../lib/symbole.svg");
    expect(cfg.sheetConnections).toEqual({
      "CS/Zasilanie.svg": [{ id: "1", from: "G1:1", to: "F1:2", net: "L" }],
    });
    expect(cfg.library).not.toBeUndefined();
    expect(cfg.sheetConnections).not.toBeUndefined();
  });

  it("ignoruje library i sheetConnections podane w form", () => {
    const cfg = sampleCfg();
    applySettingsForm(cfg, {
      doc: "X",
      library: "",
      sheetConnections: {},
    });
    expect(cfg.library).toBe("../lib/symbole.svg");
    expect(Object.keys(cfg.sheetConnections)).toEqual(["CS/Zasilanie.svg"]);
  });

  it("mutuje ten sam obiekt, nie buduje nowego", () => {
    const cfg = sampleCfg();
    const out = applySettingsForm(cfg, { doc: "Inny" });
    expect(out).toBe(cfg);
  });
});
