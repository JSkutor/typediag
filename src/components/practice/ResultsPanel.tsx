"use client";

import { useMemo } from "react";

import { buildLayout, runPipeline, type KeyEvent } from "@/lib/skdm";
import styles from "./ResultsPanel.module.css";

interface ResultsPanelProps {
  events: KeyEvent[];
}

const KEY_LABEL: Record<string, string> = { space: "␣", ",": ",", ".": "." };

export function ResultsPanel({ events }: ResultsPanelProps) {
  const results = useMemo(() => runPipeline(events, buildLayout()), [events]);

  const rows = useMemo(
    () =>
      Object.values(results)
        .slice()
        .sort((a, b) => b.zSmoothed - a.zSmoothed),
    [results],
  );

  const observed = rows.filter((r) => r.confidence > 0).length;
  const slowest = rows.slice(0, 10);

  if (events.length === 0) return null;

  return (
    <section className={styles.panel} aria-label="분석 결과">
      <div className={styles.header}>
        <h2 className={styles.title}>실시간 SKDM 분석</h2>
        <span className={styles.meta}>
          전이 {events.length} · 관측된 키 {observed}/{rows.length}
        </span>
      </div>

      <p className={styles.hint}>
        평활화된 지연(zSmoothed)이 클수록 손가락이 더 머뭇거린 키입니다. 3D 히트맵 시각화는 Phase
        3에서 추가됩니다.
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
