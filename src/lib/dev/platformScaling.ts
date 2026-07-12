/** Google Cloud Platform e2-micro Free Tier for self-hosted PostgreSQL. */
export const GCP_FREE_TIER = {
  vcpus: 2,
  ramGb: 1,
  storageGb: 30,
  outboundGbPerMonth: 200,
} as const;

/** Vercel — Next.js SSR 호스팅 SSOT (요금 폭탄 시뮬레이션용). */
export const VERCEL_HOSTING = {
  /** Hobby 플랜에서 강제 업그레이드를 유도할 만한 일일 트래픽 한계치 추정 */
  freeDailySsrLimit: 30_000,
  /** MAU가 이 수치를 넘거나 상업용(결제/광고)일 경우 Pro 필수 */
  mauUpgradeThreshold: 5_000,

  /** Pro 플랜 기본 요금 (1 seat) */
  proBaseUsd: 20,
  /** 함수 호출 (Invocations): 100만 회 기본 제공, 이후 100만 회당 $2 */
  invocationUsdPerMillion: 2,
  /** 대역폭 (Fast Data Transfer): 1TB 기본 제공, 이후 GB당 $0.15 */
  bandwidthUsdPerGb: 0.15,

  /** 1 SSR 호출당 대략적인 대역폭 소모량 (JSON payload + HTML) = 약 100KB 가정 */
  estimatedGbPerSsrCall: 0.0001,
} as const;

