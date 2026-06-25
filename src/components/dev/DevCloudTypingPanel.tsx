"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { DevCloudTypingScatterChart } from "@/components/dev/DevCloudTypingScatterChart";
import {
  buildCloudTypingDevData,
  CLOUD_TYPING_DEV_MIN_DENOM,
  countCorrectReferenceTransitions,
  selectDefaultFocusKey,
} from "@/lib/dev/cloudTypingDev";
import { useDiagnosticsTransition } from "@/hooks/useDiagnosticsTransition";
import { useWorkspaceStore } from "@/store/useWorkspaceStore";
import type { CloudTypingEffectiveness, CloudTypingLevel } from "@/utils/cylindricalStats";

import styles from "@/app/dev/dev.module.css";

const KEY_LABEL: Record<string, string> = { space: "␣", ",": ",", ".": "." };

const CLOUD_TYPING_LEVEL_LABEL: Record<CloudTypingLevel, string> = {
  not_applied: "미적용",
  weak: "약함",
  moderate: "보통",
  strong: "강함",
};

const CLOUD_TYPING_EFFECTIVENESS_LABEL: Record<CloudTypingEffectiveness, string> = {
  effective: "효과적",
  counterproductive: "역효과",
  neutral: "상관 없음",
};

function formatKey(key: string) {
  return KEY_LABEL[key] ?? key;
}

