import { describe, it, expect } from "vitest";
import { parseSseChunk } from "../src/assistant-client.js";

describe("assistant-client SSE", () => {
  it("parsuje zdarzenia i zostawia ogon", () => {
    const { events, rest } = parseSseChunk('data: {"type":"text","delta":"A"}\n\ndata: {"type":"propo');
    expect(events).toEqual([{ type: "text", delta: "A" }]);
    expect(rest).toContain("propo");
  });

  it("pomija uszkodzony JSON", () => {
    const { events } = parseSseChunk('data: {nope}\n\ndata: {"type":"done"}\n\n');
    expect(events).toEqual([{ type: "done" }]);
  });
});
