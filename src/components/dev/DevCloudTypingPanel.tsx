"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { DevCloudTypingScatterChart } from "@/components/dev/DevCloudTypingScatterChart";
import {
  countCorrectReferenceTransitions,
  extractStrictOutgoingScatterPoints,
  selectDefaultFocusKey,
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
  const [manualFocusKey, setManualFocusKey] = useState<string | null>(null);

  const focusKeyOptions = useMemo(
    () =>
      [...countCorrectReferenceTransitions(analysisEvents).entries()].sort((a, b) => b[1] - a[1]),
    [analysisEvents],
  );

  const defaultFocusKey = useMemo(() => selectDefaultFocusKey(analysisEvents), [analysisEvents]);

  const focusKey = useMemo(() => {
    if (manualFocusKey && focusKeyOptions.some(([key]) => key === manualFocusKey)) {
      return manualFocusKey;
    }
    return defaultFocusKey;
  }, [manualFocusKey, focusKeyOptions, defaultFocusKey]);

  const scatterPoints = useMemo(() => {
    if (!focusKey) return [];
    return extractStrictOutgoingScatterPoints(analysisEvents, focusKey);
  }, [analysisEvents, focusKey]);

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
          focusKey 기본값 = reference transition 정답 수 1위. X축 hold는 reference
          transition(<code>toKey === focusKey</code>)의 <code>holdDurationMs</code>, Y축 latency는
          outgoing transition(<code>fromKey === focusKey</code>)의 <code>latencyMs</code>. 둘 다{" "}
          <code>isCorrect=true</code>만 포함.
        </p>
        <div className={styles.controlRow}>
          <label className={styles.controlLabel} htmlFor="dev-cloud-focus-select">
            focusKey
          </label>
          <select
            id="dev-cloud-focus-select"
            className={styles.toKeySelect}
            value={focusKey ?? ""}
            onChange={(event) => setManualFocusKey(event.target.value)}
          >
            {focusKeyOptions.map(([key, count]) => (
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
            <span className={styles.metaLabel}>focusKey</span>
            <span className={styles.metaValue}>{focusKey ? formatKey(focusKey) : "—"}</span>
          </div>
        </div>
      </section>

      <section className={styles.panel}>
        <h2 className={styles.panelTitle}>
          hold vs latency · {focusKey ? formatKey(focusKey) : "—"} outgoing transition
        </h2>
        {scatterPoints.length === 0 ? (
          <p className={styles.emptyState}>
            조건을 만족하는 transition 쌍이 없습니다 (reference transition 정답 + hold 기록 +
            outgoing transition 정답 필요).
          </p>
        ) : (
          <div className={styles.chartWrap}>
            <DevCloudTypingScatterChart points={scatterPoints} focusKey={focusKey ?? ""} />
          </div>
        )}
      </section>
    </>
  );
}
