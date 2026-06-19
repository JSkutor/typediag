"use client";

import type { CSSProperties } from "react";
import { useState } from "react";

interface SyncLocalDbButtonProps {
  className?: string;
  style?: CSSProperties;
}

export function SyncLocalDbButton({ className, style }: SyncLocalDbButtonProps) {
  const [isSyncing, setIsSyncing] = useState(false);

  if (process.env.NODE_ENV !== "development") {
    return null;
  }

  const handleSync = async () => {
    const runsStr = localStorage.getItem("typediag_db_runs_v1");
    const pagesStr = localStorage.getItem("typediag_db_pages_v1");

    if (!runsStr && !pagesStr) {
      alert("localStorage에 타건 데이터가 존재하지 않습니다.");
      return;
    }

    const runs = JSON.parse(runsStr || "[]");
    const pages = JSON.parse(pagesStr || "[]");

    if (runs.length === 0 && pages.length === 0) {
      alert("localStorage에 저장된 데이터가 비어 있습니다.");
      return;
    }

    const confirmSync = confirm(
      `localStorage의 타건 기록(Run ${runs.length}개, Page ${pages.length}개)을 local_db.json에 추가(동기화)하시겠습니까?\n이미 local_db.json에 있는 동일 ID의 기록은 업데이트되며, 새로운 기록은 추가됩니다.`
    );
    if (!confirmSync) return;

    setIsSyncing(true);

    try {
      // 1. Send all runs
      for (const run of runs) {
        const res = await fetch("/api/db", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "createRun",
            runData: {
              id: run.id,
              user_id: run.user_id,
              status: run.status,
              started_at: run.started_at,
            },
          }),
        });
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || `Run 생성 실패 (ID: ${run.id})`);
        }
      }

      // 2. Send all pages
      for (const page of pages) {
        const res = await fetch("/api/db", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "createPage",
            pageData: page,
          }),
        });
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || `Page 생성 실패 (ID: ${page.id})`);
        }
      }

      // 3. Finalize runs
      for (const run of runs) {
        if (run.status === "completed") {
          const res = await fetch("/api/db", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              action: "finalizeRun",
              runId: run.id,
              finishedAtStr: run.finished_at || undefined,
            }),
          });
          if (!res.ok) {
            const errData = await res.json().catch(() => ({}));
            throw new Error(errData.error || `Run 완료 처리 실패 (ID: ${run.id})`);
          }
        }
      }

      alert(
        `localStorage 데이터(Run ${runs.length}개, Page ${pages.length}개)가 local_db.json에 성공적으로 추가되었습니다!`
      );
    } catch (error: unknown) {
      console.error("[SyncLocalDbButton] Sync failed:", error);
      const message = error instanceof Error ? error.message : String(error);
      alert(`동기화 중 오류 발생: ${message}`);
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleSync}
      disabled={isSyncing}
      style={{
        padding: "8px 20px",
        borderRadius: "9999px",
        border: "1px solid rgba(16, 185, 129, 0.3)",
        background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
        color: "#ffffff",
        fontSize: "0.875rem",
        fontWeight: "600",
        boxShadow: "0 4px 10px rgba(16, 185, 129, 0.3)",
        cursor: isSyncing ? "not-allowed" : "pointer",
        display: "flex",
        alignItems: "center",
        gap: "6px",
        opacity: isSyncing ? 0.7 : 1,
        ...style,
      }}
      className={["dev-db-btn", "dev-db-sync-btn", className].filter(Boolean).join(" ")}
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
        <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
        <polyline points="17 21 17 13 7 13 7 21" />
        <polyline points="7 3 7 8 15 8" />
      </svg>
      {isSyncing ? "동기화 중..." : "local_db.json에 타건 데이터 저장"}
    </button>
  );
}
