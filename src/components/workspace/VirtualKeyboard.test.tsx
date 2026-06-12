import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { describe, it, expect, vi, afterEach } from "vitest";
import { VirtualKeyboard } from "./VirtualKeyboard";

describe("VirtualKeyboard", () => {
  afterEach(() => {
    cleanup();
  });

  it("should render keyboard in practice mode without crashing", () => {
    render(
      <VirtualKeyboard
        mode="practice"
        uiState="practice"
        targetKeys={new Set()}
        diagnosticMode="surface"
        keyStats={{}}
        focusedKey={null}
        onKeyClick={() => {}}
        keyDelays={{}}
      />
    );
    
    // Check if the Space key is rendered
    const spaceKeys = screen.getAllByTestId("keycap-space");
    expect(spaceKeys.length).toBeGreaterThan(0);
    
    // In practice mode, there should be no heatmap class globally applied (if that logic exists)
    // We just verify it mounted safely.
  });

  it("should render in diagnostics mode and not call onKeyClick on virtual key click since mouse click is disabled", () => {
    const handleKeyClick = vi.fn();

    render(
      <VirtualKeyboard
        mode="diagnostics"
        uiState="diagnostics"
        targetKeys={new Set()}
        diagnosticMode="surface"
        keyStats={{}}
        focusedKey={null}
        onKeyClick={handleKeyClick}
        keyDelays={{}}
      />
    );

    const qKeys = screen.getAllByTestId("keycap-q");
    expect(qKeys.length).toBeGreaterThan(0);

    fireEvent.click(qKeys[0]);

    expect(handleKeyClick).not.toHaveBeenCalled();
  });
});
