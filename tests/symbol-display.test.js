import { describe, it, expect } from "vitest";
import {
  inferSymbolDisplayName,
  symbolListSubtitle,
  looksLikeReadableSymbolId,
  humanizeSymbolId,
} from "../src/symbol-display.js";
import { SYMBOL_NAME_ATTR } from "../src/symbol-save.js";

function mockNode(id, attrs = {}) {
  return {
    id,
    getAttribute(n) {
      return attrs[n] ?? null;
    },
    querySelector() {
      return null;
    },
  };
}

describe("symbol-display", () => {
  it("inferSymbolDisplayName preferuje data-symbol-name", () => {
    const n = mockNode("B", { [SYMBOL_NAME_ATTR]: "Czujnik", "data-inst-prefix": "B" });
    expect(inferSymbolDisplayName(n, "B")).toBe("Czujnik");
  });

  it("inferSymbolDisplayName nie używa katalogu domyślnych nazw", () => {
    expect(inferSymbolDisplayName(mockNode("B"), "B")).toBe("");
  });

  it("inferSymbolDisplayName humanizuje czytelne id", () => {
    expect(inferSymbolDisplayName(mockNode("COIL-Time"), "COIL-Time")).toBe("COIL Time");
    expect(inferSymbolDisplayName(mockNode("Arrow"), "Arrow")).toBe("Arrow");
  });

  it("symbolListSubtitle pokazuje oznaczenie pod nazwą", () => {
    const n = mockNode("B", { [SYMBOL_NAME_ATTR]: "Czujnik", "data-inst-prefix": "B" });
    expect(symbolListSubtitle(n, "B")).toBe("B");
  });

  it("looksLikeReadableSymbolId i humanizeSymbolId", () => {
    expect(looksLikeReadableSymbolId("B")).toBe(false);
    expect(looksLikeReadableSymbolId("COIL")).toBe(true);
    expect(humanizeSymbolId("COIL-Time")).toBe("COIL Time");
  });
});
