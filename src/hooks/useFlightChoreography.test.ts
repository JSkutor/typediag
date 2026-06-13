import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useFlightChoreography } from "./useFlightChoreography";
import { useWorkspaceStore } from "@/store/useWorkspaceStore";
import { useTypingStore } from "@/store/useTypingStore";
import * as flightCalculations from "@/components/workspace/flightCalculations";

describe("useFlightChoreography", () => {
  beforeEach(() => {
    useWorkspaceStore.setState({ uiState: "practice", dynamicScale: 1 });
    useTypingStore.setState({ targetText: "abc" });

    // Mock DOM elements
    vi.spyOn(document, "querySelector").mockImplementation((selector) => {
      if (selector === ".kbd-wrap") {
        return {
          getBoundingClientRect: () => ({ left: 10, top: 10, width: 500, height: 300 }),
        } as Element;
      }
      return null;
    });

    vi.spyOn(document, "querySelectorAll").mockImplementation((selector) => {
      if (selector === ".keycap-base") {
        const keys = ["a", "b", "c"];
        return keys.map((key, i) => ({
          id: `keycap-${key}`,
          getBoundingClientRect: () => ({ left: 20 + i * 50, top: 20, width: 40, height: 40 }),
        })) as unknown as NodeListOf<Element>;
      }
      return [] as unknown as NodeListOf<Element>;
    });

    vi.spyOn(document, "getElementById").mockImplementation((id) => {
      if (id.startsWith("text-char-")) {
        const i = parseInt(id.replace("text-char-", ""), 10);
        return {
          getBoundingClientRect: () => ({ left: 100 + i * 20, top: 100, width: 15, height: 20 }),
        } as HTMLElement;
      }
      return null;
    });

    vi.spyOn(flightCalculations, "calculateFlights").mockReturnValue({
      flights: [{ id: "1" } as any],
      targetKeys: new Set(["a", "b", "c"]),
      keyDelays: { a: 10, b: 20, c: 30 },
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should calculate flights on precalculateFlights call", () => {
    const { result } = renderHook(() => useFlightChoreography());

    act(() => {
      result.current.precalculateFlights();
    });

    expect(result.current.flights.length).toBeGreaterThan(0);
    expect(result.current.targetKeys.has("a")).toBe(true);
    expect(result.current.keyDelays).toEqual({ a: 10, b: 20, c: 30 });
    // check if keycapRects are populated
    expect(result.current.keycapRects["a"]).toBeDefined();
    expect(result.current.keycapRects["b"]).toBeDefined();
  });
});
