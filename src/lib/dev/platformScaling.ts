/** Oracle Cloud Infrastructure Always Free — ARM VM for self-hosted TimescaleDB. */
export const ORACLE_FREE_TIER = {
  arm: { ocpus: 2, ramGb: 12 },
  amd: { ocpus: 0.125, ramGb: 1, maxInstances: 2 },
  storageGb: 200,
  outboundTbPerMonth: 10,
  ipv4Count: 1,
} as const;

/** Cloudflare Pages — Next.js SSR / Edge 호스팅 SSOT. */
export const CLOUDFLARE_PAGES = {
  /** Free tier daily Edge/SSR invocation cap. */
  freeDailySsrLimit: 100_000,
  paidMonthlyUsd: 5,
  /** MAU above this → paid plan assumed in auto mode. */
  mauUpgradeThreshold: 10_000,
  estimatedMauAtLimit: { min: 5_000, max: 10_000 },
  commercialUseFree: true,
  unlimitedBandwidth: true,
} as const;

/** Hetzner (or similar) cost-effective VPS for self-hosted TimescaleDB. */
export const HETZNER_VPS = {
  volumePriceUsdPerGb: 0.05, // €0.044/GB/mo 환산
  volumePriceKrwPerGb: 70, // Hetzner 볼륨 단가 (환율 변동 시 시뮬 `usdToKrw`로 USD 환산)
  tiers: {
    cx23: {
      id: "hetzner_cx23",
      name: "Hetzner CX23 (Shared)",
      vcpus: 2,
      ramGb: 4,
      ssdGb: 40,
      monthlyKrw: 7_000,
      maxRps: 50,
      maxMau: 10_000,
    },
    ccx23: {
      id: "hetzner_ccx23",
      name: "Hetzner CCX23 (Dedicated)",
      vcpus: 4,
      ramGb: 16,
      ssdGb: 160,
      monthlyKrw: 38_000,
      maxRps: 300,
      maxMau: 100_000,
    },
    ccx33: {
      id: "hetzner_ccx33",
      name: "Hetzner CCX33 (Dedicated)",
      vcpus: 8,
      ramGb: 32,
      ssdGb: 240,
      monthlyKrw: 84_000,
      maxRps: 999999,
      maxMau: 99999999,
    },
  },
  migrationSteps: ["pg_dump 백업", "VPS로 복원", "Cloudflare env DB 주소 변경"] as const,
} as const;

export type FrontendHostingStage = "free" | "paid";
export type ResolvedDbHosting = "oracle_free" | "hetzner_cx23" | "hetzner_ccx23" | "hetzner_ccx33";
export type DbHostingMode =
  | "auto"
  | "oracle_free"
  | "hetzner_vps"
  | "hetzner_cx23"
  | "hetzner_ccx23"
  | "hetzner_ccx33";

export interface PlatformStageSpec {
  id: string;
  platform: string;
  stage1: string;
  stage2: string;
  stage3: string;
}

/** UI summary table — mirrors infra decision doc. */
export const PLATFORM_STAGE_SPECS: PlatformStageSpec[] = [
  {
    id: "frontend",
    platform: "Frontend (Cloudflare Pages)",
    stage1: "무료 상업 이용 · 무제한 트래픽/대역폭 · Edge SSR 일 10만 호출",
    stage2: `적정 MAU ${CLOUDFLARE_PAGES.estimatedMauAtLimit.min.toLocaleString()}~${CLOUDFLARE_PAGES.estimatedMauAtLimit.max.toLocaleString()} · 일 SSR > ${CLOUDFLARE_PAGES.freeDailySsrLimit.toLocaleString()}회`,
    stage3: `물리 마이그레이션 없음 · 대시보드 $${CLOUDFLARE_PAGES.paidMonthlyUsd}/mo 플랜 업그레이드 · 코드 변경 0%`,
  },
  {
    id: "backend",
    platform: "Backend & DB (OCI Free + Docker TimescaleDB)",
    stage1: `ARM ${ORACLE_FREE_TIER.arm.ocpus} OCPU / ${ORACLE_FREE_TIER.arm.ramGb}GB RAM · 스토리지 ${ORACLE_FREE_TIER.storageGb}GB · 아웃바운드 ${ORACLE_FREE_TIER.outboundTbPerMonth}TB/월`,
    stage2: `적정 MAU 20,000 · 쓰기 RPS > 100 · 버퍼 캐시(RAM) 부족 · 스토리지 ${ORACLE_FREE_TIER.storageGb}GB 한도 도달`,
    stage3: `Hetzner Cloud VPS 스케일링 (CX23 ₩7k → CCX23 ₩38k → CCX33 ₩84k) · 초과 스토리지 GB당 ₩70 추가 · pg_dump 복원`,
  },
];

