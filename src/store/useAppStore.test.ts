import { describe, it, expect, beforeEach } from "vitest";
import { useAppStore } from "./useAppStore";

describe("useAppStore", () => {
  beforeEach(() => {
    // Reset to default settings before each test
    useAppStore.getState().resetSettings();
  });

  it("should initialize with default settings", () => {
    const state = useAppStore.getState();
    expect(state.settings).toEqual({
      language: "ko",
      layout: "qwerty",
      showLiveHeatmap: true,
    });
  });

  it("should set language correctly", () => {
    const store = useAppStore.getState();
    store.setLanguage("en");
    expect(useAppStore.getState().settings.language).toBe("en");

    useAppStore.getState().setLanguage("ko");
    expect(useAppStore.getState().settings.language).toBe("ko");
  });

  it("should set layout correctly", () => {
    const store = useAppStore.getState();
    store.setLayout("dvorak");
    expect(useAppStore.getState().settings.layout).toBe("dvorak");

    useAppStore.getState().setLayout("qwerty");
    expect(useAppStore.getState().settings.layout).toBe("qwerty");
  });

  it("should toggle live heatmap correctly", () => {
    const store = useAppStore.getState();
    expect(store.settings.showLiveHeatmap).toBe(true);

    store.toggleLiveHeatmap();
    expect(useAppStore.getState().settings.showLiveHeatmap).toBe(false);

    useAppStore.getState().toggleLiveHeatmap();
    expect(useAppStore.getState().settings.showLiveHeatmap).toBe(true);
  });

  it("should reset to default settings", () => {
    const store = useAppStore.getState();
    store.setLanguage("en");
    store.setLayout("dvorak");
    store.toggleLiveHeatmap();

    expect(useAppStore.getState().settings).toEqual({
      language: "en",
      layout: "dvorak",
      showLiveHeatmap: false,
    });

    useAppStore.getState().resetSettings();
    expect(useAppStore.getState().settings).toEqual({
      language: "ko",
      layout: "qwerty",
      showLiveHeatmap: true,
    });
  });
});
