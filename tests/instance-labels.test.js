// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import {
  syncInstanceLabelAngles,
  syncAllInstanceLabelAngles,
  instanceRefsFromElements,
  isInstanceOwnedText,
} from "../src/instance-labels.js";

describe("instance-labels", () => {
  it("syncInstanceLabelAngles: use@90 → opisy zawsze czytelne @0", () => {
    const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
    const use = document.createElementNS("http://www.w3.org/2000/svg", "use");
    use.setAttribute("data-ref", "SB4");
    use.setAttribute("data-ang", "90");
    use.setAttribute("x", "100");
    use.setAttribute("y", "50");
    const desig = document.createElementNS("http://www.w3.org/2000/svg", "text");
    desig.setAttribute("data-owner-ref", "SB4");
    desig.setAttribute("data-label", "desig");
    desig.setAttribute("x", "105");
    desig.setAttribute("y", "45");
    desig.setAttribute("data-ang", "90");
    desig.setAttribute("transform", "rotate(90 105 45)");
    const conn = document.createElementNS("http://www.w3.org/2000/svg", "g");
    conn.setAttribute("data-role", "conn");
    conn.setAttribute("data-ref", "SB4");
    const pin = document.createElementNS("http://www.w3.org/2000/svg", "text");
    pin.setAttribute("data-part", "label");
    pin.setAttribute("data-rotate-with", "1");
    pin.setAttribute("x", "80");
    pin.setAttribute("y", "50");
    pin.setAttribute("data-ang", "90");
    pin.setAttribute("transform", "rotate(90 80 50)");
    pin.textContent = "2";
    conn.appendChild(pin);
    g.append(use, desig, conn);

    const n = syncInstanceLabelAngles(g, "SB4");
    expect(n).toBe(2);
    expect(use.getAttribute("data-ang")).toBe("90");
    expect(desig.getAttribute("data-ang")).toBe("0");
    expect(pin.getAttribute("data-ang")).toBe("0");
    expect(desig.getAttribute("transform")).toBe("rotate(0 105 45)");
    expect(pin.getAttribute("transform")).toBe("rotate(0 80 50)");
    expect(desig.getAttribute("transform")).not.toContain("90");
  });

  it("sync po obrocie use: napisy zostają @0", () => {
    const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
    const use = document.createElementNS("http://www.w3.org/2000/svg", "use");
    use.setAttribute("data-ref", "SB3");
    use.setAttribute("data-ang", "90");
    const desig = document.createElementNS("http://www.w3.org/2000/svg", "text");
    desig.setAttribute("data-owner-ref", "SB3");
    desig.setAttribute("x", "10");
    desig.setAttribute("y", "10");
    desig.setAttribute("data-ang", "45");
    const pin = document.createElementNS("http://www.w3.org/2000/svg", "text");
    pin.setAttribute("data-part", "label");
    pin.setAttribute("data-rotate-with", "1");
    pin.setAttribute("x", "20");
    pin.setAttribute("y", "20");
    pin.setAttribute("data-ang", "90");
    const conn = document.createElementNS("http://www.w3.org/2000/svg", "g");
    conn.setAttribute("data-role", "conn");
    conn.setAttribute("data-ref", "SB3");
    conn.appendChild(pin);
    g.append(use, desig, conn);

    syncInstanceLabelAngles(g, "SB3");
    expect(desig.getAttribute("data-ang")).toBe("0");
    expect(pin.getAttribute("data-ang")).toBe("0");
    expect(desig.getAttribute("transform")).toContain("rotate(0");
    expect(pin.getAttribute("transform")).toContain("rotate(0");
  });

  it("data-rotate-with=0 pomija etykietę", () => {
    const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
    const use = document.createElementNS("http://www.w3.org/2000/svg", "use");
    use.setAttribute("data-ref", "K1");
    use.setAttribute("data-ang", "90");
    const t = document.createElementNS("http://www.w3.org/2000/svg", "text");
    t.setAttribute("data-owner-ref", "K1");
    t.setAttribute("data-rotate-with", "0");
    t.setAttribute("data-ang", "15");
    t.setAttribute("x", "1");
    t.setAttribute("y", "2");
    g.append(use, t);
    syncInstanceLabelAngles(g, "K1");
    expect(t.getAttribute("data-ang")).toBe("15");
  });

  it("syncAllInstanceLabelAngles + isInstanceOwnedText", () => {
    const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
    const u1 = document.createElementNS("http://www.w3.org/2000/svg", "use");
    u1.setAttribute("data-ref", "A");
    u1.setAttribute("data-ang", "90");
    const u2 = document.createElementNS("http://www.w3.org/2000/svg", "use");
    u2.setAttribute("data-ref", "B");
    u2.setAttribute("data-ang", "180");
    const t1 = document.createElementNS("http://www.w3.org/2000/svg", "text");
    t1.setAttribute("data-owner-ref", "A");
    t1.setAttribute("x", "0");
    t1.setAttribute("y", "0");
    t1.setAttribute("data-ang", "45");
    const t2 = document.createElementNS("http://www.w3.org/2000/svg", "text");
    t2.setAttribute("data-owner-ref", "B");
    t2.setAttribute("x", "0");
    t2.setAttribute("y", "0");
    t2.setAttribute("data-ang", "10");
    g.append(u1, u2, t1, t2);
    expect(syncAllInstanceLabelAngles(g)).toBe(2);
    expect(t1.getAttribute("data-ang")).toBe("0");
    expect(t2.getAttribute("data-ang")).toBe("0");
    expect(isInstanceOwnedText(t1)).toBe(true);
    expect(isInstanceOwnedText(u1)).toBe(false);
    expect(instanceRefsFromElements([u1, t2])).toEqual(expect.arrayContaining(["A", "B"]));
  });
});
