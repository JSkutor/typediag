import prompts from "@/lib/practice/prompts.json";

/** Gemini API paid-tier rates (USD / 1M tokens). SSOT models: `topicGenerateGemini.ts`.
 * - gemini-2.0-flash: text/image/video input $0.10, output $0.40 (ai.google.dev/pricing). Audio input $0.70.
 * - gemini-1.5-flash: ≤128K prompt tier $0.075 / $0.30 (Google blog 2024-08-12). Topic prompts ≪128K.
 * Both models are deprecated on the pricing page; rates reflect last published Standard tier for text. */
export const GEMINI_PRICING = {
  "gemini-2.0-flash": { input: 0.1, output: 0.4 },
  "gemini-1.5-flash": { input: 0.075, output: 0.3 },
} as const;

/** Upstage embedding API pricing (2026). */
export const DEFAULT_UPSTAGE_USD_PER_M = 0.1;

export { ORACLE_FREE_TIER } from "@/lib/dev/platformScaling";
import {
  HETZNER_VPS,
  ORACLE_FREE_TIER,
  resolveDbHostingScaled,
  resolveFrontendHosting,
  type DbHostingMode,
  type DbScalingResult,
  type FrontendHostingStage,
  type FrontendScalingResult,
  type ResolvedDbHosting,
} from "@/lib/dev/platformScaling";

export type { DbHostingMode, FrontendHostingStage, ResolvedDbHosting };

export const DEFAULT_SENTENCES_PER_GENERATE = 20;
export const DEFAULT_SIMILARITY_THRESHOLD = 0.5;

/** SSOT: `createTopicSlice` `topicNextTarget` — `remainingCount <= 3` */
export const TOPIC_POOL_REFILL_THRESHOLD = 3;

/** Realistic sample for output token estimate (≈84 pure hangul). */
const SAMPLE_OUTPUT_SENTENCE =
  "오늘 아침 창가에 앉아 따뜻한 커피를 홀짝이며 하루를 시작했을 때 문득 지난 시간들이 주마등처럼 스쳐 지나가는 기분이 들었고 그 순간 나는 작은 변화가 모여 큰 성장을 만든다는 사실을 다시금 깨닫게 되었다";

export interface ScriptCounts {
  latin: number;
  hangul: number;
  other: number;
  total: number;
}

export interface GeminiTokenEstimate {
  inputMin: number;
  inputMax: number;
  output: number;
  inputBreakdown: {
    system: ScriptCounts;
    userMin: ScriptCounts;
    userMax: ScriptCounts;
  };
  outputBreakdown: ScriptCounts;
  /** Heuristic rates used (documented in UI). */
  rates: {
    latinCharsPerToken: number;
    hangulTokensPerChar: number;
    otherCharsPerToken: number;
  };
}

export interface CostSimulationInput {
  mau: number;

  sessionsPerMonth: number;
  pagesPerSession: number;
  topicSessionRate: number;
  topicSearchesPerSession: number;
  repeatTopicRate: number;

  cacheMissMode: "manual" | "corpus";
  manualCacheMissRate: number;
  /**
   * `target_texts` rows with `embedding IS NOT NULL` — one practice sentence per row.
   * Batch API: 1 request → 1 sentence row. Not `pages` (typing completion records).
   */
  cachedSentenceCount: number;
  /**
   * Avg sentences returned by vector search on topic match (batch corpus ≈ 1).
   * Below `minUsablePoolSize` triggers Gemini supplement — see `createTopicSlice`.
   */
  avgSentencesOnHit: number;
  /** Pool size below which client calls `/topic/generate` immediately (SSOT: 3). */
  minUsablePoolSize: number;
  /** Max sentences kept in client pool (SSOT: 100). */
  maxPoolSize: number;
  sentencesPerGenerate: number;
  /**
   * Avg sentences stored per distinct topic in corpus.
   * Batch API ≈ 1. Topic Mode runtime cache adds 20 per generate call.
   */
  sentencesPerCachedTopic: number;
  topicQuerySpace: number;
  /**
   * Multiplier on effective topic coverage: embedding matches paraphrases /
   * related queries beyond exact topic string match (e.g. "AI" ↔ "인공지능").
   */
  semanticBreadth: number;

