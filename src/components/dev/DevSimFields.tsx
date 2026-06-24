"use client";

import { formatUsd } from "@/lib/dev/costSimulation";

import styles from "./DevCostSimulationPanel.module.css";

export interface SliderFieldProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  format?: (v: number) => string;
  hint?: string;
  onChange: (v: number) => void;
}

export function SliderField({
  label,
  value,
  min,
  max,
  step,
  format = (v) => String(v),
  hint,
  onChange,
}: SliderFieldProps) {
  return (
    <div className={styles.field}>
      <div className={styles.fieldLabelRow}>
        <span className={styles.fieldLabel}>{label}</span>
        <span className={styles.fieldValue}>{format(value)}</span>
      </div>
      <input
        type="range"
        className={styles.rangeInput}
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      />
      {hint ? <span className={styles.fieldHint}>{hint}</span> : null}
    </div>
  );
}

export interface NumberFieldProps {
  label: string;
  value: number;
  min?: number;
  max?: number;
  step?: number;
  hint?: string;
  onChange?: (v: number) => void;
  disabled?: boolean;
}

export function NumberField({
  label,
  value,
  min,
  max,
  step = 1,
  hint,
  onChange,
  disabled,
}: NumberFieldProps) {
  return (
    <div className={styles.field}>
      <label className={styles.fieldLabel}>{label}</label>
      <input
        type="number"
        className={styles.numberInput}
        value={value}
        min={min}
        max={max}
        step={step}
        onChange={(e) => onChange?.(Number(e.target.value))}
        disabled={disabled}
      />
      {hint ? <span className={styles.fieldHint}>{hint}</span> : null}
    </div>
  );
}

interface MauFieldProps {
  value: number;
  onChange: (mau: number) => void;
  mauToSlider: (mau: number) => number;
  sliderToMau: (slider: number) => number;
}

export function MauField({ value, onChange, mauToSlider, sliderToMau }: MauFieldProps) {
  const slider = mauToSlider(value);
  return (
    <div className={styles.field}>
      <div className={styles.fieldLabelRow}>
        <span className={styles.fieldLabel}>MAU</span>
        <span className={styles.fieldValue}>{value.toLocaleString()}</span>
      </div>
      <input
        type="range"
        className={styles.rangeInput}
        min={0}
        max={100}
        step={0.1}
        value={slider}
        onChange={(e) => onChange(sliderToMau(Number(e.target.value)))}
      />
      <input
        type="number"
        className={styles.numberInput}
        min={1}
        max={10_000_000}
        step={1}
        value={value}
        onChange={(e) => onChange(Math.max(1, Number(e.target.value) || 1))}
      />
      <span className={styles.fieldHint}>슬라이더 10~50만(로그). 소규모는 숫자 입력 1 단위.</span>
    </div>
  );
}

export function BreakdownList({
  items,
  maxUsd,
  valueKey = "usd",
}: {
  items: Array<{ id: string; label: string; usd: number; detail: string }>;
  maxUsd: number;
  valueKey?: "usd";
}) {
  const max = Math.max(maxUsd, 0.01);
  return (
    <div className={styles.breakdownList}>
      {items.map((item) => {
        const val = item[valueKey];
        const abs = Math.abs(val);
        return (
          <div key={item.id} className={styles.breakdownRow}>
            <span className={styles.breakdownLabel}>{item.label}</span>
            <div className={styles.breakdownBarTrack}>
              <div
                className={`${styles.breakdownBarFill} ${val < 0 ? styles.breakdownBarNegative : ""}`}
                style={{ width: `${(abs / max) * 100}%` }}
              />
            </div>
            <span className={`${styles.breakdownUsd} ${val < 0 ? styles.breakdownNegative : ""}`}>
              {val < 0 ? "-" : ""}
              {formatUsd(abs)}
            </span>
          </div>
        );
      })}
    </div>
  );
}
