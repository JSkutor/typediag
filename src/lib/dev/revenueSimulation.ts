import { formatUsd } from "@/lib/dev/costSimulation";

export type PaidConversionBasis = "mau" | "logged_in";
export type RevenueMode = "subscription" | "manual_arpu";

export interface RevenueSimulationInput {
  mau: number;

  revenueMode: RevenueMode;

  /** Pro plan list price (monthly billing). */
  proMonthlyPriceUsd: number;
  /** Who pays: all MAU vs logged-in users only. */
  paidConversionBasis: PaidConversionBasis;
  loginRate: number;
  /** Share of basis users on a paid plan (0–1). */
  paidConversionRate: number;

  annualPlanShare: number;
  /** e.g. 0.17 = 2 months free on annual. */
  annualDiscountRate: number;

  stripeFeePercent: number;
  stripeFeeFixedUsd: number;

  /** Team / B2B seats sold per month (flat). */
  b2bSeatsPerMonth: number;
  b2bSeatPriceUsd: number;

  /** Sponsorship, API resale, etc. */
  otherRevenueMonthlyUsd: number;

  /** Used when revenueMode === 'manual_arpu'. */
  manualArpuUsd: number;

  usdToKrw: number;
}

export interface RevenueLineItem {
  id: string;
  label: string;
  usd: number;
  detail: string;
}

export interface RevenueSimulationResult {
  derived: {
    conversionPool: number;
    payingSubscribers: number;
    blendedArpuUsd: number;
    grossMrrUsd: number;
    stripeFeesUsd: number;
    netMrrUsd: number;
    mrrPerMauUsd: number;
  };
  items: RevenueLineItem[];
  grossUsd: number;
  netUsd: number;
  grossKrw: number;
  netKrw: number;
}

export const DEFAULT_REVENUE_SIMULATION: RevenueSimulationInput = {
  mau: 1_000,
  revenueMode: "subscription",
  proMonthlyPriceUsd: 6_000 / 1_500,
  paidConversionBasis: "logged_in",
  loginRate: 0.4,
  paidConversionRate: 0.02,
  annualPlanShare: 0.2,
  annualDiscountRate: 0.17,
  stripeFeePercent: 2.9,
  stripeFeeFixedUsd: 0.3,
  b2bSeatsPerMonth: 0,
  b2bSeatPriceUsd: 15,
  otherRevenueMonthlyUsd: 0,
  manualArpuUsd: 0.15,
  usdToKrw: 1_500,
};

