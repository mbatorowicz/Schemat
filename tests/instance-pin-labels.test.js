// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { syncInstancePinLabels, markSheetPinLabelManual } from "../src/instance-labels.js";
import {
  writeUseOrient,
  composeSheetFlip,
  mapLocalToSheet,
  mapSheetToLocal,
  readUseOrient,
} from "../src/instance-orient.js";
import { hideDefPinLabels, assembleEditDefs } from "../src/defs-assembler.js";
import { SVGNS } from "../src/svg-constants.js";

function svgEl(tag, attrs = {}) {
  const el = document.createElementNS(SVGNS, tag);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, String(v));
  return el;
}

function makeDefWithPin(pin, lx, ly, anchor = "start") {
  const def = svgEl("g", { id: "SB" });
  const conn = svgEl("g", { "data-role": "conn", "data-pin": pin });
  const label = svgEl("text", {
    x: lx,
    y: ly,
    "data-part": "label",
    class: "pin",
    "text-anchor": anchor,
  });
  label.textContent = pin;
  conn.appendChild(label);
  def.appendChild(conn);
  return def;
}

describe("instance-pin-labels", () => {
  it("use@90 + flipH → sheet pin @0 bez scale, pozycja z mapLocalToSheet", () => {
    const sheet = svgEl("g", { id: "sheet1" });
    const def = makeDefWithPin("3", 10, 4, "start");
    const use = svgEl("use", { "data-ref": "SB3", "data-sym": "SB", x: "100", y: "50" });
    writeUseOrient(use, { ang: 90, flipH: false, flipV: false }, 100, 50);
    sheet.appendChild(use);

    syncInstancePinLabels(sheet, { definitionForUse: () => def });
    let pin = [...sheet.children].find((el) => el.getAttribute("data-label") === "pin");
    expect(pin).toBeTruthy();
    expect(pin.getAttribute("data-ang")).toBe("0");
    expect(pin.getAttribute("transform")).toContain("rotate(0");
    expect(pin.getAttribute("transform")).not.toMatch(/scale\(/);
    expect(pin.textContent).toBe("3");

    const afterFlip = composeSheetFlip(readUseOrient(use), "h");
    writeUseOrient(use, afterFlip, 100, 50);
    syncInstancePinLabels(sheet, { definitionForUse: () => def });
    pin = [...sheet.children].find((el) => el.getAttribute("data-label") === "pin");
    expect(pin.getAttribute("data-flip-h")).toBe(null);
    expect(pin.getAttribute("data-ang")).toBe("0");
    expect(use.getAttribute("data-flip-h")).toBe("1");
    expect(use.getAttribute("transform")).toMatch(/scale\(-1/);

    const [ex, ey] = mapLocalToSheet(100, 50, readUseOrient(use), 10, 4);
    expect(parseFloat(pin.getAttribute("x"))).toBeCloseTo(ex, 5);
    expect(parseFloat(pin.getAttribute("y"))).toBeCloseTo(ey, 5);
    expect(pin.getAttribute("text-anchor")).toBe("end");
  });

  it("pomija pin gdy na arkuszu jest już sheet conn", () => {
    const sheet = svgEl("g");
    const def = makeDefWithPin("1", 5, 5);
    const use = svgEl("use", { "data-ref": "K1", x: "0", y: "0" });
    writeUseOrient(use, { ang: 0, flipH: false, flipV: false }, 0, 0);
    const conn = svgEl("g", { "data-role": "conn", "data-ref": "K1", "data-pin": "1" });
    sheet.append(use, conn);
    const n = syncInstancePinLabels(sheet, { definitionForUse: () => def });
    expect(n).toBe(0);
    expect([...sheet.children].filter((el) => el.getAttribute("data-label") === "pin").length).toBe(0);
  });

  it("hideDefPinLabels ustawia display=none na labelach w klonie", () => {
    const clone = makeDefWithPin("2", 1, 2);
    hideDefPinLabels(clone);
    expect(clone.querySelector('[data-part="label"]').getAttribute("display")).toBe("none");
  });

  it("assembleEditDefs z hidePinLabels ukrywa label w defs", () => {
    const libSvg = document.createElementNS(SVGNS, "svg");
    const defs = document.createElementNS(SVGNS, "defs");
    const sym = makeDefWithPin("4", 0, 0);
    sym.id = "BTN";
    defs.appendChild(sym);
    libSvg.appendChild(defs);

    const sheetNode = svgEl("g");
    const use = svgEl("use", { href: "#BTN", "data-sym": "BTN" });
    sheetNode.appendChild(use);

    const editDefs = document.createElementNS(SVGNS, "defs");
    assembleEditDefs(editDefs, {
      libSvg,
      sheetSvg: null,
      sheetNode,
      xlinkNs: "http://www.w3.org/1999/xlink",
      libraryPreview: false,
      hidePinLabels: true,
    });
    const cloned = editDefs.querySelector("#BTN");
    expect(cloned).toBeTruthy();
    expect(cloned.querySelector('[data-part="label"]').getAttribute("display")).toBe("none");
  });

  it("mapSheetToLocal jest odwrotnością mapLocalToSheet", () => {
    const orient = { ang: 90, flipH: true, flipV: false };
    const [sx, sy] = mapLocalToSheet(40, 20, orient, 8, -3);
    const [lx, ly] = mapSheetToLocal(40, 20, orient, sx, sy);
    expect(lx).toBeCloseTo(8, 5);
    expect(ly).toBeCloseTo(-3, 5);
  });

  it("ręczny pin: sync nie wraca do defs; jedzie z use", () => {
    const sheet = svgEl("g");
    const def = makeDefWithPin("2", 10, 0);
    const use = svgEl("use", { "data-ref": "SB1", x: "100", y: "50" });
    writeUseOrient(use, { ang: 0, flipH: false, flipV: false }, 100, 50);
    sheet.appendChild(use);
    syncInstancePinLabels(sheet, { definitionForUse: () => def });
    const pin = [...sheet.children].find((el) => el.getAttribute("data-label") === "pin");
    // Przesuń ręcznie poza domyślną pozycję defs (100+10, 50)
    pin.setAttribute("x", "130");
    pin.setAttribute("y", "40");
    markSheetPinLabelManual(pin, use);
    expect(pin.getAttribute("data-label-manual")).toBe("1");
    expect(parseFloat(pin.getAttribute("data-local-x"))).toBeCloseTo(30, 5);
    expect(parseFloat(pin.getAttribute("data-local-y"))).toBeCloseTo(-10, 5);

    // Symulacja render po ruchu innego symbolu — sync nie resetuje do defs
    syncInstancePinLabels(sheet, { definitionForUse: () => def });
    expect(parseFloat(pin.getAttribute("x"))).toBeCloseTo(130, 5);
    expect(parseFloat(pin.getAttribute("y"))).toBeCloseTo(40, 5);

    // Przesuń use — pin jedzie z lokalnym offsetem
    use.setAttribute("x", "200");
    use.setAttribute("y", "80");
    writeUseOrient(use, readUseOrient(use), 200, 80);
    syncInstancePinLabels(sheet, { definitionForUse: () => def });
    const [ex, ey] = mapLocalToSheet(200, 80, readUseOrient(use), 30, -10);
    expect(parseFloat(pin.getAttribute("x"))).toBeCloseTo(ex, 5);
    expect(parseFloat(pin.getAttribute("y"))).toBeCloseTo(ey, 5);
    expect(ex).toBeCloseTo(230, 5);
    expect(ey).toBeCloseTo(70, 5);
  });
});
