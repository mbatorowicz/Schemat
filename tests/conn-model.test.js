import { describe, it, expect, vi } from "vitest";
import { createConnModel } from "../src/conn-model.js";

function stubCtx() {
  const state = { snap: false, step: 5 };
  return {
    state,
    num: (el, attr, def = 0) => {
      const v = el?.getAttribute?.(attr);
      return v === null || v === "" ? def : parseFloat(v);
    },
    fmt: (v) => String(Math.round(v * 100) / 100),
    mkEl: (tag, attrs) => {
      const el = { tagName: tag, attrs: {}, children: [], style: {}, classList: { contains: () => false } };
      el.setAttribute = (k, v) => {
        el.attrs[k] = v;
      };
      el.getAttribute = (k) => el.attrs[k] ?? null;
      el.appendChild = (c) => el.children.push(c);
      el.querySelector = () => null;
      el.querySelectorAll = () => [];
      if (attrs) Object.entries(attrs).forEach(([k, v]) => el.setAttribute(k, v));
      return el;
    },
    setPositionedElement: () => {},
    styleText: () => {},
    isSchematicSheet: (node) => /^sch-/.test(node?.id || node?.attrs?.id || ""),
    askConnMeta: null,
  };
}

describe("conn-model", () => {
  it("isConnPoint rozpoznaje punkt", () => {
    const m = createConnModel(stubCtx());
    const g = stubCtx().mkEl("g", { "data-role": "conn", "data-kind": "point" });
    expect(m.isConnPoint(g)).toBe(true);
    expect(m.isConnLead(g)).toBe(false);
  });

  it("connKind zwraca point lub lead", () => {
    const m = createConnModel(stubCtx());
    const point = stubCtx().mkEl("g", { "data-role": "conn", "data-kind": "point" });
    const lead = stubCtx().mkEl("g", { "data-role": "conn", "data-kind": "lead" });
    expect(m.connKind(point)).toBe("point");
    expect(m.connKind(lead)).toBe("lead");
  });

  it("bez askConnMeta nie woła prompt i zwraca null", async () => {
    const promptSpy = vi.fn();
    vi.stubGlobal("prompt", promptSpy);
    const m = createConnModel(stubCtx());
    expect(await m.promptConnMeta({ id: "sch-1" })).toBe(null);
    expect(promptSpy).not.toHaveBeenCalled();
    vi.unstubAllGlobals();
  });

  it("z mockiem askConnMeta zwraca { ref, pin }", async () => {
    const ctx = stubCtx();
    ctx.askConnMeta = vi.fn(async () => ({ ref: "X1", pin: "2" }));
    const m = createConnModel(ctx);
    await expect(m.promptConnMeta({ id: "sch-1" })).resolves.toEqual({ ref: "X1", pin: "2" });
    expect(ctx.askConnMeta).toHaveBeenCalled();
  });
});