export interface FrontendScalingInput {
  mau: number;
  sessionsPerMonth: number;
  pagesPerSession: number;
  /** SSR/Edge invocations per page view (navigation + API route). */
  ssrCallsPerPageView: number;
  mode: "auto" | FrontendHostingStage;
  paidMonthlyUsd: number;
}

export interface FrontendScalingResult {
  stage: FrontendHostingStage;
  dailySsrCalls: number;
  monthlyUsd: number;
  autoReason: string | null;
  migrationAction: string | null;
  effort: string;
}

export interface DbScalingInput {
  mau: number;
  sessionsPerMonth: number;
  pagesPerSession: number;
  keyEventsPerPage: number;
  baselineGb: number;
  growthGbPerMonth: number;
  mode: DbHostingMode;
  hetznerMonthlyKrw: number;
  usdToKrw: number;
}

export interface DbScalingResult {
  hosting: ResolvedDbHosting;
  avgWriteRps: number;
  monthlyUsd: number;
  monthlyKrw: number;
  autoReason: string | null;
  migrationAction: string | null;
  effort: string;
  oracleStorageCapGb: number | null;
  oracleStorageMonthsToCap: number | null;
  additionalVolumeGb: number;
  additionalVolumeUsd: number;
  additionalVolumeKrw: number;
  vcpus: number;
  ramGb: number;
  ssdGb: number;
  tierName: string;
}

export function estimateDailySsrCalls(input: {
  mau: number;
  sessionsPerMonth: number;
  pagesPerSession: number;
  ssrCallsPerPageView: number;
}): number {
  const monthlyViews = input.mau * input.sessionsPerMonth * input.pagesPerSession;
  return (monthlyViews / 30) * Math.max(0, input.ssrCallsPerPageView);
}

/** Average write RPS from key_events persistence (pages × events/page). */
export function estimateAvgWriteRps(input: {
  mau: number;
  sessionsPerMonth: number;
  pagesPerSession: number;
  keyEventsPerPage: number;
}): number {
  const monthlyWrites =
    input.mau *
    input.sessionsPerMonth *
    input.pagesPerSession *
    Math.max(1, input.keyEventsPerPage);
  return monthlyWrites / (30 * 24 * 3600);
}

