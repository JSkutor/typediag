"use client";

import { type CostSimulationInput, type CostSimulationResult } from "@/lib/dev/costSimulation";

import { SliderField } from "@/components/dev/DevSimFields";
import styles from "../DevCostSimulationPanel.module.css";

interface CostUsageSectionProps {
  input: CostSimulationInput;
  result: CostSimulationResult;
  onPatch: (partial: Partial<CostSimulationInput>) => void;
}

export function CostUsageSection({ input, result, onPatch }: CostUsageSectionProps) {
  const d = result.derived;

  return (
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
  );
}
