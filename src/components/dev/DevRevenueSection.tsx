"use client";

import type { RevenueSimulationInput } from "@/lib/dev/revenueSimulation";

import { NumberField, SliderField } from "@/components/dev/DevSimFields";
import styles from "./DevCostSimulationPanel.module.css";

interface DevRevenueSectionProps {
  input: RevenueSimulationInput;
  onPatch: (partial: Partial<RevenueSimulationInput>) => void;
  onPatchShared: (partial: Pick<RevenueSimulationInput, "loginRate">) => void;
}

export function DevRevenueSection({ input, onPatch, onPatchShared }: DevRevenueSectionProps) {
  return (
    <div className={styles.paneSections}>
      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>수익 모델</h3>
        <div className={styles.modeToggle}>
          <button
            type="button"
            className={`${styles.modeButton} ${input.revenueMode === "subscription" ? styles.modeButtonActive : ""}`}
            onClick={() => onPatch({ revenueMode: "subscription" })}
          >
            Pro 구독
          </button>
          <button
            type="button"
            className={`${styles.modeButton} ${input.revenueMode === "manual_arpu" ? styles.modeButtonActive : ""}`}
            onClick={() => onPatch({ revenueMode: "manual_arpu" })}
          >
            ARPU 직접
          </button>
        </div>
      </section>

      {input.revenueMode === "subscription" ? (
        <>
          <section className={styles.section}>
            <h3 className={styles.sectionTitle}>Pro 구독</h3>
            <div className={styles.fieldGrid}>
              <NumberField
                label="Pro 월 가격 (USD)"
                value={input.proMonthlyPriceUsd}
                min={0}
                max={50}
                step={0.5}
                hint={`≈ ₩${Math.round(input.proMonthlyPriceUsd * input.usdToKrw).toLocaleString()}`}
                onChange={(proMonthlyPriceUsd) => onPatch({ proMonthlyPriceUsd })}
              />
              <div className={styles.modeToggle}>
                <button
                  type="button"
                  className={`${styles.modeButton} ${input.paidConversionBasis === "logged_in" ? styles.modeButtonActive : ""}`}
                  onClick={() => onPatch({ paidConversionBasis: "logged_in" })}
                >
                  로그인 기준
                </button>
                <button
                  type="button"
                  className={`${styles.modeButton} ${input.paidConversionBasis === "mau" ? styles.modeButtonActive : ""}`}
                  onClick={() => onPatch({ paidConversionBasis: "mau" })}
                >
                  MAU 기준
                </button>
              </div>
              {input.paidConversionBasis === "logged_in" ? (
                <SliderField
                  label="로그인 비율"
                  value={input.loginRate}
                  min={0}
                  max={1}
                  step={0.05}
                  format={(v) => `${Math.round(v * 100)}%`}
                  hint="비용 탭과 동기화"
                  onChange={(loginRate) => onPatchShared({ loginRate })}
                />
              ) : null}
              <SliderField
                label="유료 전환율"
                value={input.paidConversionRate}
                min={0}
                max={0.5}
                step={0.01}
                format={(v) => `${Math.round(v * 100)}%`}
                hint={
                  input.paidConversionBasis === "logged_in"
                    ? "로그인 유저 중 Pro 결제"
                    : "MAU 전체 중 Pro 결제"
                }
                onChange={(paidConversionRate) => onPatch({ paidConversionRate })}
              />
              <SliderField
                label="연간 플랜 비율"
                value={input.annualPlanShare}
                min={0}
                max={0.8}
                step={0.05}
                format={(v) => `${Math.round(v * 100)}%`}
                onChange={(annualPlanShare) => onPatch({ annualPlanShare })}
              />
              <SliderField
                label="연간 할인"
                value={input.annualDiscountRate}
                min={0}
                max={0.3}
                step={0.01}
                format={(v) => `${Math.round(v * 100)}%`}
                hint="예: 17% = 2개월 무료"
                onChange={(annualDiscountRate) => onPatch({ annualDiscountRate })}
              />
            </div>
          </section>

          <section className={styles.section}>
            <h3 className={styles.sectionTitle}>B2B · 결제</h3>
            <div className={styles.fieldGrid}>
              <NumberField
                label="B2B 좌석 / 월"
                value={input.b2bSeatsPerMonth}
                min={0}
                max={500}
                hint="팀/기관 등 B2B 유료 좌석 판매 수 (기본 0)"
                onChange={(b2bSeatsPerMonth) => onPatch({ b2bSeatsPerMonth })}
              />
              <NumberField
                label="B2B 좌석 가격"
                value={input.b2bSeatPriceUsd}
                min={0}
                max={200}
                hint="좌석당 월 가격 (기본 $15)"
                onChange={(b2bSeatPriceUsd) => onPatch({ b2bSeatPriceUsd })}
              />
              <SliderField
                label="Stripe %"
                value={input.stripeFeePercent}
                min={0}
                max={5}
                step={0.1}
                format={(v) => `${v.toFixed(1)}%`}
                hint="결제 건당 정률 수수료 (기본 2.9%)"
                onChange={(stripeFeePercent) => onPatch({ stripeFeePercent })}
              />
              <NumberField
                label="Stripe 고정 $/건"
                value={input.stripeFeeFixedUsd}
                min={0}
                max={1}
                step={0.05}
                hint="결제 건당 정액 수수료 (기본 $0.30)"
                onChange={(stripeFeeFixedUsd) => onPatch({ stripeFeeFixedUsd })}
              />
              <NumberField
                label="기타 수익 $/mo"
                value={input.otherRevenueMonthlyUsd}
                min={0}
                max={10_000}
                hint="스폰서십 등"
                onChange={(otherRevenueMonthlyUsd) => onPatch({ otherRevenueMonthlyUsd })}
              />
            </div>
          </section>
        </>
      ) : (
        <section className={styles.section}>
          <h3 className={styles.sectionTitle}>ARPU</h3>
          <NumberField
            label="MAU당 월 ARPU (USD)"
            value={input.manualArpuUsd}
            min={0}
            max={10}
            step={0.01}
            onChange={(manualArpuUsd) => onPatch({ manualArpuUsd })}
          />
        </section>
      )}
    </div>
  );
}
