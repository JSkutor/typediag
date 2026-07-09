"use client";

import type {
  CostSimulationInput,
  CostSimulationResult,
  TopicLlmTokenEstimate,
} from "@/lib/dev/costSimulation";
import type { DbCostStats } from "@/lib/dev/costStats";

import { CostCorpusSection } from "./CostCorpusSection";
import { CostInfraSection } from "./CostInfraSection";
import { CostMonetizationSection } from "./CostMonetizationSection";
import { CostSearchPoolSection } from "./CostSearchPoolSection";
import { CostUsageSection } from "./CostUsageSection";

import styles from "../DevCostSimulationPanel.module.css";

interface DevCostSectionProps {
  input: CostSimulationInput;
  result: CostSimulationResult;
  dbStats: DbCostStats | null;
  dbError: string | null;
  tokenEstimate: TopicLlmTokenEstimate;
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
  return (
    <div className={styles.paneSections}>
      <CostUsageSection input={input} result={result} onPatch={onPatch} />

      <CostCorpusSection
        input={input}
        result={result}
        dbStats={dbStats}
        dbError={dbError}
        onPatch={onPatch}
      />

      <CostSearchPoolSection input={input} result={result} dbStats={dbStats} onPatch={onPatch} />

      <CostMonetizationSection
        input={input}
        result={result}
        onPatch={onPatch}
        onPatchShared={onPatchShared}
      />

      <CostInfraSection
        input={input}
        result={result}
        dbStats={dbStats}
        tokenEstimate={tokenEstimate}
        onPatch={onPatch}
      />
    </div>
  );
}
