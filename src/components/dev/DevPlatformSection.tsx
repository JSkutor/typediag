"use client";

import { CLOUDFLARE_PAGES, HETZNER_VPS, PLATFORM_STAGE_SPECS } from "@/lib/dev/platformScaling";
import {
  formatKrw,
  formatUsd,
  type CostSimulationInput,
  type CostSimulationResult,
} from "@/lib/dev/costSimulation";

import devStyles from "@/app/dev/dev.module.css";
import { NumberField } from "@/components/dev/DevSimFields";
import styles from "./DevCostSimulationPanel.module.css";

interface DevPlatformSectionProps {
  input: CostSimulationInput;
  result: CostSimulationResult;
  onPatch: (partial: Partial<CostSimulationInput>) => void;
}

function StageBadge({
  active,
  migrated,
  label,
}: {
  active: boolean;
  migrated?: boolean;
  label: string;
}) {
  const className = migrated
    ? styles.platformBadgeMigrated
    : active
      ? styles.platformBadgeActive
      : styles.platformBadgeIdle;
  return <span className={className}>{label}</span>;
}

export function DevPlatformSection({ input, result, onPatch }: DevPlatformSectionProps) {
  const { frontend, backend } = result.derived;
  const frontendMigrated = frontend.stage === "paid" && input.frontendHosting === "auto";
  const backendMigrated = backend.hosting !== "oracle_free" && input.dbHosting === "auto";

  return (
    <section className={styles.platformSection}>
      <div className={styles.platformHeader}>
        <h2 className={styles.sectionTitle}>플랫폼 스케일링 전략</h2>
        <p className={devStyles.helpText}>
          MAU·SSR·RPS 한계에 따라 Cloudflare 플랜 업그레이드 / OCI → Hetzner DB 이전을 자동
          시뮬레이션합니다.
        </p>
      </div>

      <div className={styles.platformBody}>
        <div className={styles.platformStatusGrid}>
          <div className={styles.platformStatusCard}>
            <div className={styles.platformStatusHead}>
              <span className={styles.platformStatusTitle}>Frontend</span>
              <StageBadge
                active={frontend.stage === "free"}
                migrated={frontendMigrated}
                label={
                  frontendMigrated
                    ? "플랜 업그레이드됨"
                    : frontend.stage === "paid"
                      ? "Paid"
                      : "Free"
                }
              />
            </div>
            <p className={styles.platformStatusMetric}>
              일 SSR {Math.round(frontend.dailySsrCalls).toLocaleString()} /{" "}
              {CLOUDFLARE_PAGES.freeDailySsrLimit.toLocaleString()}
            </p>
            <p className={styles.platformStatusCost}>
              {frontend.monthlyUsd > 0 ? `${formatUsd(frontend.monthlyUsd)}/mo` : "$0 (Free)"}
            </p>
            {frontend.migrationAction ? (
              <p className={styles.platformMigration}>{frontend.migrationAction}</p>
            ) : null}
            {frontend.autoReason && input.frontendHosting === "auto" ? (
              <p className={styles.fieldHint}>{frontend.autoReason}</p>
            ) : null}
          </div>

          <div className={styles.platformStatusCard}>
            <div className={styles.platformStatusHead}>
              <span className={styles.platformStatusTitle}>Backend & DB</span>
              <StageBadge
                active={backend.hosting === "oracle_free"}
                migrated={backendMigrated}
                label={
                  backendMigrated
                    ? "DB 이전됨"
                    : backend.hosting === "oracle_free"
                      ? "OCI Free"
                      : backend.tierName
                }
              />
            </div>
            <p className={styles.platformStatusMetric}>
              쓰기 RPS {backend.avgWriteRps.toFixed(1)} (임계:{" "}
              {backend.hosting === "oracle_free"
                ? 100
                : backend.hosting === "hetzner_cx23"
                  ? 50
                  : backend.hosting === "hetzner_ccx23"
                    ? 300
                    : "무제한"}{" "}
              RPS)
            </p>
            <p className={styles.platformStatusCost}>
              {backend.monthlyUsd > 0 ? (
                <>
                  {formatUsd(backend.monthlyUsd + backend.additionalVolumeUsd)}/mo
                  <span
                    className={styles.fieldHint}
                    style={{ marginLeft: "6px", display: "inline-block" }}
                  >
                    (서버 {formatKrw(backend.monthlyKrw)}
                    {backend.additionalVolumeGb > 0
                      ? ` + 볼륨 ${formatKrw(backend.additionalVolumeKrw)}`
                      : ""}
                    )
                  </span>
                </>
              ) : (
                "$0 (OCI Free)"
              )}
            </p>
            {backend.migrationAction ? (
              <p className={styles.platformMigration}>{backend.migrationAction}</p>
            ) : null}
            {backend.autoReason && input.dbHosting === "auto" ? (
              <p className={styles.fieldHint}>{backend.autoReason}</p>
            ) : null}
          </div>
        </div>

        <div className={styles.fieldGrid}>
          <div className={styles.modeToggle}>
            <button
              type="button"
              className={`${styles.modeButton} ${input.frontendHosting === "auto" ? styles.modeButtonActive : ""}`}
              onClick={() => onPatch({ frontendHosting: "auto" })}
            >
              Frontend 자동
            </button>
            <button
              type="button"
              className={`${styles.modeButton} ${input.frontendHosting === "free" ? styles.modeButtonActive : ""}`}
              onClick={() => onPatch({ frontendHosting: "free" })}
            >
              Free 고정
            </button>
            <button
              type="button"
              className={`${styles.modeButton} ${input.frontendHosting === "paid" ? styles.modeButtonActive : ""}`}
              onClick={() => onPatch({ frontendHosting: "paid" })}
            >
              Paid 고정
            </button>
          </div>
          <div
            className={styles.modeToggle}
            style={{ gridColumn: "span 2", display: "flex", flexWrap: "wrap", gap: "4px" }}
          >
            <button
              type="button"
              className={`${styles.modeButton} ${input.dbHosting === "auto" ? styles.modeButtonActive : ""}`}
              onClick={() => onPatch({ dbHosting: "auto" })}
            >
              DB 자동
            </button>
            <button
              type="button"
              className={`${styles.modeButton} ${input.dbHosting === "oracle_free" ? styles.modeButtonActive : ""}`}
              onClick={() => onPatch({ dbHosting: "oracle_free" })}
            >
              OCI Free 고정
            </button>
            <button
              type="button"
              className={`${styles.modeButton} ${input.dbHosting === "hetzner_cx23" ? styles.modeButtonActive : ""}`}
              onClick={() => onPatch({ dbHosting: "hetzner_cx23" })}
            >
              CX23 고정 (Shared)
            </button>
            <button
              type="button"
              className={`${styles.modeButton} ${input.dbHosting === "hetzner_ccx23" ? styles.modeButtonActive : ""}`}
              onClick={() => onPatch({ dbHosting: "hetzner_ccx23" })}
            >
              CCX23 고정 (Dedicated)
            </button>
            <button
              type="button"
              className={`${styles.modeButton} ${input.dbHosting === "hetzner_ccx33" ? styles.modeButtonActive : ""}`}
              onClick={() => onPatch({ dbHosting: "hetzner_ccx33" })}
            >
              CCX33 고정 (Dedicated)
            </button>
          </div>
          <NumberField
            label="Cloudflare Paid $/mo"
            value={input.cloudflarePagesPaidMonthlyUsd}
            min={0}
            max={50}
            step={1}
            hint={`MAU > ${CLOUDFLARE_PAGES.mauUpgradeThreshold.toLocaleString()} 또는 일 SSR > ${CLOUDFLARE_PAGES.freeDailySsrLimit.toLocaleString()}`}
            onChange={(cloudflarePagesPaidMonthlyUsd) => onPatch({ cloudflarePagesPaidMonthlyUsd })}
          />
          <NumberField
            label="추가 볼륨 단가 ₩/GB"
            value={HETZNER_VPS.volumePriceKrwPerGb}
            min={10}
            max={500}
            step={5}
            hint={`기본제공 SSD 초과 시 적용 (현재: GB당 ₩70)`}
            disabled={true}
          />
          <NumberField
            label="SSR 호출 / page view"
            value={input.ssrCallsPerPageView}
            min={0.5}
            max={5}
            step={0.1}
            hint={`Next.js SSR 및 API 라우트 호출 가중치 (기본 1.5) · 일 SSR ≈ ${Math.round(result.derived.dailySsrCalls).toLocaleString()}회`}
            onChange={(ssrCallsPerPageView) => onPatch({ ssrCallsPerPageView })}
          />
          <NumberField
            label="key_events / page"
            value={input.keyEventsPerPage}
            min={10}
            max={200}
            step={5}
            hint={`페이지 완주 시 저장될 키 이벤트 수 (기본 40) · 평균 쓰기 RPS ${result.derived.avgWriteRps.toFixed(1)}`}
            onChange={(keyEventsPerPage) => onPatch({ keyEventsPerPage })}
          />
        </div>

        <div className={styles.platformInfo}>
          <div className={styles.platformTableWrap}>
            <table className={styles.platformTable}>
              <thead>
                <tr>
                  <th>플랫폼</th>
                  <th>1단계 · 초기 (무료)</th>
                  <th>2단계 · 한계 도달</th>
                  <th>3단계 · 대응</th>
                </tr>
              </thead>
              <tbody>
                {PLATFORM_STAGE_SPECS.map((row) => (
                  <tr key={row.id}>
                    <td className={styles.platformTablePlatform}>{row.platform}</td>
                    <td>{row.stage1}</td>
                    <td>{row.stage2}</td>
                    <td>{row.stage3}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </section>
  );
}
