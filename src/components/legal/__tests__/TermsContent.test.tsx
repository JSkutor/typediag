import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import React from "react";
import { TermsContent } from "../TermsContent";

vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    ...props
  }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

describe("TermsContent", () => {
  afterEach(() => {
    cleanup();
  });

  it("links to the localized privacy page from Korean terms", () => {
    render(<TermsContent lang="ko" />);
    const link = screen.getByRole("link", { name: "개인정보처리방침" });
    expect(link).toHaveAttribute("href", "/ko/privacy");
  });

  it("links to the localized privacy page from English terms", () => {
    render(<TermsContent lang="en" />);
    const link = screen.getByRole("link", { name: "Privacy Policy" });
    expect(link).toHaveAttribute("href", "/en/privacy");
  });

  it("renders all Korean section headings", () => {
    render(<TermsContent lang="ko" />);
    expect(screen.getByRole("heading", { name: "1. 목적" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "16. 분쟁해결 및 재판관할" })).toBeTruthy();
  });
});
