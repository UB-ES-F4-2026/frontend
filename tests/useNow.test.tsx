import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useNow } from "../src/hooks/useNow";

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-11-19T12:00:00Z"));
  Object.defineProperty(document, "hidden", { configurable: true, value: false });
});

afterEach(() => vi.useRealTimers());

describe("useNow", () => {
  it("actualitza el rellotge segons l'interval indicat", () => {
    const { result } = renderHook(() => useNow(1_000));

    act(() => vi.advanceTimersByTime(1_000));

    expect(result.current).toBe(Date.now());
  });

  it("actualitza el rellotge en tornar a fer visible la pestanya", () => {
    const { result } = renderHook(() => useNow());
    act(() => vi.advanceTimersByTime(10_000));
    Object.defineProperty(document, "hidden", { configurable: true, value: false });

    act(() => document.dispatchEvent(new Event("visibilitychange")));

    expect(result.current).toBe(Date.now());
  });
});
