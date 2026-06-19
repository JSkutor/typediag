"use client";

import { useMemo } from "react";

import { useWorkspaceStore } from "@/store/useWorkspaceStore";
import styles from "./ResultsPanel.module.css";

const KEY_LABEL: Record<string, string> = { space: "␣", ",": ",", ".": "." };

/**
 * Displays pre-computed SKDM key stats from the workspace store.
 * Pipeline runs once on Tab → diagnostics transition (see useDiagnosticsTransition).
 */
export function ResultsPanel() {
  const keyStats = useWorkspaceStore((state) => state.keyStats);
  const analysisEvents = useWorkspaceStore((state) => state.analysisEvents);

  const rows = useMemo(
    () =>
      Object.values(keyStats)
        .slice()
        .sort((a, b) => b.zSmoothed - a.zSmoothed),
    [keyStats],
  );

  const observed = rows.filter((r) => r.confidence > 0).length;
  const slowest = rows.slice(0, 10);

  if (analysisEvents.length === 0) return null;

  return (
    <section className={styles.panel} aria-label="분석 결과">
      <div className={styles.header}>
        <h2 className={styles.title}>SKDM 분석</h2>
        <span className={styles.meta}>
          전이 {analysisEvents.length} · 관측된 키 {observed}/{rows.length}
        </span>
      </div>

      <p className={styles.hint}>
        Tab으로 진단 모드에 진입할 때 계산된 결과입니다. 평활화된 지연(zSmoothed)이 클수록 손가락이
        더 머뭇거린 키입니다.
      </p>

      <ol className={styles.list}>
        {slowest.map((r) => (
          <li key={r.key} className={styles.row}>
            <span className={styles.keycap}>{KEY_LABEL[r.key] ?? r.key}</span>
            <div className={styles.barTrack}>
              <div
                className={styles.barFill}
                style={{ width: `${Math.round(r.zSmoothed * 100)}%` }}
              />
            </div>
            <span className={styles.value}>{(r.zSmoothed * 100).toFixed(0)}</span>
            <span className={styles.conf}>{r.confidence > 0 ? `×${r.confidence}` : "보간"}</span>
          </li>
        ))}
      </ol>
    </section>
  );
}
