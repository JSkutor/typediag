"use client";

import Link from "next/link";

import {
  DEFAULT_SIMILARITY_THRESHOLD,
  GEMINI_PRICING,
  ORACLE_FREE_TIER,
  TOPIC_POOL_REFILL_THRESHOLD,
  estimateCacheHitRate,
  formatUsd,
  type CostSimulationInput,
  type CostSimulationResult,
  type GeminiTokenEstimate,
} from "@/lib/dev/costSimulation";
import type { DbCostStats } from "@/lib/dev/costStats";

import devStyles from "@/app/dev/dev.module.css";
import { NumberField, SliderField } from "@/components/dev/DevSimFields";
import styles from "./DevCostSimulationPanel.module.css";

const CORPUS_PRESETS = [
  { label: "1만", count: 10_000 },
  { label: "5만", count: 50_000 },
  { label: "10만", count: 100_000 },
] as const;

const POOL_PRESETS = [
  { label: "batch(1)", avg: 1 },
  { label: "혼합(5)", avg: 5 },
  { label: "풍부(20)", avg: 20 },
] as const;

interface DevCostSectionProps {
  input: CostSimulationInput;
  result: CostSimulationResult;
  dbStats: DbCostStats | null;
  dbError: string | null;
  tokenEstimate: GeminiTokenEstimate;
  onPatch: (partial: Partial<CostSimulationInput>) => void;
  onPatchShared: (partial: Pick<CostSimulationInput, "loginRate">) => void;
}

