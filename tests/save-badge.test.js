import { describe, it, expect } from "vitest";
import { resolveSaveBadgeState } from "../src/save-badge.js";

describe("resolveSaveBadgeState", () => {
  it("priorytet: brak uprawnień gdy jest folder", () => {
    const s = resolveSaveBadgeState({ dirtyN: 2, needPerm: true, hasDir: true });
    expect(s.kind).toBe("perm");
    expect(s.actionable).toBe(true);
  });

  it("pokazuje dirty gdy są niezapisane arkusze", () => {
    const s = resolveSaveBadgeState({ dirtyN: 3, needPerm: false, hasDir: true });
    expect(s.kind).toBe("dirty");
    expect(s.label).toContain("3");
  });

  it("ok gdy projekt czysty", () => {
    const s = resolveSaveBadgeState({ dirtyN: 0, needPerm: false, hasDir: true });
    expect(s.kind).toBe("ok");
  });

  it("idle bez projektu", () => {
    const s = resolveSaveBadgeState({ dirtyN: 0, needPerm: false, hasDir: false });
    expect(s.kind).toBe("idle");
  });
});
