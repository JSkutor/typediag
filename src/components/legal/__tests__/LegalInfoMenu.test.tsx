import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import React from "react";
import { LegalInfoMenu } from "@/components/layout/LegalInfoMenu";

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

describe("LegalInfoMenu", () => {
  afterEach(() => {
    cleanup();
  });

  it("opens dropdown with localized legal links", () => {
    render(<LegalInfoMenu lang="ko" />);

    fireEvent.click(screen.getByRole("button", { name: "법적 정보" }));

    expect(screen.getByRole("menuitem", { name: "이용약관" })).toHaveAttribute("href", "/terms");
    expect(screen.getByRole("menuitem", { name: "개인정보 처리방침" })).toHaveAttribute(
      "href",
      "/privacy",
    );
  });

  it("closes dropdown on Escape", () => {
    render(<LegalInfoMenu lang="en" />);

    fireEvent.click(screen.getByRole("button", { name: "Legal information" }));
    expect(screen.getByRole("menuitem", { name: "Terms of Service" })).toBeTruthy();

    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("menuitem", { name: "Terms of Service" })).toBeNull();
  });
});
