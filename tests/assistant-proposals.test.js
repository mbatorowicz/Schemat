import { describe, it, expect } from "vitest";
import { validateProposal, validateProposals } from "../src/assistant-proposals.js";

describe("assistant-proposals", () => {
  it("odrzuca symbol spoza katalogu", () => {
    const r = validateProposal({ type: "insert_symbol", symbolId: "ZZ", ref: "ZZ1" }, { catalogIds: ["WD"] });
    expect(r.ok).toBe(false);
  });

  it("akceptuje insert_symbol z katalogu", () => {
    const r = validateProposal(
      { type: "insert_symbol", symbolId: "WD", ref: "WD2", x: 10, y: 20, summary: "Wstaw WD2" },
      { catalogIds: ["WD"] }
    );
    expect(r.ok).toBe(true);
    expect(r.proposal).toMatchObject({ type: "insert_symbol", symbolId: "WD", ref: "WD2", x: 10, y: 20 });
  });

  it("wymaga from/to dla add_connection", () => {
    expect(validateProposal({ type: "add_connection", from: "A:1" }).ok).toBe(false);
    const r = validateProposal({ type: "add_connection", from: "WD1:L", to: "X1:1", net: "L" });
    expect(r.ok).toBe(true);
    expect(r.proposal.net).toBe("L");
  });

  it("validateProposals oddziela odrzucone", () => {
    const { accepted, rejected } = validateProposals(
      [
        { type: "highlight", refs: ["WD1"] },
        { type: "nope" },
        { type: "set_label", ref: "WD1", text: "opis", role: "desc" },
      ],
      { catalogIds: ["WD"] }
    );
    expect(accepted.map((p) => p.type)).toEqual(["highlight", "set_label"]);
    expect(rejected).toHaveLength(1);
  });
});
