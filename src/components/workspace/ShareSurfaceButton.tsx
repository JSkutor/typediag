"use client";

import React from "react";
import { useWorkspaceStore } from "@/store/useWorkspaceStore";

export function ShareSurfaceButton() {
  const uiState = useWorkspaceStore((state) => state.uiState);
  const diagnosticMode = useWorkspaceStore((state) => state.diagnosticMode);
  const keyStats = useWorkspaceStore((state) => state.keyStats);

  const isVisible =
    uiState === "diagnostics" && diagnosticMode === "surface" && Object.keys(keyStats).length > 0;

  if (!isVisible) return null;

  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        try {
          import("@/utils/cylindricalStats/shareEncoder").then(({ encodeGlobalSurface }) => {
            const dataStr = encodeGlobalSurface(keyStats);
            const url = `${window.location.origin}/share?data=${dataStr}`;
            navigator.clipboard.writeText(url);
            alert("공유 링크가 클립보드에 복사되었습니다!\\n\\n" + url);
          });
        } catch (e) {
          console.error(e);
          alert("공유 링크 복사에 실패했습니다.");
        }
      }}
      style={{
        padding: "8px 14px",
        backgroundColor: "var(--bg-raised, #262930)",
        border: "1px solid var(--border-strong, rgba(140, 166, 181, 0.16))",
        color: "var(--text-primary, #d0deeb)",
        borderRadius: "var(--radius-sm, 8px)",
        cursor: "pointer",
        boxShadow: "var(--shadow-sm, 0 4px 6px rgba(0, 0, 0, 0.1))",
        fontFamily: "var(--font-sans)",
        fontSize: "13px",
        fontWeight: 500,
        display: "flex",
        alignItems: "center",
        gap: "6px",
        height: "32px",
        transition: "all 0.15s ease",
      }}
      onMouseOver={(e) => {
        e.currentTarget.style.backgroundColor = "var(--bg-overlay, #323640)";
        e.currentTarget.style.borderColor = "var(--accent, #4dc6e8)";
      }}
      onMouseOut={(e) => {
        e.currentTarget.style.backgroundColor = "var(--bg-raised, #262930)";
        e.currentTarget.style.borderColor = "var(--border-strong, rgba(140, 166, 181, 0.16))";
      }}
    >
      <svg width="14" height="14" fill="currentColor" viewBox="0 0 24 24">
        <path d="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11c.54.5 1.25.81 2.04.81 1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3c0 .24.04.47.09.7L8.04 9.81C7.5 9.31 6.79 9 6 9c-1.66 0-3 1.34-3 3s1.34 3 3 3c.79 0 1.5-.31 2.04-.81l7.12 4.16c-.05.21-.08.43-.08.65 0 1.61 1.31 2.92 2.92 2.92 1.61 0 2.92-1.31 2.92-2.92s-1.31-2.92-2.92-2.92z" />
      </svg>
      Share
    </button>
  );
}
