"use client";

import Link from "next/link";

import {
  DEFAULT_SIMILARITY_THRESHOLD,
  estimateCacheHitRate,
  type CostSimulationInput,
  type CostSimulationResult,
} from "@/lib/dev/costSimulation";
import type { DbCostStats } from "@/lib/dev/costStats";

import devStyles from "@/app/dev/dev.module.css";
import { SliderField } from "@/components/dev/DevSimFields";
import styles from "../DevCostSimulationPanel.module.css";

const CORPUS_PRESETS = [
  { label: "1만", count: 10_000 },
  { label: "5만", count: 50_000 },
  { label: "10만", count: 100_000 },
] as const;

interface CostCorpusSectionProps {
  input: CostSimulationInput;
  result: CostSimulationResult;
  dbStats: DbCostStats | null;
  dbError: string | null;
  onPatch: (partial: Partial<CostSimulationInput>) => void;
}

export function CostCorpusSection({
  input,
  result,
  dbStats,
  dbError,
  onPatch,
}: CostCorpusSectionProps) {
  const d = result.derived;

  const applyDbEmbedded = () => {
    if (!dbStats || dbStats.embedded <= 0) return;
    onPatch({ cachedSentenceCount: dbStats.embedded });
  };

  return (
    <>
      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>주제 매칭 (코퍼스)</h3>
        {dbStats ? (
          <div className={styles.dbStats}>
            DB 임베딩 {dbStats.embedded.toLocaleString()} / 전체 {dbStats.total.toLocaleString()}행
            {dbStats.distinctTopics > 0
              ? ` · 주제 ${dbStats.distinctTopics.toLocaleString()}개`
              : ""}
            {dbStats.batchMetadata?.request_count != null
              ? ` · batch ${dbStats.batchMetadata.request_count.toLocaleString()}요청`
              : ""}
          </div>
        ) : (
          <p className={devStyles.helpText}>{dbError ?? "DB 로딩…"}</p>
        )}
        <div className={styles.modeToggle}>
          <button
            type="button"
            className={`${styles.modeButton} ${input.cacheMissMode === "corpus" ? styles.modeButtonActive : ""}`}
            onClick={() => onPatch({ cacheMissMode: "corpus" })}
          >
            코퍼스 추정
          </button>
          <button
            type="button"
            className={`${styles.modeButton} ${input.cacheMissMode === "manual" ? styles.modeButtonActive : ""}`}
            onClick={() => onPatch({ cacheMissMode: "manual" })}
          >
            수동 %
          </button>
        </div>
        {input.cacheMissMode === "corpus" ? (
          <div className={styles.fieldGrid}>
            <SliderField
              label="코퍼스 행 수 (임베딩됨)"
              value={input.cachedSentenceCount}
              min={500}
              max={200_000}
              step={500}
              format={(v) => v.toLocaleString()}
              hint={`batch 1요청=1행 · 유효 주제 ≈ ${d.effectiveTopicCoverage.toLocaleString()}`}
              onChange={(cachedSentenceCount) => onPatch({ cachedSentenceCount })}
            />
            <div className={styles.presetRow}>
              {CORPUS_PRESETS.map((p) => (
                <button
                  key={p.count}
                  type="button"
                  className={styles.presetButton}
                  onClick={() => onPatch({ cachedSentenceCount: p.count })}
                >
                  {p.label}
                </button>
              ))}
              {dbStats && dbStats.embedded > 0 ? (
                <button type="button" className={styles.presetButton} onClick={applyDbEmbedded}>
                  DB
                </button>
              ) : null}
            </div>
            <SliderField
              label="주제당 코퍼스 문장 (평균)"
              value={input.sentencesPerCachedTopic}
              min={1}
              max={20}
              step={1}
              hint="batch≈1 · Topic generate 1회=20행 누적"
              onChange={(sentencesPerCachedTopic) => onPatch({ sentencesPerCachedTopic })}
            />
            <SliderField
              label="주제 검색 공간"
              value={input.topicQuerySpace}
              min={1_000}
              max={500_000}
              step={1_000}
              format={(v) => v.toLocaleString()}
              hint="MAU가 검색할 수 있는 distinct 주제 수 추정"
              onChange={(topicQuerySpace) => onPatch({ topicQuerySpace })}
            />
            <SliderField
              label="유사 주제 보정"
              value={input.semanticBreadth}
              min={1}
              max={4}
              step={0.1}
              hint="AI↔인공지능 등 임베딩 근접 매칭 배율"
              onChange={(semanticBreadth) => onPatch({ semanticBreadth })}
            />
          </div>
        ) : (
          <SliderField
            label="주제 미매칭률"
            value={input.manualCacheMissRate}
            min={0}
            max={1}
            step={0.01}
            format={(v) => `${Math.round(v * 100)}%`}
            hint="벡터 검색 404 → OpenAI fallback"
            onChange={(manualCacheMissRate) => onPatch({ manualCacheMissRate })}
          />
        )}
        <p className={styles.fieldHint}>
          주제 매칭 {(d.topicMatchRate * 100).toFixed(1)}% · 얇은 히트(보충 필요){" "}
          {(d.thinHitRate * 100).toFixed(1)}% · 충분한 풀 {(d.usableHitRate * 100).toFixed(1)}%
        </p>
      </section>

      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>코퍼스 참고</h3>
        <p className={devStyles.helpText}>
          유사도 &gt; {DEFAULT_SIMILARITY_THRESHOLD}. <Link href="/dev/cosine">Cosine Dev</Link>로
          주제별 반환 문장 수 확인. 코퍼스 1만/10만 행 매칭률 약{" "}
          {(
            estimateCacheHitRate({
              cachedSentenceCount: 10_000,
              sentencesPerCachedTopic: input.sentencesPerCachedTopic,
              topicQuerySpace: input.topicQuerySpace,
              semanticBreadth: input.semanticBreadth,
              repeatTopicRate: input.repeatTopicRate,
            }) * 100
          ).toFixed(0)}
          % /{" "}
          {(
            estimateCacheHitRate({
              cachedSentenceCount: 100_000,
              sentencesPerCachedTopic: input.sentencesPerCachedTopic,
              topicQuerySpace: input.topicQuerySpace,
              semanticBreadth: input.semanticBreadth,
              repeatTopicRate: input.repeatTopicRate,
            }) * 100
          ).toFixed(0)}
          %.
        </p>
      </section>
    </>
  );
}
