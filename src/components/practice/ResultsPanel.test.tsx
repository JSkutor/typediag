import { render, screen, cleanup } from "@testing-library/react";
import { describe, it, expect, afterEach } from "vitest";
import { ResultsPanel } from "./ResultsPanel";
import type { KeyEvent } from "@/lib/skdm";

describe("ResultsPanel", () => {
  afterEach(() => {
    cleanup();
  });

  it("should return null when events array is empty", () => {
    const { container } = render(<ResultsPanel events={[]} />);
    expect(container.firstChild).toBeNull();
  });

  it("should render analysis results when events are provided", () => {
    const events: KeyEvent[] = [
      { fromKey: "t", toKey: "h", latencyMs: 150 },
      { fromKey: "h", toKey: "e", latencyMs: 120 },
    ];

    render(<ResultsPanel events={events} />);

    // Verify header and meta info
    expect(screen.getByText("실시간 SKDM 분석")).toBeDefined();
    expect(screen.getByText(/전이 2 · 관측된 키/)).toBeDefined();

    // Verify keycaps are rendered (e.g. 'h' or 'e')
    // We expect some keycaps for characters to be present in the document.
    const hKeycap = screen.getByText("h");
    expect(hKeycap).toBeDefined();
  });
});
