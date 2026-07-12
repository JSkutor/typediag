import { describe, expect, it } from "vitest";

import {
  VERCEL_HOSTING,
  HETZNER_VPS,
  estimateAvgWriteRps,
  estimateDailySsrCalls,
  resolveDbHostingScaled,
  resolveFrontendHosting,
} from "./platformScaling";

describe("platformScaling", () => {
  it("stays on Vercel Hobby below MAU and SSR thresholds", () => {
    const result = resolveFrontendHosting({
      mau: 1_000,
      sessionsPerMonth: 10,
      pagesPerSession: 30,
      ssrCallsPerPageView: 1.5,
      mode: "auto",
      paidMonthlyUsd: 20,
    });
    expect(result.stage).toBe("free");
    expect(result.monthlyUsd).toBe(0);
    expect(result.migrationAction).toBeNull();
    expect(result.dailySsrCalls).toBeLessThan(VERCEL_HOSTING.freeDailySsrLimit);
  });

  it("upgrades Vercel when MAU exceeds threshold", () => {
    const result = resolveFrontendHosting({
      mau: 15_000,
      sessionsPerMonth: 5,
      pagesPerSession: 10,
      ssrCallsPerPageView: 1,
      mode: "auto",
      paidMonthlyUsd: 20,
    });
    expect(result.stage).toBe("paid");
    // With 15000 MAU * 5 * 10 / 30 = 25000 daily SSR calls.
    // Monthly = 750,000. It doesn't exceed 1M limit or 1TB bandwidth.
    // So cost is just the base Pro cost of $20.
    expect(result.monthlyUsd).toBe(20);
    expect(result.migrationAction).toContain("플랜 전환");
    expect(result.autoReason).toContain("MAU");
  });

  it("upgrades Vercel when daily SSR exceeds 30k", () => {
    const daily = estimateDailySsrCalls({
      mau: 8_000,
      sessionsPerMonth: 30,
      pagesPerSession: 50,
      ssrCallsPerPageView: 2,
    });
    expect(daily).toBeGreaterThan(VERCEL_HOSTING.freeDailySsrLimit);

    const result = resolveFrontendHosting({
      mau: 8_000,
      sessionsPerMonth: 30,
      pagesPerSession: 50,
      ssrCallsPerPageView: 2,
      mode: "auto",
      paidMonthlyUsd: 20,
    });
    expect(result.stage).toBe("paid");
    expect(result.autoReason).toContain("SSR");
  });

  it("stays on GCP Free below MAU and RPS thresholds", () => {
    const result = resolveDbHostingScaled({
      mau: 800,
      sessionsPerMonth: 10,
      pagesPerSession: 30,
      baselineGb: 20,
      growthGbPerMonth: 1,
      mode: "auto",
      hetznerMonthlyKrw: HETZNER_VPS.tiers.cx23.monthlyKrw,
      usdToKrw: 1_500,
    });
    expect(result.hosting).toBe("gcp_free");
    expect(result.monthlyUsd).toBe(0);
    expect(result.migrationAction).toBeNull();
    expect(result.avgWriteRps).toBeLessThan(50); // GCP Free VM write limit
  });

  it("migrates DB to Hetzner when MAU exceeds 50k", () => {
    const result = resolveDbHostingScaled({
      mau: 60_000,
      sessionsPerMonth: 5,
      pagesPerSession: 10,
      baselineGb: 50,
      growthGbPerMonth: 2,
      mode: "auto",
      hetznerMonthlyKrw: HETZNER_VPS.tiers.cx23.monthlyKrw,
      usdToKrw: 1_500,
    });
    expect(result.hosting).toBe("hetzner_ccx23");
    expect(result.monthlyKrw).toBe(HETZNER_VPS.tiers.ccx23.monthlyKrw);
    expect(result.migrationAction).toContain("pg_dump");
    expect(result.autoReason).toContain("MAU");
  });

  it("migrates DB to Hetzner when write RPS exceeds 50", () => {
    const rps = estimateAvgWriteRps({
      mau: 30_000,
      sessionsPerMonth: 60,
      pagesPerSession: 100,
    });
    expect(rps).toBeGreaterThan(50); // GCP Free VM write limit

    const result = resolveDbHostingScaled({
      mau: 30_000,
      sessionsPerMonth: 60,
      pagesPerSession: 100,
      baselineGb: 80,
      growthGbPerMonth: 5,
      mode: "auto",
      hetznerMonthlyKrw: HETZNER_VPS.tiers.cx23.monthlyKrw,
      usdToKrw: 1_500,
    });
    expect(result.hosting).toBe("hetzner_ccx23");
    expect(result.autoReason).toContain("RPS");
  });

  it("migrates DB to Hetzner when GCP disk cap exceeded within one month", () => {
    const result = resolveDbHostingScaled({
      mau: 1_000,
      sessionsPerMonth: 10,
      pagesPerSession: 30,
      baselineGb: 29, // Close to 30GB cap
      growthGbPerMonth: 2,
      mode: "auto",
      hetznerMonthlyKrw: HETZNER_VPS.tiers.cx23.monthlyKrw,
      usdToKrw: 1_500,
    });
    expect(result.hosting).toBe("hetzner_cx23");
    expect(result.autoReason).toContain("1개월");
  });
});
