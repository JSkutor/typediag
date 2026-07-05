import { render, cleanup } from "@testing-library/react";
import { describe, it, expect, afterEach, beforeEach, vi } from "vitest";
import React from "react";
import { PageMetricsFlash } from "../PageMetricsFlash";
import { useTypingStore } from "@/store/useTypingStore";

describe("PageMetricsFlash", () => {
  afterEach(() => {
    cleanup();
    document.body.innerHTML = "";
    vi.useRealTimers();
  });

  beforeEach(() => {
    useTypingStore.setState({
      status: "idle",
      pageMetricsFlash: null,
      targetLanguage: "ko",
      alignments: [],
    });
  });

  it("renders nothing when pageMetricsFlash is null", () => {
    const flashHost = document.createElement("div");
    document.body.appendChild(flashHost);

    const { container } = render(<PageMetricsFlash />, { container: flashHost });
    expect(container.querySelector(".page-metrics-flash")).toBeNull();

    flashHost.remove();
  });

  it("renders only CPM text when pageMetricsFlash is populated", () => {
    const flashHost = document.createElement("div");
    document.body.appendChild(flashHost);

    useTypingStore.setState({
      status: "done",
      pageMetricsFlash: { cpm: 420, wpm: 84, accuracy: 98 },
      targetLanguage: "ko",
    });

    const { container } = render(<PageMetricsFlash />, { container: flashHost });
    const flash = container.querySelector(".page-metrics-flash") as HTMLElement | null;

    expect(flash).not.toBeNull();
    expect(flash?.querySelector(".page-metrics-flash__label")?.textContent).toBe("420 CPM");
    expect(flash?.querySelector(".page-metrics-flash__wpm")).toBeNull();
    expect(flash?.classList.contains("page-metrics-flash--perfect")).toBe(false);

    flashHost.remove();
  });

  it("renders perfect class when accuracy is 100", () => {
    const flashHost = document.createElement("div");
    document.body.appendChild(flashHost);

    useTypingStore.setState({
      status: "done",
      pageMetricsFlash: { cpm: 480, wpm: 96, accuracy: 100 },
      targetLanguage: "ko",
    });

    const { container } = render(<PageMetricsFlash />, { container: flashHost });
    const flash = container.querySelector(".page-metrics-flash") as HTMLElement | null;

    expect(flash).not.toBeNull();
    expect(flash?.querySelector(".page-metrics-flash__label")?.textContent).toBe("480 CPM");
    expect(flash?.classList.contains("page-metrics-flash--perfect")).toBe(true);

    flashHost.remove();
  });

  it("dismisses flash after duration", () => {
    vi.useFakeTimers();
    const flashHost = document.createElement("div");
    document.body.appendChild(flashHost);

    useTypingStore.setState({
      status: "done",
      pageMetricsFlash: { cpm: 300, wpm: 60, accuracy: 95 },
    });

    render(<PageMetricsFlash />, { container: flashHost });
    expect(useTypingStore.getState().pageMetricsFlash).not.toBeNull();

    vi.advanceTimersByTime(2200);
    expect(useTypingStore.getState().pageMetricsFlash).toBeNull();

    flashHost.remove();
  });
});