/** Hetzner (or similar) cost-effective VPS for self-hosted PostgreSQL. */
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
export type ResolvedDbHosting = "gcp_free" | "hetzner_cx23" | "hetzner_ccx23" | "hetzner_ccx33";
export type DbHostingMode =
  | "auto"
  | "gcp_free"
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
    platform: "Frontend (Vercel)",
    stage1: "Hobby (비상업용 무료) · 제한적 트래픽",
    stage2: `상업용 전환 또는 MAU > ${VERCEL_HOSTING.mauUpgradeThreshold.toLocaleString()} · 일 SSR > ${VERCEL_HOSTING.freeDailySsrLimit.toLocaleString()}회`,
    stage3: `Pro 플랜 강제 ($${VERCEL_HOSTING.proBaseUsd}/mo) · 초과 호출 100만당 $${VERCEL_HOSTING.invocationUsdPerMillion} · 대역폭 초과 GB당 $${VERCEL_HOSTING.bandwidthUsdPerGb} (종량제 폭탄 위험)`,
  },
  {
    id: "backend",
    platform: "Backend & DB (OCI Free + Docker PostgreSQL)",
    stage1: `e2-micro ${GCP_FREE_TIER.vcpus} vCPU / ${GCP_FREE_TIER.ramGb}GB RAM · 스토리지 ${GCP_FREE_TIER.storageGb}GB · 아웃바운드 ${GCP_FREE_TIER.outboundGbPerMonth}GB/월`,
    stage2: `적정 MAU 5,000 · 쓰기 RPS > 50 · 스토리지 ${GCP_FREE_TIER.storageGb}GB 한도 도달`,
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
  gcpStorageCapGb: number | null;
  gcpStorageMonthsToCap: number | null;
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

/** Average write RPS from pages persistence (packed arrays = 1 row/page). */
export function estimateAvgWriteRps(input: {
  mau: number;
  sessionsPerMonth: number;
  pagesPerSession: number;
}): number {
  const monthlyWrites =
    input.mau *
    input.sessionsPerMonth *
    input.pagesPerSession;
  return monthlyWrites / (30 * 24 * 3600);
}

export function resolveFrontendHosting(input: FrontendScalingInput): FrontendScalingResult {
  const dailySsrCalls = estimateDailySsrCalls(input);
  const monthlySsrCalls = dailySsrCalls * 30;

  // Vercel Pro 종량제 요금 계산 로직
  const calculateProUsd = () => {
    // 1. Invocation 과금 (100만 회 초과분)
    const overageInvocations = Math.max(0, monthlySsrCalls - 1_000_000);
    const invocationUsd = (overageInvocations / 1_000_000) * VERCEL_HOSTING.invocationUsdPerMillion;

    // 2. Bandwidth 과금 (1TB = 1,000GB 초과분)
    const monthlyBandwidthGb = monthlySsrCalls * VERCEL_HOSTING.estimatedGbPerSsrCall;
    const overageBandwidthGb = Math.max(0, monthlyBandwidthGb - 1000);
    const bandwidthUsd = overageBandwidthGb * VERCEL_HOSTING.bandwidthUsdPerGb;

    const totalOverage = invocationUsd + bandwidthUsd;
    // Vercel Pro는 매월 $20의 Credit이 기본 제공되어 초과분을 우선 차감합니다.
    const billedOverage = Math.max(0, totalOverage - 20);

    return VERCEL_HOSTING.proBaseUsd + billedOverage;
  };

  if (input.mode === "free") {
    return {
      stage: "free",
      dailySsrCalls,
      monthlyUsd: 0,
      autoReason: null,
      migrationAction: null,
      effort: "0% — Hobby tier",
    };
  }
  if (input.mode === "paid") {
    return {
      stage: "paid",
      dailySsrCalls,
      monthlyUsd: calculateProUsd(),
      autoReason: null,
      migrationAction: null,
      effort: "0% — 이미 Pro 플랜",
    };
  }

  const overSsr = dailySsrCalls > VERCEL_HOSTING.freeDailySsrLimit;
  const overMau = input.mau > VERCEL_HOSTING.mauUpgradeThreshold;

  if (overSsr || overMau) {
    const triggers: string[] = [];
    if (overMau) {
      triggers.push(
        `MAU ${input.mau.toLocaleString()} > ${VERCEL_HOSTING.mauUpgradeThreshold.toLocaleString()}`,
      );
    }
    if (overSsr) {
      triggers.push(
        `일 SSR ${Math.round(dailySsrCalls).toLocaleString()} > ${VERCEL_HOSTING.freeDailySsrLimit.toLocaleString()}`,
      );
    }
    return {
      stage: "paid",
      dailySsrCalls,
      monthlyUsd: calculateProUsd(),
      autoReason: triggers.join(" · "),
      migrationAction: `Vercel Pro 플랜 전환 및 종량제 과금 시작`,
      effort: "0% — 코드 변경은 없으나 비용 모니터링 필요",
    };
  }

  return {
    stage: "free",
    dailySsrCalls,
    monthlyUsd: 0,
    autoReason: `일 SSR ${Math.round(dailySsrCalls).toLocaleString()} / ${VERCEL_HOSTING.freeDailySsrLimit.toLocaleString()} · MAU ${input.mau.toLocaleString()}`,
    migrationAction: null,
    effort: "0% — Hobby tier",
  };
}

export function resolveDbHostingScaled(input: DbScalingInput): DbScalingResult {
  const cap = GCP_FREE_TIER.storageGb;
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

  const gcpResult = (
    autoReason: string | null,
    migrationAction: string | null,
  ): DbScalingResult => ({
    hosting: "gcp_free",
    avgWriteRps,
    monthlyUsd: 0,
    monthlyKrw: 0,
    autoReason,
    migrationAction,
    effort: "0% — GCP Free Tier",
    gcpStorageCapGb: cap,
    gcpStorageMonthsToCap: monthsToCap,
    additionalVolumeGb: 0,
    additionalVolumeUsd: 0,
    additionalVolumeKrw: 0,
    vcpus: GCP_FREE_TIER.vcpus,
    ramGb: GCP_FREE_TIER.ramGb,
    ssdGb: cap,
    tierName: "GCP e2-micro Free",
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
      gcpStorageCapGb: null,
      gcpStorageMonthsToCap: null,
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
  if (input.mode === "gcp_free") {
    return gcpResult(null, null);
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
  const overGcpMau = input.mau > 5_000;
  const overGcpRps = avgWriteRps > 50; // e2-micro limit
  const atGcpCap = input.baselineGb >= cap;
  const gcpCapWithinMonth = input.growthGbPerMonth > 0 && headroom / input.growthGbPerMonth < 1;

  if (overGcpMau || overGcpRps || atGcpCap || gcpCapWithinMonth) {
    const triggers: string[] = [];
    if (overGcpMau) {
      triggers.push(`MAU ${input.mau.toLocaleString()} > 5,000`);
    }
    if (overGcpRps) {
      triggers.push(`쓰기 RPS ${avgWriteRps.toFixed(1)} > 50 (GCP Free 한계)`);
    }
    if (atGcpCap) {
      triggers.push(`디스크 ${input.baselineGb.toFixed(1)} GB ≥ GCP ${cap} GB`);
    } else if (gcpCapWithinMonth) {
      triggers.push(`월 +${input.growthGbPerMonth.toFixed(2)} GB → GCP 한도 1개월 내 초과`);
    }

    // GCP 한계 초과 시 적절한 Hetzner Tier 결정
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

  // GCP Free state within bounds
  const headroomReason =
    monthsToCap != null
      ? `GCP 여유 ${headroom.toFixed(1)} GB · cap까지 약 ${monthsToCap}개월`
      : `GCP 여유 ${headroom.toFixed(1)} GB`;
  return gcpResult(`${headroomReason} · 쓰기 RPS ${avgWriteRps.toFixed(1)}`, null);
}