  /** Share of Topic searches from free-tier users (rest = Pro/unlimited). */
  freeTierSearchShare: number;
  /** Max topic searches per free MAU per month (paywall). */
  freeTopicSearchCapPerMauMonth: number;
  /** Max Gemini generate calls per free MAU per month (paywall). */
  freeGeminiCapPerMauMonth: number;

  geminiInputTokens: number;
  geminiOutputTokens: number;
  geminiModel: keyof typeof GEMINI_PRICING;
  geminiRetryMultiplier: number;

  upstageQueryTokens: number;
  upstagePassageTokensPerBatch: number;
  upstageUsdPerMillion: number;

  loginRate: number;
  mruConversionRate: number;
  clerkIncludedMru: number;
  clerkProMonthlyUsd: number;
  clerkOveragePerMru: number;
  useClerkPro: boolean;

  /**
   * Hetzner VPS vs Oracle OCI Always Free (Docker TimescaleDB).
   * `auto` — Oracle until MAU/RPS/disk cap; else Hetzner (see `resolveDbHostingScaled`).
   */
  dbHosting: DbHostingMode;
  /** Used with oracle_free — projected months until 200 GB cap. */
  dbDiskBaselineGb: number;
  /** Hetzner VPS flat monthly (KRW). Ignored when dbHosting=oracle_free. */
  hetznerVpsMonthlyKrw: number;
  /** Cloudflare Pages paid plan $/mo. Used when frontend auto → paid. */
  cloudflarePagesPaidMonthlyUsd: number;
  /** `auto` — free until MAU/SSR limit; else paid plan. */
  frontendHosting: "auto" | FrontendHostingStage;
  /** Edge/SSR invocations per page view. */
  ssrCallsPerPageView: number;
  /** key_events writes per completed page (RPS estimate). */
  keyEventsPerPage: number;
  kbPerPage: number;

  usdToKrw: number;
}

export type CostEconomicsBucket = "fixed" | "variable";

export interface CostLineItem {
  id: string;
  label: string;
  usd: number;
  detail: string;
  bucket: CostEconomicsBucket;
}

export interface DbHostingResolution {
  hosting: ResolvedDbHosting;
  /** Effective baseline GB used (live DB size or manual input). */
  baselineGb: number;
  /** Why auto mode picked this host (null when manual). */
  autoReason: string | null;
}

export interface CostSimulationRuntime {
  /** Live `pg_database_size` in GB — overrides manual baseline when set. */
  actualDiskGb?: number | null;
}

export interface CostSimulationResult {
  derived: {
    pagesPerMauMonth: number;
    topicSessionsPerMauMonth: number;
    topicSearchesPerMonth: number;
    /** Vector search returns ≥1 row above similarity threshold. */
    topicMatchRate: number;
    cacheMissRate: number;
    /** Match but pool < minUsablePoolSize → still needs Gemini at search time. */
    thinHitRate: number;
    /** Match with enough sentences to skip immediate Gemini supplement. */
    usableHitRate: number;
    effectiveTopicCoverage: number;
    avgGeneratesPerSearch: number;
    freeTopicSearchesPerMonth: number;
    proTopicSearchesPerMonth: number;
    freeGeminiBlockedPerMonth: number;
    geminiCallsPerMonth: number;
    upstageQueryCallsPerMonth: number;
    upstagePassageBatchesPerMonth: number;
    dbGrowthGbPerMonth: number;
    dbHosting: CostSimulationInput["dbHosting"];
    resolvedDbHosting: ResolvedDbHosting;
    dbDiskBaselineGb: number;
    dbHostingAutoReason: string | null;
    oracleStorageCapGb: number | null;
    oracleStorageMonthsToCap: number | null;
    clerkMru: number;
    dailySsrCalls: number;
    avgWriteRps: number;
    frontend: FrontendScalingResult;
    backend: DbScalingResult;
  };
  items: CostLineItem[];
  fixedCostUsd: number;
  variableCostUsd: number;
  totalUsd: number;
  totalKrw: number;
  perMauUsd: number;
  perMauKrw: number;
}