export function DevCloudTypingPanel() {
  const analysisEvents = useWorkspaceStore((state) => state.analysisEvents);
  const { loadMockAnalysisData, isMockLoading } = useDiagnosticsTransition();
  const [manualFocusKey, setManualFocusKey] = useState<string | null>(null);
  const [minDenomMs, setMinDenomMs] = useState(CLOUD_TYPING_DEV_MIN_DENOM);

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

  const devData = useMemo(() => {
    if (!focusKey) return null;
    return buildCloudTypingDevData(analysisEvents, focusKey, { minDenomMs });
  }, [analysisEvents, focusKey, minDenomMs]);

  const { diagnostics, analysisPoints, excludedPoints, rawOutgoingCount } = devData ?? {
    diagnostics: null,
    analysisPoints: [],
    excludedPoints: [],
    rawOutgoingCount: 0,
  };

  const keyStats = diagnostics?.key ?? null;
  const cloudStrokeCount = analysisPoints.filter((point) => point.isCloudStroke).length;

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
        <h2 className={styles.panelTitle}>필터 · §2.1</h2>
        <p className={styles.successNote}>
          outgoing 추출 후 IQR로 머뭇거림을 제외해 분석 풀을 만듭니다. ND = |L−D| /
          max(L+D, M). M 기본값 300 ms는 빠른 타건에서 비율이 과도하게 튀지 않게 하는
          휴리스틱이며, 슬라이더로 조절할 수 있습니다. 구름 stroke 상한은 0.25입니다.
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
        <div className={styles.controlRow}>
          <label className={styles.controlLabel} htmlFor="dev-cloud-alpha-range">
            M (최소 합계)
          </label>
          <input
            id="dev-cloud-alpha-range"
            type="range"
            className={styles.rangeInput}
            min={0}
            max={400}
            step={1}
            value={minDenomMs}
            onChange={(event) => setMinDenomMs(Number(event.target.value))}
          />
          <input
            id="dev-cloud-alpha-number"
            type="number"
            className={styles.alphaNumberInput}
            min={0}
            max={500}
            step={1}
            value={minDenomMs}
            aria-label="M ms"
            onChange={(event) => {
              const next = Number(event.target.value);
              if (!Number.isFinite(next)) return;
              setMinDenomMs(Math.min(500, Math.max(0, next)));
            }}
          />
          <span className={styles.alphaUnit}>ms</span>
        </div>
        <div className={styles.metaGrid}>
          <div className={styles.metaItem}>
            <span className={styles.metaLabel}>원시 outgoing n</span>
            <span className={styles.metaValue}>{rawOutgoingCount}</span>
          </div>
          <div className={styles.metaItem}>
            <span className={styles.metaLabel}>분석 풀 n</span>
            <span className={styles.metaValue}>{diagnostics?.analysisPoolCount ?? 0}</span>
          </div>
          <div className={styles.metaItem}>
            <span className={styles.metaLabel}>머뭇거림 제외</span>
            <span className={styles.metaValue}>{excludedPoints.length}</span>
          </div>
          <div className={styles.metaItem}>
            <span className={styles.metaLabel}>구름 stroke (풀 내)</span>
            <span className={styles.metaValue}>{cloudStrokeCount}</span>
          </div>
        </div>
      </section>

      <section className={styles.panel}>
        <h2 className={styles.panelTitle}>진단 지표 (M={minDenomMs}ms)</h2>
        {diagnostics?.insufficientSample ? (
          <p className={styles.emptyState}>
            표본 부족 (나가는 전이 n={diagnostics.analysisPoolCount}, 11회 이상 필요)
          </p>
        ) : !keyStats || !diagnostics ? (
          <p className={styles.emptyState}>이 키에서 나가는 전이 데이터가 없습니다.</p>
        ) : (
          <>
            <div className={styles.metaGrid}>
              <div className={styles.metaItem}>
                <span className={styles.metaLabel}>구름타법 비율</span>
                <span className={styles.metaValue}>
                  {(keyStats.cloudTypingRatio * 100).toFixed(0)}% ·{" "}
                  {CLOUD_TYPING_LEVEL_LABEL[keyStats.level]}
                </span>
              </div>
              <div className={styles.metaItem}>
                <span className={styles.metaLabel}>효과성</span>
                <span className={styles.metaValue}>
                  {diagnostics.effectivenessCorrelation.isSignificant
                    ? CLOUD_TYPING_EFFECTIVENESS_LABEL[diagnostics.effectiveness]
                    : "상관 무의미"}
                </span>
              </div>
              <div className={styles.metaItem}>
                <span className={styles.metaLabel}>median latency</span>
                <span className={styles.metaValue}>{keyStats.latencyMs.toFixed(1)} ms</span>
              </div>
              <div className={styles.metaItem}>
                <span className={styles.metaLabel}>median dwell</span>
                <span className={styles.metaValue}>{keyStats.dwellMs.toFixed(1)} ms</span>
              </div>
              <div className={styles.metaItem}>
                <span className={styles.metaLabel}>median flight</span>
                <span className={styles.metaValue}>{keyStats.flightMs.toFixed(1)} ms</span>
              </div>
              <div className={styles.metaItem}>
                <span className={styles.metaLabel}>median ND</span>
                <span className={styles.metaValue}>
                  {keyStats.normalizedDifference.toFixed(3)}
                </span>
              </div>
              <div className={styles.metaItem}>
                <span className={styles.metaLabel}>상관 r (n)</span>
                <span className={styles.metaValue}>
                  {diagnostics.effectivenessCorrelation.pearsonR.toFixed(2)} (
                  {diagnostics.effectivenessCorrelation.sampleCount})
                </span>
              </div>
            </div>
            <p className={styles.helpText}>
              {formatKey(keyStats.key)} 키 · 나가는 전이 n={keyStats.sampleCount} — 비율·median
              ND·상관 r은 위 M 값을 반영해 집계합니다.
            </p>
          </>
        )}
      </section>

      <section className={styles.panel}>
        <h2 className={styles.panelTitle}>
          D vs L · {focusKey ? formatKey(focusKey) : "—"} (원본 ms)
        </h2>
        <div className={styles.legend}>
          <span className={styles.legendItem}>
            <span className={styles.legendDot} style={{ background: "var(--accent)" }} />
            분석 풀 · 구름 stroke (ND ≤ 0.25)
          </span>
          <span className={styles.legendItem}>
            <span className={styles.legendDot} style={{ background: "var(--text-secondary)" }} />
            분석 풀 · 비구름
          </span>
          <span className={styles.legendItem}>
            <span className={styles.legendDot} style={{ background: "var(--text-muted)" }} />
            머뭇거림 IQR 제외
          </span>
          <span className={styles.legendItem}>
            <span className={styles.legendDashMuted} />
            D = L
          </span>
        </div>
        {analysisPoints.length === 0 && excludedPoints.length === 0 ? (
          <p className={styles.emptyState}>
            조건을 만족하는 outgoing transition 쌍이 없습니다 (outgoing 정답 + reference hold
            기록 + 제외 키 아님).
          </p>
        ) : (
          <div className={styles.chartWrap}>
            <DevCloudTypingScatterChart
              analysisPoints={analysisPoints}
              excludedPoints={excludedPoints}
              focusKey={focusKey ?? ""}
              minDenomMs={minDenomMs}
            />
          </div>
        )}
      </section>
    </>
  );
}
