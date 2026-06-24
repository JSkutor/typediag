import { describe, expect, it } from "vitest";

import {
  CLOUDFLARE_PAGES,
  HETZNER_VPS,
  estimateAvgWriteRps,
  estimateDailySsrCalls,
  resolveDbHostingScaled,
  resolveFrontendHosting,
} from "./platformScaling";

describe("platformScaling", () => {
  it("stays on Cloudflare Free below MAU and SSR thresholds", () => {
    const result = resolveFrontendHosting({
      mau: 5_000,
      sessionsPerMonth: 10,
      pagesPerSession: 30,
      ssrCallsPerPageView: 1.5,
      mode: "auto",
      paidMonthlyUsd: 5,
    });
    expect(result.stage).toBe("free");
    expect(result.monthlyUsd).toBe(0);
    expect(result.migrationAction).toBeNull();
    expect(result.dailySsrCalls).toBeLessThan(CLOUDFLARE_PAGES.freeDailySsrLimit);
  });

  it("upgrades Cloudflare when MAU exceeds threshold", () => {
    const result = resolveFrontendHosting({
      mau: 15_000,
      sessionsPerMonth: 5,
      pagesPerSession: 10,
      ssrCallsPerPageView: 1,
      mode: "auto",
      paidMonthlyUsd: 5,
    });
    expect(result.stage).toBe("paid");
    expect(result.monthlyUsd).toBe(5);
    expect(result.migrationAction).toContain("플랜 업그레이드");
    expect(result.autoReason).toContain("MAU");
  });

  it("upgrades Cloudflare when daily SSR exceeds 100k", () => {
    const daily = estimateDailySsrCalls({
      mau: 8_000,
      sessionsPerMonth: 30,
      pagesPerSession: 50,
      ssrCallsPerPageView: 2,
    });
    expect(daily).toBeGreaterThan(CLOUDFLARE_PAGES.freeDailySsrLimit);

    const result = resolveFrontendHosting({
      mau: 8_000,
      sessionsPerMonth: 30,
      pagesPerSession: 50,
      ssrCallsPerPageView: 2,
      mode: "auto",
      paidMonthlyUsd: 5,
    });
    expect(result.stage).toBe("paid");
    expect(result.autoReason).toContain("SSR");
  });

  it("stays on Oracle Free below MAU and RPS thresholds", () => {
    const result = resolveDbHostingScaled({
      mau: 10_000,
      sessionsPerMonth: 10,
      pagesPerSession: 30,
      keyEventsPerPage: 40,
      baselineGb: 20,
      growthGbPerMonth: 1,
      mode: "auto",
      hetznerMonthlyKrw: HETZNER_VPS.tiers.cx23.monthlyKrw,
      usdToKrw: 1_500,
    });
    expect(result.hosting).toBe("oracle_free");
    expect(result.monthlyUsd).toBe(0);
    expect(result.migrationAction).toBeNull();
    expect(result.avgWriteRps).toBeLessThan(100); // Oracle ARM free VM write limit
  });

  it("migrates DB to Hetzner when MAU exceeds 50k", () => {
    const result = resolveDbHostingScaled({
      mau: 60_000,
      sessionsPerMonth: 5,
      pagesPerSession: 10,
      keyEventsPerPage: 20,
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

  it("migrates DB to Hetzner when write RPS exceeds 200", () => {
    const rps = estimateAvgWriteRps({
      mau: 30_000,
      sessionsPerMonth: 60,
      pagesPerSession: 100,
      keyEventsPerPage: 50,
    });
    expect(rps).toBeGreaterThan(100); // Oracle ARM free VM write limit

    const result = resolveDbHostingScaled({
      mau: 30_000,
      sessionsPerMonth: 60,
      pagesPerSession: 100,
      keyEventsPerPage: 50,
      baselineGb: 80,
      growthGbPerMonth: 5,
      mode: "auto",
      hetznerMonthlyKrw: HETZNER_VPS.tiers.cx23.monthlyKrw,
      usdToKrw: 1_500,
    });
    expect(result.hosting).toBe("hetzner_ccx33");
    expect(result.autoReason).toContain("RPS");
  });

  it("migrates DB to Hetzner when OCI disk cap exceeded within one month", () => {
    const result = resolveDbHostingScaled({
      mau: 1_000,
      sessionsPerMonth: 10,
      pagesPerSession: 30,
      keyEventsPerPage: 40,
      baselineGb: 199,
      growthGbPerMonth: 2,
      mode: "auto",
      hetznerMonthlyKrw: HETZNER_VPS.tiers.cx23.monthlyKrw,
      usdToKrw: 1_500,
    });
    expect(result.hosting).toBe("hetzner_cx23");
    expect(result.autoReason).toContain("1개월");
  });
});