const GEMINI_TOKEN_RATES = {
  latinCharsPerToken: 4,
  hangulTokensPerChar: 0.62,
  otherCharsPerToken: 4,
} as const;

export function countByScript(text: string): ScriptCounts {
  let latin = 0;
  let hangul = 0;
  let other = 0;
  for (const ch of text) {
    if (/[a-zA-Z0-9]/.test(ch)) latin += 1;
    else if (/[가-힣]/.test(ch)) hangul += 1;
    else other += 1;
  }
  return { latin, hangul, other, total: text.length };
}

export function estimateTokensFromScript(counts: ScriptCounts): number {
  return Math.ceil(
    counts.latin / GEMINI_TOKEN_RATES.latinCharsPerToken +
      counts.hangul * GEMINI_TOKEN_RATES.hangulTokensPerChar +
      counts.other / GEMINI_TOKEN_RATES.otherCharsPerToken,
  );
}

function buildTopicUserPrompt(topic: string, withNumbers: boolean): string {
  const numberCondition = withNumbers
    ? prompts.number_constraint.with_numbers
    : prompts.number_constraint.without_numbers;
  return prompts.topic.user_prompt_template
    .replace("{topic}", topic)
    .replace("{number_condition}", numberCondition)
    .replace("{complex_sentence}", prompts.common_rules.complex_sentence)
    .replace("{no_newlines}", prompts.common_rules.no_newlines)
    .replace("{allowed_punctuation}", prompts.common_rules.allowed_punctuation);
}

/** SSOT: `prompts.json` + `topicGenerateGemini.ts` system_instruction / user template. */
export function estimateTopicGeminiTokens(): GeminiTokenEstimate {
  const system = prompts.topic.system_instruction;
  const userMin = buildTopicUserPrompt("AI", false);
  const userMax = buildTopicUserPrompt("타자연습과집중력", true);
  const systemCounts = countByScript(system);
  const userMinCounts = countByScript(userMin);
  const userMaxCounts = countByScript(userMax);

  const outputJson = JSON.stringify({
    sentences: Array(DEFAULT_SENTENCES_PER_GENERATE).fill(SAMPLE_OUTPUT_SENTENCE),
  });
  const outputBreakdown = countByScript(outputJson);

  return {
    inputMin: estimateTokensFromScript({
      latin: systemCounts.latin + userMinCounts.latin,
      hangul: systemCounts.hangul + userMinCounts.hangul,
      other: systemCounts.other + userMinCounts.other,
      total: systemCounts.total + userMinCounts.total,
    }),
    inputMax: estimateTokensFromScript({
      latin: systemCounts.latin + userMaxCounts.latin,
      hangul: systemCounts.hangul + userMaxCounts.hangul,
      other: systemCounts.other + userMaxCounts.other,
      total: systemCounts.total + userMaxCounts.total,
    }),
    output: estimateTokensFromScript(outputBreakdown),
    inputBreakdown: {
      system: systemCounts,
      userMin: userMinCounts,
      userMax: userMaxCounts,
    },
    outputBreakdown,
    rates: { ...GEMINI_TOKEN_RATES },
  };
}

const DEFAULT_TOKENS = estimateTopicGeminiTokens();

