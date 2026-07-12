"use client";

import {
  OPENAI_PRICING,
  GCP_FREE_TIER,
  type CostSimulationInput,
  type CostSimulationResult,
  type TopicLlmTokenEstimate,
} from "@/lib/dev/costSimulation";
import type { DbCostStats } from "@/lib/dev/costStats";

import devStyles from "@/app/dev/dev.module.css";
import { NumberField, SliderField } from "@/components/dev/DevSimFields";
import styles from "../DevCostSimulationPanel.module.css";

interface CostInfraSectionProps {
  input: CostSimulationInput;
  result: CostSimulationResult;
  dbStats: DbCostStats | null;
  tokenEstimate: TopicLlmTokenEstimate;
  onPatch: (partial: Partial<CostSimulationInput>) => void;
}

export function CostInfraSection({
  input,
  result,
  dbStats,
  tokenEstimate,
  onPatch,
}: CostInfraSectionProps) {
  const d = result.derived;

  const applySsotTokens = () => {
    onPatch({
      topicLlmInputTokens: Math.round((tokenEstimate.inputMin + tokenEstimate.inputMax) / 2),
      topicLlmOutputTokens: tokenEstimate.output,
    });
  };

  return (
    <>
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
              {d.resolvedDbHosting === "gcp_free" ? "GCP Always Free" : "Hetzner VPS"}
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
        {input.dbHosting === "gcp_free" || input.dbHosting === "auto" ? (
          <>
            {input.dbHosting === "gcp_free" ? (
              <>
                <p className={devStyles.helpText}>
                  GCP e2-micro 무료 티어에 Docker로 PostgreSQL self-host. compute·디스크 과금 $0 (
                  {GCP_FREE_TIER.storageGb}GB·{GCP_FREE_TIER.outboundGbPerMonth}GB 아웃바운드
                  포함).
                </p>
                <ul className={styles.specList}>
                  <li>
                    e2-micro {GCP_FREE_TIER.vcpus} vCPU / {GCP_FREE_TIER.ramGb} GB RAM
                  </li>
                  <li>
                    스토리지 {GCP_FREE_TIER.storageGb} GB · 아웃바운드{" "}
                    {GCP_FREE_TIER.outboundGbPerMonth} GB/월
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
              max={GCP_FREE_TIER.storageGb}
              step={0.1}
              hint={
                d.gcpStorageMonthsToCap != null
                  ? `기준 ${d.dbDiskBaselineGb.toFixed(1)} GB · 증분 +${d.dbGrowthGbPerMonth.toFixed(2)} GB/mo → cap 약 ${d.gcpStorageMonthsToCap}개월`
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
          <p className={devStyles.helpText}>
            OpenAI 모델: <code>{input.topicLlmModel}</code> — input $
            {OPENAI_PRICING[input.topicLlmModel].input}
            /1M · output ${OPENAI_PRICING[input.topicLlmModel].output}/1M tokens
          </p>
          <NumberField
            label="OpenAI input tok"
            value={input.topicLlmInputTokens}
            min={100}
            max={2000}
            hint={`out ${input.topicLlmOutputTokens} · SSOT ~${tokenEstimate.inputMin}/${tokenEstimate.inputMax}`}
            onChange={(topicLlmInputTokens) => onPatch({ topicLlmInputTokens })}
          />
          <NumberField
            label="OpenAI output tok"
            value={input.topicLlmOutputTokens}
            min={100}
            max={3000}
            onChange={(topicLlmOutputTokens) => onPatch({ topicLlmOutputTokens })}
          />
          <SliderField
            label="OpenAI 재시도 배율"
            value={input.topicLlmRetryMultiplier}
            min={1}
            max={1.3}
            step={0.01}
            format={(v) => `${v.toFixed(2)}×`}
            hint="429 backoff 등"
            onChange={(topicLlmRetryMultiplier) => onPatch({ topicLlmRetryMultiplier })}
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
    </>
  );
}
