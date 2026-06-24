"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

import {
  DEFAULT_COST_SIMULATION,
  estimateTopicGeminiTokens,
  formatKrw,
  formatUsd,
  mauToSlider,
  runCostSimulation,
  sliderToMau,
  type CostSimulationInput,
} from "@/lib/dev/costSimulation";
import type { DbCostStats } from "@/lib/dev/costStats";
import {
  DEFAULT_REVENUE_SIMULATION,
  runRevenueSimulation,
  runUnitEconomics,
  type RevenueSimulationInput,
} from "@/lib/dev/revenueSimulation";

import devStyles from "@/app/dev/dev.module.css";
import { DevCostSection } from "@/components/dev/DevCostSection";
import { DevPlatformSection } from "@/components/dev/DevPlatformSection";
import { DevRevenueSection } from "@/components/dev/DevRevenueSection";
import { BreakdownList, MauField, NumberField } from "@/components/dev/DevSimFields";
import styles from "./DevCostSimulationPanel.module.css";

type SharedSimFields = Pick<CostSimulationInput, "mau" | "usdToKrw" | "loginRate">;

export function DevUnitEconomicsPanel() {
  const [costInput, setCostInput] = useState(DEFAULT_COST_SIMULATION);
  const [revenueInput, setRevenueInput] = useState(DEFAULT_REVENUE_SIMULATION);
  const [dbStats, setDbStats] = useState<DbCostStats | null>(null);
  const [dbError, setDbError] = useState<string | null>(null);

  const tokenEstimate = useMemo(() => estimateTopicGeminiTokens(), []);

  const patchCost = useCallback((partial: Partial<CostSimulationInput>) => {
    setCostInput((prev) => ({ ...prev, ...partial }));
  }, []);

  const patchRevenue = useCallback((partial: Partial<RevenueSimulationInput>) => {
    setRevenueInput((prev) => ({ ...prev, ...partial }));
  }, []);

  const patchShared = useCallback((partial: Partial<SharedSimFields>) => {
    setCostInput((prev) => ({ ...prev, ...partial }));
    setRevenueInput((prev) => ({ ...prev, ...partial }));
  }, []);

  const costResult = useMemo(
    () =>
      runCostSimulation(costInput, {
        actualDiskGb: dbStats?.disk?.databaseGb ?? null,
      }),
    [costInput, dbStats?.disk?.databaseGb],
  );
  const revenueResult = useMemo(() => runRevenueSimulation(revenueInput), [revenueInput]);
  const pnl = useMemo(
    () =>
      runUnitEconomics(costResult.totalUsd, costInput.mau, revenueResult, costInput.usdToKrw, {
        fixedCostUsd: costResult.fixedCostUsd,
        variableCostUsd: costResult.variableCostUsd,
        items: costResult.items,
      }),
    [costResult, costInput.mau, costInput.usdToKrw, revenueResult],
  );

  const maxCostUsd = Math.max(...costResult.items.map((i) => i.usd), 0.01);
  const maxRevenueUsd = Math.max(...revenueResult.items.map((i) => Math.abs(i.usd)), 0.01);

  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch("/api/dev/cost-stats");
        const data = (await res.json()) as DbCostStats;
        if (!res.ok) {
          setDbError(data.error ?? "DB 조회 실패");
          if (data.batchMetadata) setDbStats(data);
          return;
        }
        setDbStats(data);
        setDbError(null);
        const disk = data.disk;
        const usage = data.usage;
        if (disk?.databaseGb != null && disk.databaseGb > 0) {
          setCostInput((prev) => ({
            ...prev,
            dbDiskBaselineGb: Math.max(1, Math.round(disk.databaseGb * 10) / 10),
            ...(usage?.kbPerPageEstimate != null && usage.kbPerPageEstimate > 0
              ? { kbPerPage: Math.round(usage.kbPerPageEstimate) }
              : {}),
          }));
        }
      } catch {
        setDbError("DB에 연결할 수 없습니다.");
      }
    })();
  }, []);

  return (
    <>
      <nav className={devStyles.devNav}>
        <Link href="/dev" className={devStyles.devNavLink}>
          ← Dev 홈
        </Link>
      </nav>

      <div className={styles.economicsTop}>
        <section className={styles.sharedScale}>
          <h2 className={styles.sectionTitle}>공통 규모</h2>
          <div className={styles.sharedScaleGrid}>
            <MauField
              value={costInput.mau}
              onChange={(mau) => patchShared({ mau })}
              mauToSlider={mauToSlider}
              sliderToMau={sliderToMau}
            />
            <NumberField
              label="USD → KRW"
              value={costInput.usdToKrw}
              min={1000}
              max={2000}
              step={10}
              onChange={(usdToKrw) => patchShared({ usdToKrw })}
            />
          </div>
        </section>

        <section
          className={`${styles.pnlCard} ${pnl.profitUsd >= 0 ? styles.pnlPositive : styles.pnlNegative}`}
        >
          <span className={styles.pnlLabel}>월간 손익 (Net 수익 − 비용)</span>
          <div className={styles.pnlRow}>
            <div className={styles.pnlBlock}>
              <span className={styles.pnlBlockLabel}>순수익</span>
              <span className={styles.pnlBlockValue}>{formatUsd(revenueResult.netUsd)}</span>
              <span className={styles.pnlBlockSub}>{formatKrw(pnl.revenueNetKrw)}</span>
            </div>
            <span className={styles.pnlOperator}>−</span>
            <div className={styles.pnlBlock}>
              <span className={styles.pnlBlockLabel}>비용</span>
              <span className={styles.pnlBlockValue}>{formatUsd(pnl.costUsd)}</span>
              <span className={styles.pnlBlockSub}>{formatKrw(pnl.costKrw)}</span>
            </div>
            <span className={styles.pnlOperator}>=</span>
            <div className={styles.pnlBlock}>
              <span className={styles.pnlBlockLabel}>이익</span>
              <span className={styles.pnlProfitValue}>{formatUsd(pnl.profitUsd)}</span>
              <span className={styles.pnlBlockSub}>{formatKrw(pnl.profitKrw)}</span>
            </div>
          </div>
          <p className={styles.pnlMeta}>
            MAU {costInput.mau.toLocaleString()} · 이익/MAU {formatUsd(pnl.profitPerMauUsd)} ·
            순이익률 {(pnl.marginOnNetRevenue * 100).toFixed(1)}%
            {pnl.breakEvenMau != null
              ? ` · 손익분기 MAU ≈ ${pnl.breakEvenMau.toLocaleString()}`
              : ""}
          </p>
        </section>
      </div>

      <DevPlatformSection input={costInput} result={costResult} onPatch={patchCost} />

      <div className={styles.economicsBody}>
        <div className={styles.costColumn}>
          <header className={styles.paneHeader}>
            <h2 className={styles.paneTitle}>비용</h2>
            <span className={styles.paneTotal}>{formatUsd(costResult.totalUsd)}/mo</span>
          </header>
          <section className={styles.section}>
            <h3 className={styles.sectionTitle}>비용 breakdown</h3>
            <BreakdownList items={costResult.items} maxUsd={maxCostUsd} />
          </section>
          <DevCostSection
            input={costInput}
            result={costResult}
            dbStats={dbStats}
            dbError={dbError}
            tokenEstimate={tokenEstimate}
            onPatch={patchCost}
            onPatchShared={patchShared}
          />
        </div>

        <div className={styles.revenueColumn}>
          <header className={styles.paneHeader}>
            <h2 className={styles.paneTitle}>수익</h2>
            <span className={styles.paneTotal}>{formatUsd(revenueResult.netUsd)}/mo net</span>
          </header>
          <DevRevenueSection
            input={revenueInput}
            onPatch={patchRevenue}
            onPatchShared={patchShared}
          />
          <section className={styles.section}>
            <h3 className={styles.sectionTitle}>수익 breakdown</h3>
            <BreakdownList items={revenueResult.items} maxUsd={maxRevenueUsd} />
            <p className={styles.fieldHint}>
              유료 {revenueResult.derived.payingSubscribers.toLocaleString()}명 · 블렌디드 ARPU{" "}
              {formatUsd(revenueResult.derived.blendedArpuUsd)} · Stripe{" "}
              {formatUsd(revenueResult.derived.stripeFeesUsd)}
            </p>
          </section>
        </div>
      </div>
    </>
  );
}