export const DEFAULT_COST_SIMULATION: CostSimulationInput = {
  mau: 1_000,
  sessionsPerMonth: 10,
  pagesPerSession: 30,
  topicSessionRate: 0.3,
  topicSearchesPerSession: 1.2,
  repeatTopicRate: 0.25,

  cacheMissMode: "corpus",
  manualCacheMissRate: 0.5,
  cachedSentenceCount: 10_000,
  avgSentencesOnHit: 1,
  minUsablePoolSize: 3,
  maxPoolSize: 100,
  sentencesPerGenerate: DEFAULT_SENTENCES_PER_GENERATE,
  sentencesPerCachedTopic: 1,
  /** Distinct topic queries MAU might search — larger space = corpus size matters more in sim. */
  topicQuerySpace: 100_000,
  semanticBreadth: 1.8,

  freeTierSearchShare: 0.9,
  freeTopicSearchCapPerMauMonth: 30,
  freeGeminiCapPerMauMonth: 5,

  geminiInputTokens: Math.round((DEFAULT_TOKENS.inputMin + DEFAULT_TOKENS.inputMax) / 2),
  geminiOutputTokens: DEFAULT_TOKENS.output,
  geminiModel: "gemini-2.0-flash",
  geminiRetryMultiplier: 1.05,

  upstageQueryTokens: 5,
  upstagePassageTokensPerBatch: estimateTokensFromScript(
    countByScript(Array(DEFAULT_SENTENCES_PER_GENERATE).fill(SAMPLE_OUTPUT_SENTENCE).join("\n")),
  ),
  upstageUsdPerMillion: DEFAULT_UPSTAGE_USD_PER_M,

  loginRate: 0.4,
  mruConversionRate: 0.5,
  clerkIncludedMru: 50_000,
  clerkProMonthlyUsd: 25,
  clerkOveragePerMru: 0.02,
  useClerkPro: false,

  dbHosting: "auto",
  dbDiskBaselineGb: 15,
  hetznerVpsMonthlyKrw: HETZNER_VPS.tiers.cx23.monthlyKrw,
  cloudflarePagesPaidMonthlyUsd: 5,
  frontendHosting: "auto",
  ssrCallsPerPageView: 1.5,
  keyEventsPerPage: 40,
  kbPerPage: 25,

  usdToKrw: 1_500,
};

export function estimateCacheHitRate(
  input: Pick<
    CostSimulationInput,
    | "cachedSentenceCount"
    | "sentencesPerCachedTopic"
    | "topicQuerySpace"
    | "semanticBreadth"
    | "repeatTopicRate"
  >,
): number {
  const sentencesPerTopic = Math.max(1, input.sentencesPerCachedTopic);
  const effectiveTopics = Math.max(1, Math.floor(input.cachedSentenceCount / sentencesPerTopic));
  const space = Math.max(1, input.topicQuerySpace);
  const breadth = Math.max(1, input.semanticBreadth);

  const novelHitRate = Math.min(0.98, (effectiveTopics * breadth) / space);
  const repeatHitRate = Math.min(0.99, novelHitRate + (1 - novelHitRate) * 0.85);

  const hitRate =
    input.repeatTopicRate * repeatHitRate + (1 - input.repeatTopicRate) * novelHitRate;

  return Math.min(0.99, Math.max(0.01, hitRate));
}

export function estimateGeminiCallsPerTopicSession(
  topicPages: number,
  initialPoolSize: number,
  sentencesPerGenerate: number,
  minUsablePoolSize: number,
  maxPoolSize: number,
): number {
  const pages = Math.max(0, Math.floor(topicPages));
  const batch = Math.max(1, sentencesPerGenerate);
  const minPool = Math.max(1, minUsablePoolSize);
  const cap = Math.max(minPool, maxPoolSize);

  let pool = Math.max(0, Math.floor(initialPoolSize));
  let generates = 0;

  if (pool < minPool) {
    generates += 1;
    pool += batch;
  }

  let consumed = 0;
  while (consumed < pages) {
    const remaining = pool - consumed - 1;
    if (remaining <= TOPIC_POOL_REFILL_THRESHOLD && pool < cap && consumed + 1 < pages) {
      generates += 1;
      pool = Math.min(cap, pool + batch);
    }
    consumed += 1;
  }

  return generates;
}

