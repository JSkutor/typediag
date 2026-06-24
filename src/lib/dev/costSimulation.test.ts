import { describe, expect, it } from "vitest";

import {
  DEFAULT_COST_SIMULATION,
  ORACLE_FREE_TIER,
  applyFreeTierCaps,
  estimateAvgGeneratesPerSearch,
  estimateCacheHitRate,
  estimateGeminiCallsPerTopicSession,
  estimateKbPerPageFromDb,
  estimateThinHitRate,
  estimateTopicGeminiTokens,
  mauToSlider,
  runCostSimulation,
  sliderToMau,
} from "./costSimulation";
import { HETZNER_VPS, resolveDbHostingScaled } from "./platformScaling";

describe("costSimulation", () => {
  it("estimates Gemini tokens from SSOT prompts (EN input, KO output)", () => {
    const t = estimateTopicGeminiTokens();
    expect(t.inputBreakdown.system.hangul).toBe(0);
    expect(t.inputMin).toBeGreaterThan(350);
    expect(t.inputMax).toBeLessThan(400);
    expect(t.output).toBeGreaterThan(1100);
    expect(t.outputBreakdown.hangul).toBeGreaterThan(1500);
  });

  it("increases topic match rate with larger batch corpus (1 sentence per topic)", () => {
    const small = estimateCacheHitRate({
      cachedSentenceCount: 1_000,
      sentencesPerCachedTopic: 1,
      topicQuerySpace: 100_000,
      semanticBreadth: 1.8,
      repeatTopicRate: 0.25,
    });
    const large = estimateCacheHitRate({
      cachedSentenceCount: 100_000,
      sentencesPerCachedTopic: 1,
      topicQuerySpace: 100_000,
      semanticBreadth: 1.8,
      repeatTopicRate: 0.25,
    });
    expect(large).toBeGreaterThan(small);
    expect(large).toBeGreaterThan(0.9);
  });

  it("treats batch hit with 1 sentence as thin — still triggers Gemini supplement", () => {
    const { thinHitRate, usableHitRate } = estimateThinHitRate(0.8, 1, 3);
    expect(thinHitRate).toBeCloseTo(0.8);
    expect(usableHitRate).toBeCloseTo(0);

    const onThinHit = estimateGeminiCallsPerTopicSession(30, 1, 20, 3, 100);
    const onRichHit = estimateGeminiCallsPerTopicSession(30, 20, 20, 3, 100);
    expect(onThinHit).toBeGreaterThan(onRichHit);
  });

  it("estimates more Gemini calls on cache miss for 30-page session", () => {
    const onMiss = estimateGeminiCallsPerTopicSession(30, 0, 20, 3, 100);
    const onRichHit = estimateGeminiCallsPerTopicSession(30, 20, 20, 3, 100);
    expect(onMiss).toBeGreaterThan(onRichHit);
    expect(onMiss).toBeGreaterThanOrEqual(2);
  });

  it("avg generates per search rises when hits return only 1 sentence", () => {
    const rich = estimateAvgGeneratesPerSearch(
      { ...DEFAULT_COST_SIMULATION, avgSentencesOnHit: 20 },
      0.8,
    );
    const thin = estimateAvgGeneratesPerSearch(
      { ...DEFAULT_COST_SIMULATION, avgSentencesOnHit: 1 },
      0.8,
    );
    expect(thin).toBeGreaterThan(rich);
  });

  it("caps free-tier Gemini calls using free MAU pool", () => {
    const capped = applyFreeTierCaps(
      {
        mau: 1_000,
        freeTierSearchShare: 1,
        freeTopicSearchCapPerMauMonth: 100,
        freeGeminiCapPerMauMonth: 2,
      },
      10_000,
      3,
    );
    expect(capped.geminiCallsPerMonth).toBeLessThan(10_000 * 3);
    expect(capped.freeGeminiBlockedPerMonth).toBeGreaterThan(0);
    expect(capped.geminiCallsPerMonth).toBe(2_000);
  });

  it("applies per-MAU caps to all free users, not topic-session subset", () => {
    const capped = applyFreeTierCaps(
      {
        mau: 100,
        freeTierSearchShare: 1,
        freeTopicSearchCapPerMauMonth: 5,
        freeGeminiCapPerMauMonth: 1,
      },
      1_000,
      1,
    );
    expect(capped.freeTopicSearchesPerMonth).toBe(500);
  });

  it("runs full simulation with 10 sessions × 30 pages", () => {
    const result = runCostSimulation(DEFAULT_COST_SIMULATION);
    expect(result.derived.pagesPerMauMonth).toBe(300);
    expect(result.derived.thinHitRate).toBeGreaterThan(0);
    expect(result.totalUsd).toBeGreaterThan(0);
  });

  it("zeroes DB hosting costs on Oracle Always Free", () => {
    const oracle = runCostSimulation({
      ...DEFAULT_COST_SIMULATION,
      dbHosting: "oracle_free",
      dbDiskBaselineGb: 15,
    });
    expect(oracle.derived.dbHosting).toBe("oracle_free");
    expect(oracle.derived.resolvedDbHosting).toBe("oracle_free");
    expect(oracle.derived.oracleStorageCapGb).toBe(200);
    expect(oracle.items.find((i) => i.id === "db-hosting")?.usd).toBe(0);

    const hetzner = runCostSimulation({
      ...DEFAULT_COST_SIMULATION,
      dbHosting: "hetzner_vps",
    });
    expect(hetzner.derived.resolvedDbHosting).toBe("hetzner_cx23");
    expect(hetzner.items.find((i) => i.id === "db-hosting")?.usd).toBeGreaterThan(0);
    expect(oracle.totalUsd).toBeLessThan(hetzner.totalUsd);
  });

  it("auto mode stays on Oracle when within MAU/RPS/disk limits", () => {
    const result = runCostSimulation(
      {
        ...DEFAULT_COST_SIMULATION,
        dbHosting: "auto",
        mau: 100,
        dbDiskBaselineGb: 10,
      },
      { actualDiskGb: 10 },
    );
    expect(result.derived.resolvedDbHosting).toBe("oracle_free");
    expect(result.derived.dbHostingAutoReason).toContain("OCI");
    expect(result.items.find((i) => i.id === "db-hosting")?.usd).toBe(0);
  });

  it("auto mode switches to Hetzner when MAU exceeds threshold", () => {
    const growth = runCostSimulation({
      ...DEFAULT_COST_SIMULATION,
      dbHosting: "auto",
      mau: 60_000,
      sessionsPerMonth: 10,
      pagesPerSession: 30,
      dbDiskBaselineGb: 50,
    });
    expect(growth.derived.resolvedDbHosting).toBe("hetzner_ccx23");
    expect(growth.derived.backend.migrationAction).toContain("pg_dump");
    expect(growth.items.find((i) => i.id === "db-hosting")?.usd).toBeGreaterThan(0);
  });

  it("auto mode upgrades Cloudflare when MAU exceeds 10k", () => {
    const scaled = runCostSimulation({
      ...DEFAULT_COST_SIMULATION,
      frontendHosting: "auto",
      mau: 15_000,
    });
    expect(scaled.derived.frontend.stage).toBe("paid");
    expect(scaled.derived.frontend.monthlyUsd).toBe(5);
    expect(scaled.items.find((i) => i.id === "cloudflare")?.usd).toBe(5);
  });

  it("auto mode switches to Hetzner when already at OCI cap", () => {
    const atCap = resolveDbHostingScaled({
      mau: 1_000,
      sessionsPerMonth: 10,
      pagesPerSession: 30,
      keyEventsPerPage: 40,
      baselineGb: ORACLE_FREE_TIER.storageGb,
      growthGbPerMonth: 0.1,
      mode: "auto",
      hetznerMonthlyKrw: HETZNER_VPS.tiers.cx23.monthlyKrw,
      usdToKrw: 1_500,
    });
    expect(atCap.hosting).toBe("hetzner_cx23");
  });

  it("scales to CCX33 and charges additional storage volume at 500k MAU", () => {
    const result = runCostSimulation({
      ...DEFAULT_COST_SIMULATION,
      dbHosting: "auto",
      mau: 500_000,
      dbDiskBaselineGb: 3000, // 3TB baseline
    });
    expect(result.derived.resolvedDbHosting).toBe("hetzner_ccx33");

    // CCX33 요금: ₩84,000 (약 $60.00)
    const dbHostingItem = result.items.find((i) => i.id === "db-hosting");
    expect(dbHostingItem?.usd).toBeCloseTo(84_000 / 1_500);

    // CCX33 기본 SSD: 240GB. 3000GB baseline이므로 2760GB 초과
    // 볼륨 추가 비용: 2760GB * $0.05 = $138.00
    const dbDiskItem = result.items.find((i) => i.id === "db-disk");
    expect(dbDiskItem?.usd).toBeCloseTo(2760 * 0.05);
    expect(dbDiskItem?.detail).toContain("볼륨 추가");
    expect(dbDiskItem?.bucket).toBe("fixed");
  });

  it("estimates KB per page from session table sizes", () => {
    expect(estimateKbPerPageFromDb(25 * 1024, 1)).toBe(25);
    expect(estimateKbPerPageFromDb(0, 10)).toBeNull();
  });

  it("maps MAU log slider both ways", () => {
    expect(sliderToMau(mauToSlider(50))).toBe(50);
    expect(sliderToMau(mauToSlider(10_000))).toBe(10_000);
    expect(sliderToMau(0)).toBe(10);
  });
});
