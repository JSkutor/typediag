import { render, screen, cleanup } from "@testing-library/react";
import { describe, it, expect, afterEach, beforeEach } from "vitest";
import { ResultsPanel } from "./ResultsPanel";
import { useWorkspaceStore } from "@/store/useWorkspaceStore";
import type { KeyResult } from "@/lib/skdm";

describe("ResultsPanel", () => {
  beforeEach(() => {
    useWorkspaceStore.setState({
      keyStats: {},
      analysisEvents: [],
    });
  });

  afterEach(() => {
    cleanup();
  });

  it("should return null when analysisEvents is empty", () => {
    const { container } = render(<ResultsPanel />);
    expect(container.firstChild).toBeNull();
  });

  it("should render pre-computed analysis results from workspace store", () => {
    const keyStats: Record<string, KeyResult> = {
      h: {
        key: "h",
        row: 1,
        x: 0,
        y: 0,
        z: 0.6,
        zSmoothed: 0.6,
        stdev: 0,
        stdevSmoothed: 0,
        confidence: 2,
      },
      e: {
        key: "e",
        row: 1,
        x: 1,
        y: 0,
        z: 0.4,
        zSmoothed: 0.4,
        stdev: 0,
        stdevSmoothed: 0,
        confidence: 1,
      },
    };

    useWorkspaceStore.setState({
      keyStats,
      analysisEvents: [
        { fromKey: "t", toKey: "h", latencyMs: 150, keyChar: "h" },
        { fromKey: "h", toKey: "e", latencyMs: 120, keyChar: "e" },
      ],
    });

    render(<ResultsPanel />);

    expect(screen.getByText("SKDM 분석")).toBeDefined();
    expect(screen.getByText(/전이 2 · 관측된 키/)).toBeDefined();
    expect(screen.getByText("h")).toBeDefined();
  });
});