export function runRevenueSimulation(input: RevenueSimulationInput): RevenueSimulationResult {
  let conversionPool = 0;
  let payingSubscribers = 0;
  let subscriptionMrr = 0;
  let blendedArpuUsd = 0;

  if (input.revenueMode === "manual_arpu") {
    conversionPool = input.mau;
    subscriptionMrr = input.mau * input.manualArpuUsd;
    blendedArpuUsd = input.manualArpuUsd;
  } else {
    conversionPool =
      input.paidConversionBasis === "mau" ? input.mau : Math.round(input.mau * input.loginRate);

    payingSubscribers = Math.round(conversionPool * input.paidConversionRate);

    const monthlyPrice = input.proMonthlyPriceUsd;
    const annualMonthlyEquivalent = (monthlyPrice * 12 * (1 - input.annualDiscountRate)) / 12;
    blendedArpuUsd =
      (1 - input.annualPlanShare) * monthlyPrice + input.annualPlanShare * annualMonthlyEquivalent;

    subscriptionMrr = payingSubscribers * blendedArpuUsd;
  }

  const b2bMrr = input.b2bSeatsPerMonth * input.b2bSeatPriceUsd;
  const grossMrrUsd = subscriptionMrr + b2bMrr + input.otherRevenueMonthlyUsd;

  const chargeEvents =
    input.revenueMode === "subscription" ? payingSubscribers + input.b2bSeatsPerMonth : input.mau;
  const stripeFeesUsd =
    chargeEvents * input.stripeFeeFixedUsd + grossMrrUsd * (input.stripeFeePercent / 100);
  const netMrrUsd = Math.max(0, grossMrrUsd - stripeFeesUsd);

  const items: RevenueLineItem[] = [
    {
      id: "subscription",
      label: "구독 MRR",
      usd: subscriptionMrr,
      detail:
        input.revenueMode === "manual_arpu"
          ? `ARPU ${formatUsd(input.manualArpuUsd)}`
          : `${payingSubscribers.toLocaleString()}명 × ${formatUsd(blendedArpuUsd)}`,
    },
    {
      id: "b2b",
      label: "B2B 좌석",
      usd: b2bMrr,
      detail: `${input.b2bSeatsPerMonth} seats`,
    },
    {
      id: "other",
      label: "기타 수익",
      usd: input.otherRevenueMonthlyUsd,
      detail: "fixed/mo",
    },
    {
      id: "stripe",
      label: "Stripe 수수료",
      usd: -stripeFeesUsd,
      detail: `${input.stripeFeePercent}% + $${input.stripeFeeFixedUsd}`,
    },
  ].filter((item) => item.usd !== 0 || item.id === "subscription");

  return {
    derived: {
      conversionPool,
      payingSubscribers,
      blendedArpuUsd,
      grossMrrUsd,
      stripeFeesUsd,
      netMrrUsd,
      mrrPerMauUsd: input.mau > 0 ? netMrrUsd / input.mau : 0,
    },
    items,
    grossUsd: grossMrrUsd,
    netUsd: netMrrUsd,
    grossKrw: grossMrrUsd * input.usdToKrw,
    netKrw: netMrrUsd * input.usdToKrw,
  };
}

export interface UnitEconomicsResult {
  costUsd: number;
  costKrw: number;
  revenueGrossUsd: number;
  revenueNetUsd: number;
  revenueNetKrw: number;
  profitUsd: number;
  profitKrw: number;
  marginOnNetRevenue: number;
  profitPerMauUsd: number;
  breakEvenMau: number | null;
}

const FIXED_COST_IDS = new Set(["cloudflare", "db-hosting", "db-disk", "clerk-base"]);

export function runUnitEconomics(
  costTotalUsd: number,
  costMau: number,
  revenue: RevenueSimulationResult,
  usdToKrw: number,
  costBreakdown?: {
    fixedCostUsd: number;
    variableCostUsd: number;
    items?: Array<{ id: string; usd: number; bucket?: "fixed" | "variable" }>;
  },
): UnitEconomicsResult {
  const profitUsd = revenue.netUsd - costTotalUsd;

  const fixedCost =
    costBreakdown?.fixedCostUsd ??
    costBreakdown?.items
      ?.filter((i) => i.bucket === "fixed" || FIXED_COST_IDS.has(i.id))
      .reduce((s, i) => s + i.usd, 0) ??
    0;
  const variableCost = costBreakdown?.variableCostUsd ?? Math.max(0, costTotalUsd - fixedCost);
  const variableCostPerMau = costMau > 0 ? variableCost / costMau : 0;
  const netRevenuePerMau = revenue.derived.mrrPerMauUsd;

  let breakEvenMau: number | null = null;
  if (netRevenuePerMau > variableCostPerMau && fixedCost > 0) {
    breakEvenMau = Math.ceil(fixedCost / (netRevenuePerMau - variableCostPerMau));
  } else if (netRevenuePerMau > 0 && fixedCost === 0) {
    breakEvenMau = profitUsd >= 0 ? costMau : null;
  }

  return {
    costUsd: costTotalUsd,
    costKrw: costTotalUsd * usdToKrw,
    revenueGrossUsd: revenue.grossUsd,
    revenueNetUsd: revenue.netUsd,
    revenueNetKrw: revenue.netKrw,
    profitUsd,
    profitKrw: profitUsd * usdToKrw,
    marginOnNetRevenue: revenue.netUsd > 0 ? profitUsd / revenue.netUsd : 0,
    profitPerMauUsd: costMau > 0 ? profitUsd / costMau : 0,
    breakEvenMau,
  };
}
