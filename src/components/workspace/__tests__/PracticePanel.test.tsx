import { render, cleanup } from "@testing-library/react";
import { describe, it, expect, afterEach, beforeEach } from "vitest";
import React from "react";
import { PracticePanel } from "../PracticePanel";
import { useTypingStore } from "@/store/useTypingStore";

describe("PracticePanel", () => {
  afterEach(() => {
    cleanup();
  });

  beforeEach(() => {
    useTypingStore.setState({
      targetText: "",
      typedText: "",
      qwertyBuffer: "",
      status: "idle",
    });
  });

  it("should render cursor at the beginning when no characters are typed", () => {
    useTypingStore.setState({
      targetText: "가나다",
      typedText: "",
    });

    const { container } = render(<PracticePanel />);
    
    const char0 = container.querySelector("#text-char-0");
    expect(char0).toBeTruthy();
    
    const cursor = char0?.querySelector(".typing-cursor");
    expect(cursor).toBeTruthy();
    expect(cursor?.className).toContain("left");
  });

  it("should render composing character as correct/neutral and place cursor on the right", () => {
    useTypingStore.setState({
      targetText: "가나다",
      typedText: "ㄱ",
    });

    const { container } = render(<PracticePanel />);
    
    const char0 = container.querySelector("#text-char-0");
    const typedSpan = char0?.querySelector(".text-char-primary");
    expect(typedSpan).toBeTruthy();
    expect(typedSpan?.textContent).toBe("ㄱ");

    const cursor = char0?.querySelector(".typing-cursor");
    expect(cursor).toBeTruthy();
    expect(cursor?.className).toContain("right");
  });

  it("should render wrong characters as error", () => {
    useTypingStore.setState({
      targetText: "가나다",
      typedText: "ㄴ",
    });

    const { container } = render(<PracticePanel />);
    
    const char0 = container.querySelector("#text-char-0");
    const errorSpan = char0?.querySelector(".text-char-error");
    expect(errorSpan).toBeTruthy();
    expect(errorSpan?.textContent).toBe("ㄴ");

    const cursor = char0?.querySelector(".typing-cursor");
    expect(cursor).toBeNull();

    const char1 = container.querySelector("#text-char-1");
    const nextCursor = char1?.querySelector(".typing-cursor");
    expect(nextCursor).toBeTruthy();
    expect(nextCursor?.className).toContain("left");
  });

  it("should carry over extra batchim to the next character as composing if it is a valid prefix of the next character", () => {
    useTypingStore.setState({
      targetText: "가나다",
      typedText: "간",
    });

    const { container } = render(<PracticePanel />);
    
    const char0 = container.querySelector("#text-char-0");
    const typedSpan0 = char0?.querySelector(".text-char-primary");
    expect(typedSpan0).toBeTruthy();
    expect(typedSpan0?.textContent).toBe("가");

    const char1 = container.querySelector("#text-char-1");
    const typedSpan1 = char1?.querySelector(".text-char-primary");
    expect(typedSpan1).toBeTruthy();
    expect(typedSpan1?.textContent).toBe("ㄴ");

    const cursor = char1?.querySelector(".typing-cursor");
    expect(cursor).toBeTruthy();
    expect(cursor?.className).toContain("right");
  });
});
