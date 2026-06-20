"use client";

import { useMemo, useState } from "react";

import { PiecewiseRegressionChart } from "@/components/dev/PiecewiseRegressionChart";
import {
  countCorrectEventsByToKey,
  ensureFinalUpperBound,
  PIECEWISE_FAILURE_LABEL,
  selectTopToKey,
} from "@/lib/dev/piecewiseDev";
import { useWorkspaceStore } from "@/store/useWorkspaceStore";
import {
  fitPiecewiseLinearWithDiagnostics,
  type PiecewiseFitFailure,
  type PiecewiseFitSuccess,
} from "@/utils/piecewiseRegression";

import styles from "@/app/dev/dev.module.css";

const KEY_LABEL: Record<string, string> = { space: "␣", ",": ",", ".": "." };

function formatKey(key: string) {
  return KEY_LABEL[key] ?? key;
}

function isSuccess(
  outcome: PiecewiseFitSuccess | PiecewiseFitFailure,
): outcome is PiecewiseFitSuccess {
  return "result" in outcome;
}

export function DevPiecewisePanel() {
  const analysisEvents = useWorkspaceStore((state) => state.analysisEvents);
  const [manualToKey, setManualToKey] = useState<string | null>(null);

  const toKeyOptions = useMemo(
    () => [...countCorrectEventsByToKey(analysisEvents).entries()].sort((a, b) => b[1] - a[1]),
    [analysisEvents],
  );

  const defaultToKey = useMemo(() => selectTopToKey(analysisEvents), [analysisEvents]);

  const selectedToKey = useMemo(() => {
    if (manualToKey && toKeyOptions.some(([key]) => key === manualToKey)) {
      return manualToKey;
    }
    return defaultToKey;
  }, [manualToKey, toKeyOptions, defaultToKey]);

  const outcome = useMemo(() => {
    if (!selectedToKey || analysisEvents.length === 0) return null;
    ensureFinalUpperBound(analysisEvents);
    return fitPiecewiseLinearWithDiagnostics(analysisEvents, selectedToKey);
  }, [analysisEvents, selectedToKey]);

  const topKeyCounts = useMemo(() => toKeyOptions.slice(0, 5), [toKeyOptions]);

  if (analysisEvents.length === 0) {
    return (
      <section className={styles.panel}>
        <h2 className={styles.panelTitle}>데이터 없음</h2>
        <p className={styles.emptyState}>
          워크스페이스의 <code>analysisEvents</code>가 비어 있습니다. 상단{" "}
          <strong>local_db.json 데이터 적용</strong> 버튼을 누르거나, 메인 화면에서 연습 후 Tab
          진단으로 데이터를 채우세요.
        </p>
      </section>
    );
  }

  return (
    <>
      <section className={styles.panel}>
        <h2 className={styles.panelTitle}>Zustand 데이터</h2>
        <div className={styles.controlRow}>
          <label className={styles.controlLabel} htmlFor="dev-to-key-select">
            toKey
          </label>
          <select
            id="dev-to-key-select"
            className={styles.toKeySelect}
            value={selectedToKey ?? ""}
            onChange={(event) => setManualToKey(event.target.value)}
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
            <span className={styles.metaLabel}>analysisEvents</span>
            <span className={styles.metaValue}>{analysisEvents.length}</span>
          </div>
          <div className={styles.metaItem}>
            <span className={styles.metaLabel}>선택 toKey 정답 수</span>
            <span className={styles.metaValue}>
              {selectedToKey
                ? (toKeyOptions.find(([key]) => key === selectedToKey)?.[1] ?? "—")
                : "—"}
            </span>
          </div>
          <div className={styles.metaItem}>
            <span className={styles.metaLabel}>정답 상위 5키</span>
            <span className={styles.metaValue}>
              {topKeyCounts.map(([key, count]) => `${formatKey(key)}(${count})`).join(" · ") || "—"}
            </span>
          </div>
        </div>
      </section>

      {!outcome || !isSuccess(outcome) ? (
        <section className={styles.panel}>
          <h2 className={styles.panelTitle}>회귀 불가</h2>
          {outcome && !isSuccess(outcome) && (
            <>
              <p className={styles.warning}>
                {PIECEWISE_FAILURE_LABEL[outcome.reason] ?? outcome.reason}
              </p>
              <div className={styles.metaGrid}>
                <div className={styles.metaItem}>
                  <span className={styles.metaLabel}>target toKey</span>
                  <span className={styles.metaValue}>{formatKey(outcome.targetToKey)}</span>
                </div>
                <div className={styles.metaItem}>
                  <span className={styles.metaLabel}>정답 이벤트 (raw)</span>
                  <span className={styles.metaValue}>{outcome.rawCorrectCount}</span>
                </div>
                <div className={styles.metaItem}>
                  <span className={styles.metaLabel}>bound 초과 제외</span>
                  <span className={styles.metaValue}>{outcome.excludedByBoundCount}</span>
                </div>
                <div className={styles.metaItem}>
                  <span className={styles.metaLabel}>필터 후 n</span>
                  <span className={styles.metaValue}>{outcome.filteredCount}</span>
                </div>
                <div className={styles.metaItem}>
                  <span className={styles.metaLabel}>finalUpperBound</span>
                  <span className={styles.metaValue}>
                    {outcome.boundRecord
                      ? `${outcome.boundRecord.final_upper_bound_ms.toFixed(1)} ms`
                      : "없음"}
                  </span>
                </div>
              </div>
            </>
          )}
        </section>
      ) : (
        <>
          <section className={styles.panel}>
            <h2 className={styles.panelTitle}>
              분절 회귀 · {formatKey(outcome.diagnostics.targetToKey)}
            </h2>
            <p className={styles.successNote}>
              X축은 경과 시간이 아니라, 선택된 toKey의 <strong>정답 입력 순서 인덱스</strong>
              입니다.
            </p>

            <div className={styles.legend}>
              <span className={styles.legendItem}>
                <span className={styles.legendDot} aria-hidden />
                scatter (전체 {outcome.result.n}점)
              </span>
              <span className={styles.legendItem}>
                <span className={styles.legendLine} aria-hidden />
                회귀선 predict(x)
              </span>
              <span className={styles.legendItem}>
                <span className={styles.legendDash} aria-hidden />
                분절점 c (Muggeo)
              </span>
              <span className={styles.legendItem}>
                <span className={styles.legendDashMuted} aria-hidden />
                초기 c₀ (grid search)
              </span>
            </div>

            <div className={styles.chartWrap}>
              <PiecewiseRegressionChart
                points={outcome.diagnostics.points}
                result={outcome.result}
                breakpointC0={outcome.diagnostics.c0}
              />
            </div>
          </section>

          <section className={styles.panel}>
            <h2 className={styles.panelTitle}>내부 파이프라인</h2>
            <div className={styles.metaGrid}>
              <div className={styles.metaItem}>
                <span className={styles.metaLabel}>정답 raw</span>
                <span className={styles.metaValue}>{outcome.diagnostics.rawCorrectCount}</span>
              </div>
              <div className={styles.metaItem}>
                <span className={styles.metaLabel}>bound 초과 제외</span>
                <span className={styles.metaValue}>{outcome.diagnostics.excludedByBoundCount}</span>
              </div>
              <div className={styles.metaItem}>
                <span className={styles.metaLabel}>회귀 n</span>
                <span className={styles.metaValue}>{outcome.result.n}</span>
              </div>
              <div className={styles.metaItem}>
                <span className={styles.metaLabel}>finalUpperBound</span>
                <span className={styles.metaValue}>
                  {outcome.diagnostics.upperBoundMs.toFixed(2)} ms
                </span>
              </div>
              <div className={styles.metaItem}>
                <span className={styles.metaLabel}>max_clip_ms</span>
                <span className={styles.metaValue}>
                  {outcome.diagnostics.boundRecord.max_clip_ms.toFixed(2)} ms
                </span>
              </div>
              <div className={styles.metaItem}>
                <span className={styles.metaLabel}>bound source events</span>
                <span className={styles.metaValue}>
                  {outcome.diagnostics.boundRecord.source_event_count}
                </span>
              </div>
              <div className={styles.metaItem}>
                <span className={styles.metaLabel}>c₀ → c</span>
                <span className={styles.metaValue}>
                  {outcome.diagnostics.c0.toFixed(2)} → {outcome.result.c.toFixed(2)}
                </span>
              </div>
              <div className={styles.metaItem}>
                <span className={styles.metaLabel}>기울기 (전 / 후)</span>
                <span className={styles.metaValue}>
                  {outcome.result.slopeBefore.toFixed(4)} / {outcome.result.slopeAfter.toFixed(4)}{" "}
                  ms/idx
                </span>
              </div>
            </div>

            <div className={styles.equationBlock}>
              <div>
                x ≤ c : y = {outcome.result.beta0.toFixed(3)} + ({outcome.result.beta1.toFixed(4)})
                · x
              </div>
              <div>
                x &gt; c : y = {outcome.result.beta0.toFixed(3)} + (
                {outcome.result.beta1.toFixed(4)}) · x + ({outcome.result.beta2.toFixed(4)}) · (x −{" "}
                {outcome.result.c.toFixed(2)})
              </div>
              <div style={{ marginTop: "0.75rem" }}>
                predict(0) = {outcome.result.predict(0).toFixed(2)} ms · predict(c) ={" "}
                {outcome.result.predict(outcome.result.c).toFixed(2)} ms · predict(n−1) ={" "}
                {outcome.result.predict(outcome.result.n - 1).toFixed(2)} ms
              </div>
            </div>
          </section>
        </>
      )}
    </>
  );
}
