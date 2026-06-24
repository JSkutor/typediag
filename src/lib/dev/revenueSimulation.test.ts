import { describe, expect, it } from "vitest";

import { runCostSimulation, DEFAULT_COST_SIMULATION } from "./costSimulation";
import {
  DEFAULT_REVENUE_SIMULATION,
  runRevenueSimulation,
  runUnitEconomics,
} from "./revenueSimulation";

describe("revenueSimulation", () => {
  it("computes subscription MRR from logged-in conversion", () => {
    const result = runRevenueSimulation({
      ...DEFAULT_REVENUE_SIMULATION,
      mau: 1_000,
      loginRate: 0.25,
      paidConversionRate: 0.1,
      proMonthlyPriceUsd: 5,
    });
    expect(result.derived.conversionPool).toBe(250);
    expect(result.derived.payingSubscribers).toBe(25);
    expect(result.grossUsd).toBeGreaterThan(100);
  });

  it("subtracts stripe fees from net revenue", () => {
    const result = runRevenueSimulation(DEFAULT_REVENUE_SIMULATION);
    expect(result.netUsd).toBeLessThan(result.grossUsd);
    expect(result.derived.stripeFeesUsd).toBeGreaterThan(0);
  });

  it("combines cost and revenue in unit economics", () => {
    const cost = runCostSimulation({ ...DEFAULT_COST_SIMULATION, mau: 1_000 });
    const revenue = runRevenueSimulation({ ...DEFAULT_REVENUE_SIMULATION, mau: 1_000 });
    const pnl = runUnitEconomics(cost.totalUsd, 1_000, revenue, 1_500, {
      fixedCostUsd: cost.fixedCostUsd,
      variableCostUsd: cost.variableCostUsd,
    });
    expect(pnl.profitUsd).toBe(revenue.netUsd - cost.totalUsd);
  });

  it("treats clerk overage as variable cost for break-even on Pro plan", () => {
    const cost = runCostSimulation({
      ...DEFAULT_COST_SIMULATION,
      mau: 50_000,
      loginRate: 0.5,
      mruConversionRate: 0.8,
      useClerkPro: true,
      clerkIncludedMru: 1_000,
      clerkOveragePerMru: 0.02,
    });
    expect(cost.items.find((i) => i.id === "clerk-overage")?.usd).toBeGreaterThan(0);
    expect(cost.fixedCostUsd).toBeLessThan(cost.totalUsd);
  });

  it("does not charge clerk MRU overage on Hobby plan", () => {
    const cost = runCostSimulation({
      ...DEFAULT_COST_SIMULATION,
      mau: 500_000,
      useClerkPro: false,
    });
    expect(cost.derived.clerkMru).toBeGreaterThan(50_000);
    expect(cost.items.find((i) => i.id === "clerk-overage")?.usd ?? 0).toBe(0);
  });
});