export function estimateAvgGeneratesPerSearch(
  input: Pick<
    CostSimulationInput,
    | "pagesPerSession"
    | "sentencesPerGenerate"
    | "avgSentencesOnHit"
    | "minUsablePoolSize"
    | "maxPoolSize"
  >,
  matchRate: number,
): number {
  const missRate = 1 - matchRate;
  const poolOnHit = Math.min(input.maxPoolSize, Math.max(0, input.avgSentencesOnHit));
  const onMiss = estimateGeminiCallsPerTopicSession(
    input.pagesPerSession,
    0,
    input.sentencesPerGenerate,
    input.minUsablePoolSize,
    input.maxPoolSize,
  );
  const onHit = estimateGeminiCallsPerTopicSession(
    input.pagesPerSession,
    poolOnHit,
    input.sentencesPerGenerate,
    input.minUsablePoolSize,
    input.maxPoolSize,
  );
  return missRate * onMiss + matchRate * onHit;
}

export function estimateThinHitRate(
  matchRate: number,
  avgSentencesOnHit: number,
  minUsablePoolSize: number,
): { thinHitRate: number; usableHitRate: number } {
  const isThin = avgSentencesOnHit < Math.max(1, minUsablePoolSize);
  const thinHitRate = matchRate * (isThin ? 1 : 0);
  const usableHitRate = matchRate * (isThin ? 0 : 1);
  return { thinHitRate, usableHitRate };
}

export function applyFreeTierCaps(
  input: Pick<
    CostSimulationInput,
    "mau" | "freeTierSearchShare" | "freeTopicSearchCapPerMauMonth" | "freeGeminiCapPerMauMonth"
  >,
  topicSearchesPerMonth: number,
  avgGeneratesPerSearch: number,
): {
  freeTopicSearchesPerMonth: number;
  proTopicSearchesPerMonth: number;
  geminiCallsPerMonth: number;
  freeGeminiBlockedPerMonth: number;
} {
  const freeShare = Math.min(1, Math.max(0, input.freeTierSearchShare));
  /** Cap pool: free-tier MAU (not topic-session subset). */
  const freeMau = Math.max(0, input.mau * freeShare);
  const freeSearchDemand = topicSearchesPerMonth * freeShare;
  const proSearchDemand = topicSearchesPerMonth * (1 - freeShare);

  const freeSearchCap = freeMau * Math.max(0, input.freeTopicSearchCapPerMauMonth);
  const freeTopicSearchesPerMonth = Math.min(freeSearchDemand, freeSearchCap);
  const proTopicSearchesPerMonth = proSearchDemand;

  const freeGeminiDemand = freeTopicSearchesPerMonth * avgGeneratesPerSearch;
  const freeGeminiCap = freeMau * Math.max(0, input.freeGeminiCapPerMauMonth);
  const freeGeminiCalls = Math.min(freeGeminiDemand, freeGeminiCap);
  const freeGeminiBlockedPerMonth = Math.max(0, freeGeminiDemand - freeGeminiCalls);
  const proGeminiCalls = proTopicSearchesPerMonth * avgGeneratesPerSearch;

  return {
    freeTopicSearchesPerMonth,
    proTopicSearchesPerMonth,
    geminiCallsPerMonth: freeGeminiCalls + proGeminiCalls,
    freeGeminiBlockedPerMonth,
  };
}

/** Session tables only — pages + key_events (+ runs share is negligible). */
export function estimateKbPerPageFromDb(
  sessionDataBytes: number,
  pageCount: number,
): number | null {
  if (pageCount <= 0 || sessionDataBytes <= 0) return null;
  return sessionDataBytes / 1024 / pageCount;
}