export function resolveFrontendHosting(input: FrontendScalingInput): FrontendScalingResult {
  const dailySsrCalls = estimateDailySsrCalls(input);

  if (input.mode === "free") {
    return {
      stage: "free",
      dailySsrCalls,
      monthlyUsd: 0,
      autoReason: null,
      migrationAction: null,
      effort: "0% — Free tier",
    };
  }
  if (input.mode === "paid") {
    return {
      stage: "paid",
      dailySsrCalls,
      monthlyUsd: input.paidMonthlyUsd,
      autoReason: null,
      migrationAction: null,
      effort: "0% — 이미 Paid 플랜",
    };
  }

  const overSsr = dailySsrCalls > CLOUDFLARE_PAGES.freeDailySsrLimit;
  const overMau = input.mau > CLOUDFLARE_PAGES.mauUpgradeThreshold;

  if (overSsr || overMau) {
    const triggers: string[] = [];
    if (overMau) {
      triggers.push(
        `MAU ${input.mau.toLocaleString()} > ${CLOUDFLARE_PAGES.mauUpgradeThreshold.toLocaleString()}`,
      );
    }
    if (overSsr) {
      triggers.push(
        `일 SSR ${Math.round(dailySsrCalls).toLocaleString()} > ${CLOUDFLARE_PAGES.freeDailySsrLimit.toLocaleString()}`,
      );
    }
    return {
      stage: "paid",
      dailySsrCalls,
      monthlyUsd: input.paidMonthlyUsd,
      autoReason: triggers.join(" · "),
      migrationAction: `Cloudflare Pages $${input.paidMonthlyUsd}/mo 플랜 업그레이드 (대시보드만)`,
      effort: "0% — 코드·마이그레이션 없음",
    };
  }

  return {
    stage: "free",
    dailySsrCalls,
    monthlyUsd: 0,
    autoReason: `일 SSR ${Math.round(dailySsrCalls).toLocaleString()} / ${CLOUDFLARE_PAGES.freeDailySsrLimit.toLocaleString()} · MAU ${input.mau.toLocaleString()}`,
    migrationAction: null,
    effort: "0% — Free tier",
  };
}

