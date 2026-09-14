import { describe, it, expect, vi } from "vitest";
import { lookupPublicGuidance } from "../api/lookup-public-guidance.js";

describe("lookupPublicGuidance", () => {
  it("odrzuca puste zapytanie", async () => {
    const r = await lookupPublicGuidance("  ");
    expect(r.ok).toBe(false);
  });

  it("składa źródła z Wikipedii i DuckDuckGo", async () => {
    const fetchImpl = vi.fn(async (url) => {
      const u = String(url);
      if (u.includes("api.php")) {
        return {
          ok: true,
          json: async () => ({ query: { search: [{ title: "IEC 60617", snippet: "graphical symbols" }] } }),
        };
      }
      if (u.includes("page/summary")) {
        return {
          ok: true,
          json: async () => ({
            extract: "IEC 60617 is a standard for graphical symbols.",
            content_urls: { desktop: { page: "https://en.wikipedia.org/wiki/IEC_60617" } },
          }),
        };
      }
      return {
        ok: true,
        json: async () => ({
          Heading: "IEC 60617",
          AbstractText: "Public abstract.",
          AbstractURL: "https://example.org/iec60617",
          RelatedTopics: [],
        }),
      };
    });
    const r = await lookupPublicGuidance("IEC 60617", { fetchImpl });
    expect(r.ok).toBe(true);
    expect(r.sources.some((s) => s.url.includes("wikipedia"))).toBe(true);
    expect(r.sources.some((s) => s.url === "https://example.org/iec60617")).toBe(true);
  });
});