export function DevCostSection({
  input,
  result,
  dbStats,
  dbError,
  tokenEstimate,
  onPatch,
  onPatchShared,
}: DevCostSectionProps) {
  const applyDbEmbedded = () => {
    if (!dbStats || dbStats.embedded <= 0) return;
    onPatch({ cachedSentenceCount: dbStats.embedded });
  };

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

  const applySsotTokens = () => {
    onPatch({
      geminiInputTokens: Math.round((tokenEstimate.inputMin + tokenEstimate.inputMax) / 2),
      geminiOutputTokens: tokenEstimate.output,
    });
  };

  const geminiUsd = result.items.find((i) => i.id === "gemini")?.usd ?? 0;
  const d = result.derived;

  return (
    <div className={styles.paneSections}>
      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>사용량</h3>
        <div className={styles.fieldGrid}>
          <SliderField
            label="월 세션 / MAU"
            value={input.sessionsPerMonth}
            min={1}
            max={60}
            step={1}
            onChange={(sessionsPerMonth) => onPatch({ sessionsPerMonth })}
          />
          <SliderField
            label="세션당 page"
            value={input.pagesPerSession}
            min={5}
            max={100}
            step={1}
            onChange={(pagesPerSession) => onPatch({ pagesPerSession })}
          />
          <SliderField
            label="Topic Mode 세션 비율"
            value={input.topicSessionRate}
            min={0}
            max={1}
            step={0.05}
            format={(v) => `${Math.round(v * 100)}%`}
            hint={`MAU당 월 ${d.topicSessionsPerMauMonth.toFixed(1)} Topic 세션`}
            onChange={(topicSessionRate) => onPatch({ topicSessionRate })}
          />
          <SliderField
            label="Topic 세션당 주제 검색"
            value={input.topicSearchesPerSession}
            min={0.5}
            max={5}
            step={0.1}
            onChange={(topicSearchesPerSession) => onPatch({ topicSearchesPerSession })}
          />
          <SliderField
            label="동일 주제 재검색 비율"
            value={input.repeatTopicRate}
            min={0}
            max={0.9}
            step={0.05}
            format={(v) => `${Math.round(v * 100)}%`}
            hint="재방문 시 코퍼스 히트 가중↑"
            onChange={(repeatTopicRate) => onPatch({ repeatTopicRate })}
          />
        </div>
      </section>

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
            hint="벡터 검색 404 → Gemini fallback"
            onChange={(manualCacheMissRate) => onPatch({ manualCacheMissRate })}
          />
        )}
        <p className={styles.fieldHint}>
          주제 매칭 {(d.topicMatchRate * 100).toFixed(1)}% · 얇은 히트(보충 필요){" "}
          {(d.thinHitRate * 100).toFixed(1)}% · 충분한 풀 {(d.usableHitRate * 100).toFixed(1)}%
        </p>
      </section>

      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>검색 풀 품질</h3>
        <p className={devStyles.helpText}>
          SSOT: 검색 결과 &lt; {input.minUsablePoolSize}문장이면 즉시 Gemini 보충 (
          <code>createTopicSlice</code>). 세션 중 풀 보충은 remaining ≤{" "}
          {TOPIC_POOL_REFILL_THRESHOLD} 고정. batch 코퍼스는 보통 1문장이라 매칭돼도 생성 비용 발생.
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
            label="Gemini 1회 생성 문장"
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
          검색당 Gemini {d.avgGeneratesPerSearch.toFixed(2)}회 · 월{" "}
          {Math.round(d.geminiCallsPerMonth).toLocaleString()} calls · {formatUsd(geminiUsd)}/mo
        </p>
      </section>

      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>유료화 (Free tier)</h3>
        <div className={styles.fieldGrid}>
          <SliderField
            label="무료 유저 검색 비중"
            value={input.freeTierSearchShare}
            min={0}
            max={1}
            step={0.05}
            format={(v) => `${Math.round(v * 100)}%`}
            hint={`무료 ${Math.round(d.freeTopicSearchesPerMonth).toLocaleString()} / Pro ${Math.round(d.proTopicSearchesPerMonth).toLocaleString()} 검색·월`}
            onChange={(freeTierSearchShare) => onPatch({ freeTierSearchShare })}
          />
          <SliderField
            label="무료 주제 검색 한도 / MAU·월"
            value={input.freeTopicSearchCapPerMauMonth}
            min={0}
            max={200}
            step={1}
            onChange={(freeTopicSearchCapPerMauMonth) => onPatch({ freeTopicSearchCapPerMauMonth })}
          />
          <SliderField
            label="무료 Gemini 생성 한도 / MAU·월"
            value={input.freeGeminiCapPerMauMonth}
            min={0}
            max={50}
            step={1}
            hint={
              d.freeGeminiBlockedPerMonth > 0
                ? `한도 초과 ${Math.round(d.freeGeminiBlockedPerMonth).toLocaleString()} calls 차단`
                : "한도 내 — 추가 차단 없음"
            }
            onChange={(freeGeminiCapPerMauMonth) => onPatch({ freeGeminiCapPerMauMonth })}
          />
        </div>
      </section>

      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>DB 호스팅</h3>
        <p className={devStyles.helpText}>
          플랫폼 스케일링 섹션에서 자동/수동 전환·Hetzner 단가를 조정합니다. 아래는 디스크
          기준·실측만 표시합니다.
        </p>
        {input.dbHosting === "auto" ? (
          <p className={styles.fieldHint}>
            적용:{" "}
            <strong>
              {d.resolvedDbHosting === "oracle_free" ? "OCI Always Free" : "Hetzner VPS"}
            </strong>
            {d.dbHostingAutoReason ? ` — ${d.dbHostingAutoReason}` : ""}
            {d.backend.migrationAction ? ` · ${d.backend.migrationAction}` : ""}
          </p>
        ) : null}
        {dbStats?.disk ? (
          <div className={styles.dbStats}>
            DB {dbStats.disk.databaseGb.toFixed(2)} GB
            {dbStats.usage?.pageCount != null
              ? ` · pages ${dbStats.usage.pageCount.toLocaleString()}`
              : ""}
            {dbStats.usage?.kbPerPageEstimate != null
              ? ` · ~${Math.round(dbStats.usage.kbPerPageEstimate)} KB/page`
              : ""}
            {dbStats.usage?.growthGbPer30d != null
              ? ` · 최근 30일 실측 +${dbStats.usage.growthGbPer30d.toFixed(2)} GB (시뮬 증분과 별도)`
              : ""}
          </div>
        ) : null}
        {input.dbHosting === "oracle_free" || input.dbHosting === "auto" ? (
          <>
            {input.dbHosting === "oracle_free" ? (
              <>
                <p className={devStyles.helpText}>
                  Oracle 무료 ARM VM에 Docker로 TimescaleDB self-host. compute·디스크 과금 $0 (
                  {ORACLE_FREE_TIER.storageGb}GB·{ORACLE_FREE_TIER.outboundTbPerMonth}TB 아웃바운드
                  포함).
                </p>
                <ul className={styles.specList}>
                  <li>
                    ARM {ORACLE_FREE_TIER.arm.ocpus} OCPU / {ORACLE_FREE_TIER.arm.ramGb} GB RAM
                  </li>
                  <li>
                    스토리지 {ORACLE_FREE_TIER.storageGb} GB · 아웃바운드{" "}
                    {ORACLE_FREE_TIER.outboundTbPerMonth} TB/월 · IPv4 {ORACLE_FREE_TIER.ipv4Count}
                    개
                  </li>
                </ul>
              </>
            ) : null}
            <NumberField
              label={
                dbStats?.disk ? "DB 디스크 기준 (GB) — DB 실측 자동 반영" : "DB 디스크 기준 (GB)"
              }
              value={input.dbDiskBaselineGb}
              min={1}
              max={ORACLE_FREE_TIER.storageGb}
              step={0.1}
              hint={
                d.oracleStorageMonthsToCap != null
                  ? `기준 ${d.dbDiskBaselineGb.toFixed(1)} GB · 증분 +${d.dbGrowthGbPerMonth.toFixed(2)} GB/mo → cap 약 ${d.oracleStorageMonthsToCap}개월`
                  : `기준 ${d.dbDiskBaselineGb.toFixed(1)} GB · 증분 +${d.dbGrowthGbPerMonth.toFixed(2)} GB/mo`
              }
              onChange={(dbDiskBaselineGb) => onPatch({ dbDiskBaselineGb })}
            />
          </>
        ) : (
          <p className={devStyles.helpText}>
            Hetzner VPS 고정 — 월 ₩{input.hetznerVpsMonthlyKrw.toLocaleString("ko-KR")} ( 플랫폼
            섹션에서 조정).
          </p>
        )}
      </section>

      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>API · 인프라 단가</h3>
        <div className={styles.fieldGrid}>
          <div className={styles.modeToggle}>
            {(Object.keys(GEMINI_PRICING) as Array<keyof typeof GEMINI_PRICING>).map((model) => (
              <button
                key={model}
                type="button"
                className={`${styles.modeButton} ${input.geminiModel === model ? styles.modeButtonActive : ""}`}
                onClick={() => onPatch({ geminiModel: model })}
              >
                {model.replace("gemini-", "")}
              </button>
            ))}
          </div>
          <NumberField
            label="Gemini input tok"
            value={input.geminiInputTokens}
            min={100}
            max={2000}
            hint={`out ${input.geminiOutputTokens} · SSOT ~${tokenEstimate.inputMin}/${tokenEstimate.inputMax}`}
            onChange={(geminiInputTokens) => onPatch({ geminiInputTokens })}
          />
          <NumberField
            label="Gemini output tok"
            value={input.geminiOutputTokens}
            min={100}
            max={3000}
            onChange={(geminiOutputTokens) => onPatch({ geminiOutputTokens })}
          />
          <SliderField
            label="Gemini 재시도 배율"
            value={input.geminiRetryMultiplier}
            min={1}
            max={1.3}
            step={0.01}
            format={(v) => `${v.toFixed(2)}×`}
            hint="429 backoff 등"
            onChange={(geminiRetryMultiplier) => onPatch({ geminiRetryMultiplier })}
          />
          <NumberField
            label="Upstage $/1M tok"
            value={input.upstageUsdPerMillion}
            min={0}
            max={5}
            step={0.1}
            hint="2026 Upstage 공개 요금 반영 (기본 $0.1)"
            onChange={(upstageUsdPerMillion) => onPatch({ upstageUsdPerMillion })}
          />
          <NumberField
            label="Upstage query tok"
            value={input.upstageQueryTokens}
            min={1}
            max={50}
            onChange={(upstageQueryTokens) => onPatch({ upstageQueryTokens })}
          />
          <button type="button" className={styles.applyDbButton} onClick={applySsotTokens}>
            SSOT 토큰 적용
          </button>
        </div>
      </section>

      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>Clerk (MRU)</h3>
        <div className={styles.fieldGrid}>
          <div className={styles.modeToggle}>
            <button
              type="button"
              className={`${styles.modeButton} ${!input.useClerkPro ? styles.modeButtonActive : ""}`}
              onClick={() => onPatch({ useClerkPro: false })}
            >
              Hobby (50k MRU)
            </button>
            <button
              type="button"
              className={`${styles.modeButton} ${input.useClerkPro ? styles.modeButtonActive : ""}`}
              onClick={() => onPatch({ useClerkPro: true })}
            >
              Pro $25/mo
            </button>
          </div>
          <SliderField
            label="로그인 비율"
            value={input.loginRate}
            min={0}
            max={1}
            step={0.05}
            format={(v) => `${Math.round(v * 100)}%`}
            hint="수익 탭과 동기화"
            onChange={(loginRate) => onPatchShared({ loginRate })}
          />
          <SliderField
            label="MRU 전환율"
            value={input.mruConversionRate}
            min={0}
            max={1}
            step={0.05}
            format={(v) => `${Math.round(v * 100)}%`}
            hint={`MRU ${d.clerkMru.toLocaleString()}명`}
            onChange={(mruConversionRate) => onPatch({ mruConversionRate })}
          />
          <NumberField
            label="포함 MRU"
            value={input.clerkIncludedMru}
            min={0}
            max={100_000}
            step={1000}
            hint="Hobby·Pro 공통 50,000 (2026 Clerk)"
            onChange={(clerkIncludedMru) => onPatch({ clerkIncludedMru })}
          />
          <NumberField
            label="초과 MRU $"
            value={input.clerkOveragePerMru}
            min={0}
            max={0.1}
            step={0.005}
            hint="Pro 플랜에서 50,001~100,000 구간 적용 (기본 $0.02)"
            onChange={(clerkOveragePerMru) => onPatch({ clerkOveragePerMru })}
          />
        </div>
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
    </div>
  );
}
