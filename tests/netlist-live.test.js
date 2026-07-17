import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createNetlistLiveValidator } from "../src/netlist-ui.js";

describe("createNetlistLiveValidator", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("debounce’uje odświeżanie", () => {
    const refreshNetlistUI = vi.fn();
    const { scheduleRefresh } = createNetlistLiveValidator({ refreshNetlistUI, debounceMs: 180 });
    scheduleRefresh();
    scheduleRefresh();
    scheduleRefresh();
    expect(refreshNetlistUI).not.toHaveBeenCalled();
    vi.advanceTimersByTime(179);
    expect(refreshNetlistUI).not.toHaveBeenCalled();
    vi.advanceTimersByTime(2);
    expect(refreshNetlistUI).toHaveBeenCalledTimes(1);
  });
});
