"use client";

import {
  DEFAULT_SIMILARITY_THRESHOLD,
  TOPIC_POOL_REFILL_THRESHOLD,
  formatUsd,
  type CostSimulationInput,
  type CostSimulationResult,
} from "@/lib/dev/costSimulation";
import type { DbCostStats } from "@/lib/dev/costStats";

import devStyles from "@/app/dev/dev.module.css";
import { NumberField, SliderField } from "@/components/dev/DevSimFields";
import styles from "../DevCostSimulationPanel.module.css";

const POOL_PRESETS = [
  { label: "batch(1)", avg: 1 },
  { label: "혼합(5)", avg: 5 },
  { label: "풍부(20)", avg: 20 },
] as const;

interface CostSearchPoolSectionProps {
  input: CostSimulationInput;
  result: CostSimulationResult;
  dbStats: DbCostStats | null;
  onPatch: (partial: Partial<CostSimulationInput>) => void;
}

export function CostSearchPoolSection({
  input,
  result,
  dbStats,
  onPatch,
}: CostSearchPoolSectionProps) {
  const d = result.derived;
  const topicLlmUsd = result.items.find((i) => i.id === "openai")?.usd ?? 0;

  const applyDbPoolHint = () => {
    if (!dbStats || dbStats.embedded <= 0) return;
    const batchHeavy = dbStats.batchSource / Math.max(1, dbStats.embedded);
    const avg =
      batchHeavy > 0.8
        ? 1
        : Math.min(
            20,
            Math.max(1, Math.round(dbStats.embedded / Math.max(1, dbStats.distinctTopics))),
          );
    onPatch({ avgSentencesOnHit: avg, sentencesPerCachedTopic: avg });
  };

  return (
    <section className={styles.section}>
      <h3 className={styles.sectionTitle}>검색 풀 품질</h3>
      <p className={devStyles.helpText}>
        SSOT: 검색 결과 &lt; {input.minUsablePoolSize}문장이면 즉시 OpenAI 보충 (
        <code>createTopicSlice</code>). 세션 중 풀 보충은 remaining ≤ {TOPIC_POOL_REFILL_THRESHOLD}{" "}
        고정. batch 코퍼스는 보통 1문장이라 매칭돼도 생성 비용 발생.
      </p>
      <div className={styles.fieldGrid}>
        <SliderField
          label="히트 시 평균 반환 문장"
          value={input.avgSentencesOnHit}
          min={1}
          max={100}
          step={1}
          hint={`유사도 &gt; ${DEFAULT_SIMILARITY_THRESHOLD}, limit ${input.maxPoolSize}`}
          onChange={(avgSentencesOnHit) => onPatch({ avgSentencesOnHit })}
        />
        <div className={styles.presetRow}>
          {POOL_PRESETS.map((p) => (
            <button
              key={p.avg}
              type="button"
              className={styles.presetButton}
              onClick={() => onPatch({ avgSentencesOnHit: p.avg })}
            >
              {p.label}
            </button>
          ))}
          {dbStats && dbStats.embedded > 0 ? (
            <button type="button" className={styles.presetButton} onClick={applyDbPoolHint}>
              DB추정
            </button>
          ) : null}
        </div>
        <SliderField
          label="최소 usable 풀"
          value={input.minUsablePoolSize}
          min={1}
          max={20}
          step={1}
          hint="이 미만이면 /topic/generate 즉시 호출"
          onChange={(minUsablePoolSize) => onPatch({ minUsablePoolSize })}
        />
        <SliderField
          label="OpenAI 1회 생성 문장"
          value={input.sentencesPerGenerate}
          min={5}
          max={30}
          step={1}
          hint="1회 API 호출 시 생성 문장 수 (기본 20)"
          onChange={(sentencesPerGenerate) => onPatch({ sentencesPerGenerate })}
        />
        <NumberField
          label="클라이언트 풀 상한"
          value={input.maxPoolSize}
          min={20}
          max={100}
          hint="Zustand client pool 상한 (기본 100)"
          onChange={(maxPoolSize) => onPatch({ maxPoolSize })}
        />
      </div>
      <p className={styles.fieldHint}>
        검색당 OpenAI {d.avgGeneratesPerSearch.toFixed(2)}회 · 월{" "}
        {Math.round(d.topicLlmCallsPerMonth).toLocaleString()} calls · {formatUsd(topicLlmUsd)}/mo
      </p>
    </section>
  );
}
