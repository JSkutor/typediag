"use client";

import { type CostSimulationInput, type CostSimulationResult } from "@/lib/dev/costSimulation";

import devStyles from "@/app/dev/dev.module.css";
import { NumberField, SliderField } from "@/components/dev/DevSimFields";
import styles from "../DevCostSimulationPanel.module.css";

interface CostMonetizationSectionProps {
  input: CostSimulationInput;
  result: CostSimulationResult;
  onPatch: (partial: Partial<CostSimulationInput>) => void;
  onPatchShared: (partial: Pick<CostSimulationInput, "loginRate">) => void;
}

export function CostMonetizationSection({
  input,
  result,
  onPatch,
  onPatchShared,
}: CostMonetizationSectionProps) {
  const d = result.derived;

  return (
    <>
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
            label="무료 OpenAI 생성 한도 / MAU·월"
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
    </>
  );
}
