/**
 * stats.ts
 *
 * 타자 역학 분석에 사용되는 순수 통계 및 수학 유틸리티 모음.
 */

/**
 * 주어진 값 배열에서 중앙값을 계산합니다.
 */
export function getMedian(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    return (sorted[mid - 1] + sorted[mid]) / 2;
  }
  return sorted[mid];
}

/**
 * Median Absolute Deviation — 중앙값 기준 절대편차의 중앙값.
 * 표준편차보다 이상치에 강건한 분산 지표입니다.
 */
export function getMAD(values: number[]): number {
  if (values.length === 0) return 0;
  const center = getMedian(values);
  const deviations = values.map((v) => Math.abs(v - center));
  return getMedian(deviations);
}

/**
 * 정렬된 배열의 특정 백분위수(Percentile)를 선형 보간(linear interpolation) 방식으로 계산합니다.
 */
export function getPercentile(arr: number[], p: number): number {
  if (arr.length === 0) return 0;
  const idx = p * (arr.length - 1);
  const low = Math.floor(idx);
  const high = Math.ceil(idx);
  if (low === high) return arr[low];
  return arr[low] + (idx - low) * (arr[high] - arr[low]);
}

/**
 * 표준 정규 누적 분포 함수(Standard Normal Cumulative Distribution Function) 계산.
 * A&S 7.1.26 오차함수(erf) 근사식을 이용한 고정밀 근사.
 */
export function normalCDF(z: number): number {
  const p = 0.3275911;
  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;

  const sign = z < 0 ? -1 : 1;
  const x = Math.abs(z) / Math.sqrt(2);
  const t = 1.0 / (1.0 + p * x);
  const erf = 1.0 - ((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);
  return 0.5 * (1.0 + sign * erf);
}

/**
 * Student's t-distribution의 양측 검정(two-tailed) p-value를 계산합니다.
 * df <= 100 일 때는 삼각 급수 전개식을 사용하고, df > 100 일 때는 Wilson-Hilferty 정규 근사법을 적용합니다.
 */
export function getStudentTPValue(t: number, df: number): number {
  if (df <= 0) return 1.0;
  t = Math.abs(t);

  if (df > 100) {
    const term1 = 1 - 2 / (9 * df);
    const term2 = t * Math.pow(1 + (t * t) / df, -1 / 3);
    const z = (term2 * term1) / Math.sqrt(2 / (9 * df));
    return 2 * (1 - normalCDF(Math.abs(z)));
  }

  const x = Math.atan(t / Math.sqrt(df));
  const c = Math.cos(x);
  const s = Math.sin(x);

  if (df % 2 === 1) {
    let term = c;
    let sum = c;
    for (let i = 3; i <= df - 2; i += 2) {
      term = (term * c * c * (i - 1)) / i;
      sum += term;
    }
    return 1 - (2 / Math.PI) * (x + (df > 1 ? s * sum : 0));
  } else {
    let term = 1;
    let sum = 1;
    for (let i = 2; i <= df - 2; i += 2) {
      term = (term * c * c * (i - 1)) / i;
      sum += term;
    }
    return 1 - s * sum;
  }
}