export function resolveCacheMissRate(input: CostSimulationInput): {
  hitRate: number;
  missRate: number;
  effectiveTopicCoverage: number;
} {
  const sentencesPerTopic = Math.max(1, input.sentencesPerCachedTopic);
  const effectiveTopicCoverage = Math.max(
    1,
    Math.floor(input.cachedSentenceCount / sentencesPerTopic),
  );

  if (input.cacheMissMode === "manual") {
    const missRate = Math.min(1, Math.max(0, input.manualCacheMissRate));
    return { hitRate: 1 - missRate, missRate, effectiveTopicCoverage };
  }

  const hitRate = estimateCacheHitRate(input);
  return { hitRate, missRate: 1 - hitRate, effectiveTopicCoverage };
}

export function runCostSimulation(
  input: CostSimulationInput,
  runtime?: CostSimulationRuntime,
): CostSimulationResult {
  const pagesPerMauMonth = input.sessionsPerMonth * input.pagesPerSession;
  const topicSessionsPerMauMonth = input.sessionsPerMonth * input.topicSessionRate;
  const topicSearchesPerMonth =
    input.mau * topicSessionsPerMauMonth * input.topicSearchesPerSession;

  const { hitRate, missRate, effectiveTopicCoverage } = resolveCacheMissRate(input);
  const topicMatchRate = hitRate;
  const { thinHitRate, usableHitRate } = estimateThinHitRate(
    topicMatchRate,
    input.avgSentencesOnHit,
    input.minUsablePoolSize,
  );

  const avgGeneratesPerSearch = estimateAvgGeneratesPerSearch(input, topicMatchRate);
  const tiered = applyFreeTierCaps(input, topicSearchesPerMonth, avgGeneratesPerSearch);
  const effectiveTopicSearches = tiered.freeTopicSearchesPerMonth + tiered.proTopicSearchesPerMonth;
  const geminiCallsPerMonth = tiered.geminiCallsPerMonth;
  const upstageQueryCallsPerMonth = effectiveTopicSearches;
  /** db:embed always runs on new Gemini batches (passage model, 20 sentences). */
  const upstagePassageBatchesPerMonth = geminiCallsPerMonth;

  const pricing = GEMINI_PRICING[input.geminiModel];
  const geminiUsd =
    geminiCallsPerMonth *
    input.geminiRetryMultiplier *
    ((input.geminiInputTokens / 1_000_000) * pricing.input +
      (input.geminiOutputTokens / 1_000_000) * pricing.output);

  const upstageQueryUsd =
    (upstageQueryCallsPerMonth * input.upstageQueryTokens * input.upstageUsdPerMillion) / 1_000_000;
  const upstagePassageUsd =
    (upstagePassageBatchesPerMonth *
      input.upstagePassageTokensPerBatch *
      input.upstageUsdPerMillion) /
    1_000_000;

  const clerkMru = Math.round(input.mau * input.loginRate * input.mruConversionRate);
  const clerkBaseUsd = input.useClerkPro ? input.clerkProMonthlyUsd : 0;
  /** Clerk Hobby: 50k MRU included, no metered overage — upgrade to Pro required. */
  const clerkOverageUsd =
    input.useClerkPro && clerkMru > input.clerkIncludedMru
      ? (clerkMru - input.clerkIncludedMru) * input.clerkOveragePerMru
      : 0;

  const totalPagesPerMonth = input.mau * pagesPerMauMonth;
  const dbGrowthGbPerMonth = (totalPagesPerMonth * input.kbPerPage) / (1024 * 1024);

  const effectiveBaselineGb =
    runtime?.actualDiskGb != null && runtime.actualDiskGb > 0
      ? runtime.actualDiskGb
      : input.dbDiskBaselineGb;

  const frontend = resolveFrontendHosting({
    mau: input.mau,
    sessionsPerMonth: input.sessionsPerMonth,
    pagesPerSession: input.pagesPerSession,
    ssrCallsPerPageView: input.ssrCallsPerPageView,
    mode: input.frontendHosting,
    paidMonthlyUsd: input.cloudflarePagesPaidMonthlyUsd,
  });

  const backend = resolveDbHostingScaled({
    mau: input.mau,
    sessionsPerMonth: input.sessionsPerMonth,
    pagesPerSession: input.pagesPerSession,
    keyEventsPerPage: input.keyEventsPerPage,
    baselineGb: effectiveBaselineGb,
    growthGbPerMonth: dbGrowthGbPerMonth,
    mode: input.dbHosting,
    hetznerMonthlyKrw: input.hetznerVpsMonthlyKrw,
    usdToKrw: input.usdToKrw,
  });

  const resolvedHosting = backend.hosting;
  const isOracleFree = resolvedHosting === "oracle_free";

  const allItems: CostLineItem[] = [
    {
      id: "gemini",
      label: "Gemini",
      usd: geminiUsd,
      detail: `${formatNum(geminiCallsPerMonth, 0)} calls · ${input.geminiModel}`,
      bucket: "variable",
    },
    {
      id: "upstage-query",
      label: "Upstage query",
      usd: upstageQueryUsd,
      detail: `${formatNum(upstageQueryCallsPerMonth, 0)} embedding-query`,
      bucket: "variable",
    },
    {
      id: "upstage-passage",
      label: "Upstage passage",
      usd: upstagePassageUsd,
      detail: `${formatNum(upstagePassageBatchesPerMonth, 1)}× db:embed (신규 생성분)`,
      bucket: "variable",
    },
    {
      id: "clerk-base",
      label: "Clerk Pro",
      usd: clerkBaseUsd,
      detail: input.useClerkPro
        ? `Pro 플랜 고정 (${formatUsd(input.clerkProMonthlyUsd)}/mo)`
        : clerkMru > input.clerkIncludedMru
          ? `Hobby · MRU ${formatNum(clerkMru, 0)} > ${formatNum(input.clerkIncludedMru, 0)} — Pro 업그레이드 필요`
          : `Hobby · MRU ${formatNum(clerkMru, 0)} / ${formatNum(input.clerkIncludedMru, 0)} 포함`,
      bucket: "fixed",
    },
    {
      id: "clerk-overage",
      label: "Clerk MRU overage",
      usd: clerkOverageUsd,
      detail: input.useClerkPro
        ? `${formatNum(clerkMru, 0)} MRU (Pro 초과분)`
        : "Pro 플랜에서만 과금",
      bucket: "variable",
    },
    {
      id: "cloudflare",
      label: "Cloudflare Pages",
      usd: frontend.monthlyUsd,
      detail:
        frontend.stage === "free"
          ? `Free · 일 SSR ${Math.round(frontend.dailySsrCalls).toLocaleString()}${
              input.frontendHosting === "auto" ? " (auto)" : ""
            }`
          : `Paid $${input.cloudflarePagesPaidMonthlyUsd}/mo${
              input.frontendHosting === "auto" ? " (auto)" : ""
            }`,
      bucket: "fixed",
    },
    {
      id: "db-hosting",
      label: "DB hosting",
      usd: backend.monthlyUsd,
      detail: isOracleFree
        ? `OCI Free · ARM ${ORACLE_FREE_TIER.arm.ocpus} OCPU / ${ORACLE_FREE_TIER.arm.ramGb}GB · Docker${
            input.dbHosting === "auto" ? " (auto)" : ""
          }`
        : `${backend.tierName} · ₩${backend.monthlyKrw.toLocaleString("ko-KR")}/mo${
            input.dbHosting === "auto" ? " (auto)" : ""
          }`,
      bucket: "fixed",
    },
    {
      id: "db-disk",
      label: "DB 추가 볼륨",
      usd: backend.additionalVolumeUsd,
      detail: isOracleFree
        ? `Always Free ${ORACLE_FREE_TIER.storageGb}GB · +${dbGrowthGbPerMonth.toFixed(2)} GB/mo${
            backend.oracleStorageMonthsToCap != null
              ? ` · cap ~${backend.oracleStorageMonthsToCap}mo`
              : ""
          }`
        : backend.additionalVolumeGb > 0
          ? `볼륨 추가 +${backend.additionalVolumeGb.toFixed(1)} GB (기본 ${backend.ssdGb}GB 초과) · +${dbGrowthGbPerMonth.toFixed(2)} GB/mo`
          : `${backend.tierName} 기본 SSD ${backend.ssdGb}GB 내 · +${dbGrowthGbPerMonth.toFixed(2)} GB/mo`,
      bucket: "fixed",
    },
  ];
  const alwaysShowIds = new Set(["clerk-base", "cloudflare", "db-hosting", "db-disk"]);
  const items = allItems.filter((item) => item.usd > 0 || alwaysShowIds.has(item.id));

  const fixedCostUsd = items.filter((i) => i.bucket === "fixed").reduce((sum, i) => sum + i.usd, 0);
  const variableCostUsd = items
    .filter((i) => i.bucket === "variable")
    .reduce((sum, i) => sum + i.usd, 0);
  const totalUsd = fixedCostUsd + variableCostUsd;

  return {
    derived: {
      pagesPerMauMonth,
      topicSessionsPerMauMonth,
      topicSearchesPerMonth,
      topicMatchRate,
      cacheMissRate: missRate,
      thinHitRate,
      usableHitRate,
      effectiveTopicCoverage,
      avgGeneratesPerSearch,
      freeTopicSearchesPerMonth: tiered.freeTopicSearchesPerMonth,
      proTopicSearchesPerMonth: tiered.proTopicSearchesPerMonth,
      freeGeminiBlockedPerMonth: tiered.freeGeminiBlockedPerMonth,
      geminiCallsPerMonth,
      upstageQueryCallsPerMonth,
      upstagePassageBatchesPerMonth,
      dbGrowthGbPerMonth,
      dbHosting: input.dbHosting,
      resolvedDbHosting: resolvedHosting,
      dbDiskBaselineGb: effectiveBaselineGb,
      dbHostingAutoReason: backend.autoReason,
      oracleStorageCapGb: backend.oracleStorageCapGb,
      oracleStorageMonthsToCap: backend.oracleStorageMonthsToCap,
      clerkMru,
      dailySsrCalls: frontend.dailySsrCalls,
      avgWriteRps: backend.avgWriteRps,
      frontend,
      backend,
    },
    items,
    fixedCostUsd,
    variableCostUsd,
    totalUsd,
    totalKrw: totalUsd * input.usdToKrw,
    perMauUsd: input.mau > 0 ? totalUsd / input.mau : 0,
    perMauKrw: input.mau > 0 ? (totalUsd * input.usdToKrw) / input.mau : 0,
  };
}

