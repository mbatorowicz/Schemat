// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import {
  CONNECTION_FIELD_DEFS,
  readConnectionFieldsFromProps,
  writeConnectionFieldsToProps,
  applyConnectionFieldLabels,
  setConnectionPropsVisible,
} from "../src/connection-fields.js";

describe("connection-fields", () => {
  it("definiuje Sygnał/Typ przewodu/Długość/Uwagi; typ/długość/uwagi bez belki", () => {
    expect(CONNECTION_FIELD_DEFS.map((d) => d.key)).toEqual(["net", "wire", "length", "notes"]);
    expect(CONNECTION_FIELD_DEFS.find((d) => d.key === "wire").label()).toBe("Typ przewodu");
    expect(CONNECTION_FIELD_DEFS.find((d) => d.key === "net").propId).toBe("selPropNet");
    expect(CONNECTION_FIELD_DEFS.find((d) => d.key === "wire").propId).toBeNull();
    expect(CONNECTION_FIELD_DEFS.find((d) => d.key === "length").propId).toBeNull();
    expect(CONNECTION_FIELD_DEFS.find((d) => d.key === "notes").propId).toBeNull();
  });

  it("read/write belki", () => {
    const els = {
      netInp: { value: "L" },
      wireInp: { value: "1.5" },
      lengthInp: { value: "2 m" },
      notesInp: { value: "x" },
    };
    expect(readConnectionFieldsFromProps(els)).toEqual({
      net: "L",
      wire: "1.5",
      length: "2 m",
      notes: "x",
    });
    writeConnectionFieldsToProps(els, { net: "N", wire: "", length: "", notes: "" });
    expect(els.netInp.value).toBe("N");
  });

  it("setConnectionPropsVisible pokazuje tylko sygnał", () => {
    const els = {
      netField: {
        classList: {
          toggle: (c, on) => {
            els._net = !on;
          },
        },
      },
      wireField: {
        classList: {
          add: (c) => {
            els._wireHidden = c === "context-hidden";
          },
        },
      },
      lengthField: {
        classList: {
          add: (c) => {
            els._lenHidden = c === "context-hidden";
          },
        },
      },
      notesField: {
        classList: {
          add: (c) => {
            els._notesHidden = c === "context-hidden";
          },
        },
      },
    };
    setConnectionPropsVisible(els, true);
    expect(els._net).toBe(true);
    expect(els._wireHidden).toBe(true);
    expect(els._lenHidden).toBe(true);
    expect(els._notesHidden).toBe(true);
  });

  it("applyConnectionFieldLabels ustawia etykiety w formularzu spisu", () => {
    document.body.innerHTML =
      '<label for="selPropNet">Potencjał</label><input id="selPropNet" />' +
      '<label for="neNet">Oznacznik</label><input id="neNet" />' +
      '<label for="neWire">Y</label><input id="neWire" />';
    applyConnectionFieldLabels(document);
    expect(document.querySelector('label[for="selPropNet"]').textContent).toBe("Sygnał");
    expect(document.querySelector('label[for="neNet"]').textContent).toBe("Sygnał");
    expect(document.querySelector('label[for="neWire"]').textContent).toBe("Typ przewodu");
    expect(document.getElementById("neWire").title).toMatch(/nie kolor/i);
  });
});
