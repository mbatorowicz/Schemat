import { describe, it, expect, vi } from "vitest";
import { askRouteChoice } from "../src/ui-dialog.js";

describe("askRouteChoice", () => {
  it("mapuje etykiety trasowania na choice dialog", async () => {
    const ask = vi.fn(async () => "local");
    const r = await askRouteChoice(ask, "msg", { localLabel: "Zastąp", libraryLabel: "Zachowaj" });
    expect(r).toBe("local");
    expect(ask).toHaveBeenCalledWith(
      "msg",
      expect.objectContaining({
        title: "Trasowanie",
        localLabel: "Zastąp",
        libraryLabel: "Zachowaj",
      })
    );
  });
});