/** Log-scale MAU slider helpers (10 … 500_000). */
export const MAU_SLIDER_MIN = 10;
export const MAU_SLIDER_MAX = 500_000;

export function mauToSlider(mau: number): number {
  const clamped = Math.min(MAU_SLIDER_MAX, Math.max(MAU_SLIDER_MIN, mau));
  const minLog = Math.log(MAU_SLIDER_MIN);
  const maxLog = Math.log(MAU_SLIDER_MAX);
  return ((Math.log(clamped) - minLog) / (maxLog - minLog)) * 100;
}

export function sliderToMau(slider: number): number {
  const t = Math.min(100, Math.max(0, slider)) / 100;
  const minLog = Math.log(MAU_SLIDER_MIN);
  const maxLog = Math.log(MAU_SLIDER_MAX);
  return Math.round(Math.exp(minLog + t * (maxLog - minLog)));
}

function formatNum(n: number, digits: number): string {
  return n.toLocaleString("en-US", {
    maximumFractionDigits: digits,
    minimumFractionDigits: digits,
  });
}

export function formatUsd(n: number): string {
  if (n < 0.01 && n > 0) return `<$0.01`;
  if (n >= 1000) return `$${n.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
  return `$${n.toFixed(2)}`;
}

export function formatKrw(n: number): string {
  return `₩${Math.round(n).toLocaleString("ko-KR")}`;
}
