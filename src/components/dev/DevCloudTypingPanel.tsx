"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { DevCloudTypingScatterChart } from "@/components/dev/DevCloudTypingScatterChart";
import {
  countCorrectEventsByToKey,
  extractStrictOutgoingScatterPoints,
  selectTopToKey,
} from "@/lib/dev/cloudTypingDev";
import { useDiagnosticsTransition } from "@/hooks/useDiagnosticsTransition";
import { useWorkspaceStore } from "@/store/useWorkspaceStore";

import styles from "@/app/dev/dev.module.css";

const KEY_LABEL: Record<string, string> = { space: "␣", ",": ",", ".": "." };

function formatKey(key: string) {
  return KEY_LABEL[key] ?? key;
}

export function DevCloudTypingPanel() {
  const analysisEvents = useWorkspaceStore((state) => state.analysisEvents);
  const { loadMockAnalysisData, isMockLoading } = useDiagnosticsTransition();
  const [manualCenterKey, setManualCenterKey] = useState<string | null>(null);

  const toKeyOptions = useMemo(
    () => [...countCorrectEventsByToKey(analysisEvents).entries()].sort((a, b) => b[1] - a[1]),
    [analysisEvents],
  );

  const defaultCenterKey = useMemo(() => selectTopToKey(analysisEvents), [analysisEvents]);

  const centerKey = useMemo(() => {
    if (manualCenterKey && toKeyOptions.some(([key]) => key === manualCenterKey)) {
      return manualCenterKey;
    }
    return defaultCenterKey;
  }, [manualCenterKey, toKeyOptions, defaultCenterKey]);

  const scatterPoints = useMemo(() => {
    if (!centerKey) return [];
    return extractStrictOutgoingScatterPoints(analysisEvents, centerKey);
  }, [analysisEvents, centerKey]);

  if (analysisEvents.length === 0) {
    return (
      <>
        <nav className={styles.devNav}>
          <Link href="/dev" className={styles.devNavLink}>
            ← Dev 홈
          </Link>
        </nav>
        <section className={styles.panel}>
          <h2 className={styles.panelTitle}>데이터 없음</h2>
          <p className={styles.emptyState}>
            워크스페이스의 <code>analysisEvents</code>가 비어 있습니다. 메인 화면에서 연습 후 Tab
            진단으로 데이터를 채우거나, 아래 버튼으로 <code>local_db.json</code> mock 데이터를
            불러오세요.
          </p>
          <button
            type="button"
            className={styles.primaryButton}
            disabled={isMockLoading}
            onClick={() => {
              if (!isMockLoading) {
                void loadMockAnalysisData();
              }
            }}
          >
            {isMockLoading ? "Mock 로딩 중..." : "Mock 데이터 적용 (local_db)"}
          </button>
        </section>
      </>
    );
  }

  return (
    <>
      <nav className={styles.devNav}>
        <Link href="/dev" className={styles.devNavLink}>
          ← Dev 홈
        </Link>
      </nav>

      <section className={styles.panel}>
        <h2 className={styles.panelTitle}>필터</h2>
        <p className={styles.successNote}>
          center = toKey 빈도 1위(기본). 기준 쌍 = <code>fromKey=center</code> outgoing 전이.
          duration은 <strong>직전 행(center toKey)</strong>의 <code>holdDurationMs</code>, latency는
          기준 쌍의 <code>latencyMs</code>. 둘 다 <code>isCorrect=true</code>만 포함.
        </p>
        <div className={styles.controlRow}>
          <label className={styles.controlLabel} htmlFor="dev-cloud-center-select">
            centerKey
          </label>
          <select
            id="dev-cloud-center-select"
            className={styles.toKeySelect}
            value={centerKey ?? ""}
            onChange={(event) => setManualCenterKey(event.target.value)}
          >
            {toKeyOptions.map(([key, count]) => (
              <option key={key} value={key}>
                {formatKey(key)} ({count})
              </option>
            ))}
          </select>
        </div>
        <div className={styles.metaGrid}>
          <div className={styles.metaItem}>
            <span className={styles.metaLabel}>scatter n</span>
            <span className={styles.metaValue}>{scatterPoints.length}</span>
          </div>
          <div className={styles.metaItem}>
            <span className={styles.metaLabel}>center (fromKey)</span>
            <span className={styles.metaValue}>{centerKey ? formatKey(centerKey) : "—"}</span>
          </div>
        </div>
      </section>

      <section className={styles.panel}>
        <h2 className={styles.panelTitle}>
          hold vs latency · {centerKey ? formatKey(centerKey) : "—"} outgoing
        </h2>
        {scatterPoints.length === 0 ? (
          <p className={styles.emptyState}>
            조건을 만족하는 기준 쌍이 없습니다 (center 정답 + hold 기록 + outgoing 정답 필요).
          </p>
        ) : (
          <div className={styles.chartWrap}>
            <DevCloudTypingScatterChart points={scatterPoints} centerKey={centerKey ?? ""} />
          </div>
        )}
      </section>
    </>
  );
}