export function resolveDbHostingScaled(input: DbScalingInput): DbScalingResult {
  const cap = ORACLE_FREE_TIER.storageGb;
  const avgWriteRps = estimateAvgWriteRps(input);
  const headroom = Math.max(0, cap - input.baselineGb);
  const monthsToCap =
    input.growthGbPerMonth > 0 ? Math.floor(headroom / input.growthGbPerMonth) : null;

  // Helpers to select tier specs
  const getTierSpecs = (tierKey: keyof typeof HETZNER_VPS.tiers) => {
    const t = HETZNER_VPS.tiers[tierKey];
    const addGb = Math.max(0, input.baselineGb - t.ssdGb);
    const addUsd = addGb * HETZNER_VPS.volumePriceUsdPerGb;
    const addKrw = addGb * HETZNER_VPS.volumePriceKrwPerGb;
    return {
      monthlyKrw: t.monthlyKrw,
      monthlyUsd: t.monthlyKrw / input.usdToKrw,
      additionalVolumeGb: addGb,
      additionalVolumeUsd: addUsd,
      additionalVolumeKrw: addKrw,
      vcpus: t.vcpus,
      ramGb: t.ramGb,
      ssdGb: t.ssdGb,
      tierName: t.name,
    };
  };

  const oracleResult = (
    autoReason: string | null,
    migrationAction: string | null,
  ): DbScalingResult => ({
    hosting: "oracle_free",
    avgWriteRps,
    monthlyUsd: 0,
    monthlyKrw: 0,
    autoReason,
    migrationAction,
    effort: "0% — OCI Always Free",
    oracleStorageCapGb: cap,
    oracleStorageMonthsToCap: monthsToCap,
    additionalVolumeGb: 0,
    additionalVolumeUsd: 0,
    additionalVolumeKrw: 0,
    vcpus: ORACLE_FREE_TIER.arm.ocpus,
    ramGb: ORACLE_FREE_TIER.arm.ramGb,
    ssdGb: cap,
    tierName: "Oracle ARM Free VM",
  });

  const hetznerResult = (
    tierKey: keyof typeof HETZNER_VPS.tiers,
    autoReason: string | null,
    migrationAction: string,
  ): DbScalingResult => {
    const specs = getTierSpecs(tierKey);
    return {
      hosting: HETZNER_VPS.tiers[tierKey].id as ResolvedDbHosting,
      avgWriteRps,
      monthlyUsd: specs.monthlyUsd,
      monthlyKrw: specs.monthlyKrw,
      autoReason,
      migrationAction,
      effort: "DB만 이전 — pg_dump · VPS 복원 · env DATABASE_URL",
      oracleStorageCapGb: null,
      oracleStorageMonthsToCap: null,
      additionalVolumeGb: specs.additionalVolumeGb,
      additionalVolumeUsd: specs.additionalVolumeUsd,
      additionalVolumeKrw: specs.additionalVolumeKrw,
      vcpus: specs.vcpus,
      ramGb: specs.ramGb,
      ssdGb: specs.ssdGb,
      tierName: specs.tierName,
    };
  };

  // Manual configuration overrides
  if (input.mode === "oracle_free") {
    return oracleResult(null, null);
  }
  if (input.mode === "hetzner_cx23") {
    return hetznerResult("cx23", null, "Hetzner CX23 운영 중");
  }
  if (input.mode === "hetzner_ccx23") {
    return hetznerResult("ccx23", null, "Hetzner CCX23 운영 중");
  }
  if (input.mode === "hetzner_ccx33") {
    return hetznerResult("ccx33", null, "Hetzner CCX33 운영 중");
  }
  if (input.mode === "hetzner_vps") {
    // Legacy mapping fallback (treat as cx23, but respect manual cost parameter if specified and different)
    const res = hetznerResult("cx23", null, "Hetzner VPS (Legacy) 운영 중");
    if (input.hetznerMonthlyKrw !== HETZNER_VPS.tiers.cx23.monthlyKrw) {
      res.monthlyKrw = input.hetznerMonthlyKrw;
      res.monthlyUsd = input.hetznerMonthlyKrw / input.usdToKrw;
    }
    return res;
  }

  // Auto Scaling logic
  const overOracleMau = input.mau > 20_000;
  const overOracleRps = avgWriteRps > 100; // ARM Free limit
  const atOracleCap = input.baselineGb >= cap;
  const oracleCapWithinMonth = input.growthGbPerMonth > 0 && headroom / input.growthGbPerMonth < 1;

  if (overOracleMau || overOracleRps || atOracleCap || oracleCapWithinMonth) {
    const triggers: string[] = [];
    if (overOracleMau) {
      triggers.push(`MAU ${input.mau.toLocaleString()} > 20,000`);
    }
    if (overOracleRps) {
      triggers.push(`쓰기 RPS ${avgWriteRps.toFixed(1)} > 100 (ARM Free 한계)`);
    }
    if (atOracleCap) {
      triggers.push(`디스크 ${input.baselineGb.toFixed(1)} GB ≥ OCI ${cap} GB`);
    } else if (oracleCapWithinMonth) {
      triggers.push(`월 +${input.growthGbPerMonth.toFixed(2)} GB → OCI 한도 1개월 내 초과`);
    }

    // OCI 한계 초과 시 적절한 Hetzner Tier 결정
    let selectedTier: keyof typeof HETZNER_VPS.tiers = "cx23";
    if (avgWriteRps > 300 || input.mau > 100_000) {
      selectedTier = "ccx33";
    } else if (avgWriteRps > 50 || input.mau > 10_000) {
      selectedTier = "ccx23";
    }

    const tierSpec = HETZNER_VPS.tiers[selectedTier];
    const triggerMsg = triggers.join(" · ");
    const actionMsg = `${tierSpec.name} (~₩${tierSpec.monthlyKrw.toLocaleString("ko-KR")}/mo) — ${HETZNER_VPS.migrationSteps.join(" → ")}`;

    return hetznerResult(selectedTier, triggerMsg, actionMsg);
  }

  // Oracle Free state within bounds
  const headroomReason =
    monthsToCap != null
      ? `OCI 여유 ${headroom.toFixed(1)} GB · cap까지 약 ${monthsToCap}개월`
      : `OCI 여유 ${headroom.toFixed(1)} GB`;
  return oracleResult(`${headroomReason} · 쓰기 RPS ${avgWriteRps.toFixed(1)}`, null);
}
