import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, cleanup } from "@testing-library/react";
import { useWorkspaceKeybindings } from "./useWorkspaceKeybindings";
import { useWorkspaceStore } from "@/store/useWorkspaceStore";
import { useTypingStore } from "@/store/useTypingStore";

describe("useWorkspaceKeybindings", () => {
  let onTransition: any;

  beforeEach(() => {
    onTransition = vi.fn();
    useWorkspaceStore.setState({
      uiState: "practice",
      diagnosticMode: "surface",
      focusedKey: null,
    });
    useTypingStore.setState({ status: "idle", targetText: "hello" });
    vi.spyOn(useTypingStore.getState(), "handlePhysicalKeyPress").mockImplementation(() => {});
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
    vi.restoreAllMocks();
  });

  const fireKey = (code: string, key: string, shiftKey = false) => {
    window.dispatchEvent(new KeyboardEvent("keydown", { code, key, shiftKey }));
  };

  it("should trigger transition on Tab during practice", () => {
    renderHook(() => useWorkspaceKeybindings({ onTransition }));
    fireKey("Tab", "Tab");
    expect(onTransition).toHaveBeenCalledTimes(1);
  });

  it("should transition from diagnostics to practice on Tab", () => {
    useWorkspaceStore.setState({ uiState: "diagnostics" });
    renderHook(() => useWorkspaceKeybindings({ onTransition }));

    fireKey("Tab", "Tab");
    expect(onTransition).not.toHaveBeenCalled();
    expect(useWorkspaceStore.getState().uiState).toBe("practice");
  });

  it("should pass key to typing store during practice", () => {
    renderHook(() => useWorkspaceKeybindings({ onTransition }));
    const handlePhysicalKeyPress = vi.spyOn(useTypingStore.getState(), "handlePhysicalKeyPress");

    fireKey("KeyA", "a");
    expect(handlePhysicalKeyPress).toHaveBeenCalledWith("KeyA", false, expect.any(Number));
  });

  it("should ignore shortcuts in practice mode", () => {
    renderHook(() => useWorkspaceKeybindings({ onTransition }));
    const handlePhysicalKeyPress = vi.spyOn(useTypingStore.getState(), "handlePhysicalKeyPress");

    window.dispatchEvent(new KeyboardEvent("keydown", { code: "KeyC", key: "c", ctrlKey: true }));
    expect(handlePhysicalKeyPress).not.toHaveBeenCalled();
  });

  it("should allow repeated Backspace but not other keys in practice mode", () => {
    renderHook(() => useWorkspaceKeybindings({ onTransition }));
    const handlePhysicalKeyPress = vi.spyOn(useTypingStore.getState(), "handlePhysicalKeyPress");

    window.dispatchEvent(
      new KeyboardEvent("keydown", { code: "Backspace", key: "Backspace", repeat: true }),
    );
    expect(handlePhysicalKeyPress).toHaveBeenCalledWith("Backspace", false, expect.any(Number));

    handlePhysicalKeyPress.mockClear();

    window.dispatchEvent(new KeyboardEvent("keydown", { code: "KeyA", key: "a", repeat: true }));
    expect(handlePhysicalKeyPress).not.toHaveBeenCalled();
  });

  it("should change diagnostics mode when in diagnostics uiState", () => {
    useWorkspaceStore.setState({ uiState: "diagnostics" });
    renderHook(() => useWorkspaceKeybindings({ onTransition }));

    fireKey("Space", " ");
    expect(useWorkspaceStore.getState().diagnosticMode).toBe("space");

    fireKey("ShiftLeft", "Shift");
    expect(useWorkspaceStore.getState().diagnosticMode).toBe("shift");

    fireKey("Backspace", "Backspace");
    expect(useWorkspaceStore.getState().diagnosticMode).toBe("backspace");

    fireKey("KeyK", "k");
    expect(useWorkspaceStore.getState().diagnosticMode).toBe("cylindrical");
    expect(useWorkspaceStore.getState().focusedKey).toBe("k");

    fireKey("Escape", "Escape");
    expect(useWorkspaceStore.getState().diagnosticMode).toBe("surface");
    expect(useWorkspaceStore.getState().focusedKey).toBeNull();
  });
});
