"use client";

import type { CSSProperties } from "react";

import { useTypingStore } from "@/store/useTypingStore";

interface LoadLocalDbButtonProps {
  className?: string;
  style?: CSSProperties;
}

export function LoadLocalDbButton({ className, style }: LoadLocalDbButtonProps) {
  if (process.env.NODE_ENV !== "development") {
    return null;
  }

  return (
    <button
      type="button"
      onClick={async () => {
        await useTypingStore.getState().loadLocalDbData();
      }}
      style={{
        padding: "8px 20px",
        borderRadius: "9999px",
        border: "1px solid rgba(99, 102, 241, 0.3)",
        background: "linear-gradient(135deg, #4f46e5 0%, #4338ca 100%)",
        color: "#ffffff",
        fontSize: "0.875rem",
        fontWeight: "600",
        boxShadow: "0 4px 10px rgba(79, 70, 229, 0.3)",
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        gap: "6px",
        ...style,
      }}
      className={["dev-db-btn", className].filter(Boolean).join(" ")}
    >
      <svg
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
      >
        <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
        <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
        <line x1="12" y1="22.08" x2="12" y2="12" />
      </svg>
      local_db.json 데이터 적용
    </button>
  );
}
