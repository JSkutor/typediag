/**
 * piecewiseRegression.ts
 *
 * 특정 키(toKey)에 대한 타자 개선도를 분석하는 분절 선형 회귀(Piecewise Linear Regression) 모듈.
 *
 * 알고리즘 흐름:
 *   1. 입력 이벤트 배열을 (toKey === targetToKey && isCorrect === true) 조건으로 필터링.
 *   2. finalUpperBound를 localStorage에서 로드하여 이상치(outlier) 제거 상한선으로 사용.
 *      - finalUpperBound 레코드가 없으면 → null 반환 (데이터 부족으로 간주).
 *      - 필터 후 데이터 50개 미만이어도 → null 반환.
 *   3. X = 시간 순서 인덱스 [0, 1, 2, ..., N-1], Y = latencyMs 배열.
 *   4. 그리드 서치(Grid Search)로 최적 초기 분절점 c₀ 추정.
 *   5. 무제오 알고리즘(Muggeo's Method)으로 c₀를 정밀 수렴시켜 최종 c 도출.
 *   6. 최소제곱법(OLS)으로 최종 방정식 계수(beta0, beta1, beta2) 계산.
 *   7. PiecewiseResult 객체 반환.
 *
 * 반환되는 방정식:
 *   x <= c  →  y = beta0 + beta1 * x
 *   x >  c  →  y = beta0 + beta1 * x + beta2 * (x - c)
 *
 * 참고 문헌:
 *   Muggeo, V.M.R. (2003). Estimating regression models with unknown break-points.
 *   Statistics in Medicine, 22(19), 3055-3071.
 */

import { KeyEvent } from "@/lib/skdm/types";
import { readSkdmFinalUpperBound } from "@/lib/skdm/outlierBoundStorage";

// ============================================================
// 행렬 유틸리티 함수 (Matrix Math Utilities)
// 외부 라이브러리 없이 소규모 행렬(3×3, 4×4) 연산만 지원.
// ============================================================

/** 행렬을 나타내는 타입 (행 우선, 2D 배열) */
type Matrix = number[][];

/**
 * 행렬 전치 (Transpose)
 * A[i][j] → Aᵀ[j][i]
 */
function transpose(A: Matrix): Matrix {
  const rows = A.length;
  const cols = A[0].length;
  const result: Matrix = Array.from({ length: cols }, () => new Array(rows).fill(0));
  for (let i = 0; i < rows; i++) {
    for (let j = 0; j < cols; j++) {
      result[j][i] = A[i][j];
    }
  }
  return result;
}

/**
 * 행렬 곱셈 (Matrix Multiplication)
 * A (m×n) × B (n×p) → C (m×p)
 */
function multiply(A: Matrix, B: Matrix): Matrix {
  const m = A.length;
  const n = A[0].length;
  const p = B[0].length;
  const result: Matrix = Array.from({ length: m }, () => new Array(p).fill(0));
  for (let i = 0; i < m; i++) {
    for (let k = 0; k < n; k++) {
      for (let j = 0; j < p; j++) {
        result[i][j] += A[i][k] * B[k][j];
      }
    }
  }
  return result;
}

/**
 * 정방 행렬의 역행렬 계산 (Gauss-Jordan Elimination)
 * 수치 불안정(행렬식 ≈ 0)이면 null 반환.
 *
 * 알고리즘:
 *   [A | I] → 가우스-조르당 소거 → [I | A⁻¹]
 */
function invert(A: Matrix): Matrix | null {
  const n = A.length;

  // 증강 행렬 [A | I] 생성
  const aug: Matrix = A.map((row, i) =>
    row.map((val) => val).concat(Array.from({ length: n }, (_, j) => (j === i ? 1 : 0))),
  );

  for (let col = 0; col < n; col++) {
    // 피벗 행 선택 (부분 피벗팅으로 수치 안정성 향상)
    let maxRow = col;
    let maxVal = Math.abs(aug[col][col]);
    for (let row = col + 1; row < n; row++) {
      if (Math.abs(aug[row][col]) > maxVal) {
        maxVal = Math.abs(aug[row][col]);
        maxRow = row;
      }
    }

    // 피벗이 너무 작으면 특이 행렬로 간주 → null 반환
    if (Math.abs(aug[maxRow][col]) < 1e-12) {
      return null;
    }

    // 피벗 행과 현재 행 교환
    [aug[col], aug[maxRow]] = [aug[maxRow], aug[col]];

    // 피벗 행 정규화 (pivot → 1)
    const pivot = aug[col][col];
    for (let j = 0; j < 2 * n; j++) {
      aug[col][j] /= pivot;
    }

    // 다른 행에서 현재 열 소거
    for (let row = 0; row < n; row++) {
      if (row === col) continue;
      const factor = aug[row][col];
      for (let j = 0; j < 2 * n; j++) {
        aug[row][j] -= factor * aug[col][j];
      }
    }
  }

  // 증강 행렬의 오른쪽 절반 추출 → A⁻¹
  return aug.map((row) => row.slice(n));
}

/**
 * 행렬-벡터 곱셈 (Matrix × Column Vector)
 * A (m×n) × v (n×1 열벡터) → result (m×1 열벡터)
 * 편의상 v는 1D 배열로 받고, 결과도 1D 배열로 반환.
 */
function multiplyMatVec(A: Matrix, v: number[]): number[] {
  return A.map((row) => row.reduce((sum, val, j) => sum + val * v[j], 0));
}

// ============================================================
// OLS 헬퍼 (Ordinary Least Squares Helper)
// ============================================================

/**
 * 주어진 설계 행렬 X_design 과 반응 변수 Y로 OLS 계수를 계산.
 *
 * β = (XᵀX)⁻¹ Xᵀy
 *
 * @returns 계수 벡터 β (1D 배열), 역행렬 실패 시 null
 */
function computeOLS(X_design: Matrix, Y: number[]): number[] | null {
  const Xt = transpose(X_design);

  // XᵀX 계산
  const XtX = multiply(Xt, X_design);
  const XtX_inv = invert(XtX);
  if (XtX_inv === null) return null;

  // Xᵀy 계산 (Xt는 cols×N, y는 N 길이)
  const Xty = multiplyMatVec(Xt, Y);

  // β = (XᵀX)⁻¹ Xᵀy
  return multiplyMatVec(XtX_inv, Xty);
}

// ============================================================
// 분절 회귀 핵심 함수
// ============================================================

/**
 * 분절점 c가 주어졌을 때 3열 설계 행렬을 생성.
 *
 * 각 행: [1, x_i, max(0, x_i - c)]
 *   - 열 0: 절편 (intercept)
 *   - 열 1: 선형 기울기 (β1)
 *   - 열 2: 분절 이후 기울기 변화량 (β2)
 */
function buildDesignMatrix3(xs: number[], c: number): Matrix {
  return xs.map((x) => [1, x, Math.max(0, x - c)]);
}

/**
 * 그리드 서치로 초기 분절점 c₀ 추정.
 *
 * 데이터 인덱스 범위를 일정 간격으로 나누어 각 후보 c에 대해
 * OLS 잔차제곱합(RSS)을 계산하고, 최소 RSS를 주는 c를 반환.
 *
 * 양 끝단(10%~90%)만 탐색하여 극단 분절점을 피함.
 *
 * @param xs  X 배열 (시간 순서 인덱스)
 * @param Y   Y 배열 (latencyMs)
 * @returns   최적 초기 분절점 c₀
 */
function gridSearchC0(xs: number[], Y: number[]): number {
  const n = xs.length;

  // 양 끝 10%를 제외한 구간에서 탐색 (최소 분절 데이터 보장)
  const startIdx = Math.floor(n * 0.1);
  const endIdx = Math.ceil(n * 0.9);

  // 그리드 분할 수: 최대 50 스텝 (데이터가 많아도 과도한 연산 방지)
  const steps = Math.min(50, endIdx - startIdx);
  const stepSize = (endIdx - startIdx) / steps;

  let bestC = xs[startIdx];
  let bestRSS = Infinity;

  for (let i = 0; i <= steps; i++) {
    const candidateIdx = Math.round(startIdx + i * stepSize);
    const c = xs[Math.min(candidateIdx, n - 1)];

    // 3열 설계 행렬로 OLS 적합
    const X_design = buildDesignMatrix3(xs, c);
    const beta = computeOLS(X_design, Y);
    if (beta === null) continue;

    // RSS 계산: Σ(y_i - ŷ_i)²
    let rss = 0;
    for (let j = 0; j < n; j++) {
      const yHat = beta[0] + beta[1] * xs[j] + beta[2] * Math.max(0, xs[j] - c);
      rss += (Y[j] - yHat) ** 2;
    }

    if (rss < bestRSS) {
      bestRSS = rss;
      bestC = c;
    }
  }

  return bestC;
}

/**
 * 무제오 알고리즘(Muggeo's Method)으로 분절점 c를 반복 수렴.
 *
 * 핵심 아이디어:
 *   설계 행렬에 지시 함수(indicator) 열 I(x > c)를 추가해
 *   4열 설계 행렬 [1, x, max(0, x-c), I(x>c)]로 OLS를 풀면,
 *   β3 (지시 함수 계수)가 c 업데이트 방향을 알려준다.
 *
 *   c_new = c - β3 / β2  (기울기 변화량으로 정규화)
 *
 * 이를 수렴할 때까지 반복 (최대 maxIter 회).
 *
 * @param xs       X 배열
 * @param Y        Y 배열
 * @param c0       초기 분절점
 * @param maxIter  최대 반복 횟수 (기본 50)
 * @param tol      수렴 판단 임계값 (기본 1e-6)
 * @returns        수렴된 분절점 c, 수렴 실패 시 c0 반환
 */
function muggeoMethod(xs: number[], Y: number[], c0: number, maxIter = 50, tol = 1e-6): number {
  let c = c0;
  const n = xs.length;
  const xMin = xs[0];
  const xMax = xs[n - 1];

  for (let iter = 0; iter < maxIter; iter++) {
    // 4열 설계 행렬: [1, x, max(0, x-c), I(x>c)]
    const X_design: Matrix = xs.map((x) => [
      1,
      x,
      Math.max(0, x - c),
      x > c ? 1 : 0, // 지시 함수 (indicator function)
    ]);

    const beta = computeOLS(X_design, Y);
    if (beta === null) break; // 역행렬 실패 시 현재 c 반환

    const [, , beta2, beta3] = beta;

    // beta2 (기울기 변화량)가 0에 가깝면 분절점 업데이트 불가 → 종료
    if (Math.abs(beta2) < 1e-10) break;

    // 무제오 업데이트 공식: c_new = c - β3 / β2
    const cNew = c - beta3 / beta2;

    // c가 데이터 범위를 벗어나지 않도록 클리핑
    const cClamped = Math.max(xMin, Math.min(xMax, cNew));

    // 수렴 판단: |c_new - c| < tol
    if (Math.abs(cClamped - c) < tol) {
      c = cClamped;
      break;
    }

    c = cClamped;
  }

  return c;
}

// ============================================================
// 공개 인터페이스 (Public Interface)
// ============================================================

/**
 * 분절 선형 회귀 결과 타입.
 *
 * 방정식:
 *   x <= c  →  y = beta0 + beta1 * x
 *   x >  c  →  y = (beta0 + beta1 * x) + beta2 * (x - c)
 *             = beta0 + (beta1 + beta2) * x - beta2 * c
 */
export interface PiecewiseResult {
  /** 수렴된 분절점 (X 인덱스 기준) */
  c: number;
  /** 절편 */
  beta0: number;
  /** 분절 이전 기울기 */
  beta1: number;
  /** 분절 이후 기울기 변화량 (분절 이후 기울기 = beta1 + beta2) */
  beta2: number;
  /** 분절 이전 기울기 (편의용 별칭) */
  slopeBefore: number;
  /** 분절 이후 기울기 (편의용 별칭) */
  slopeAfter: number;
  /** 실제 회귀에 사용된 데이터 점 수 */
  n: number;
  /** 이 방정식으로 x 위치의 y 값을 예측하는 함수 */
  predict: (x: number) => number;
  /**
   * 그래프 시각화를 위해 샘플링된 원본 데이터 점.
   * 전체 N개 중 최대 MAX_SAMPLE_DOTS개를 균등 샘플링.
   */
  sampleDots: Array<{ x: number; y: number }>;
}

/** 시각화에 사용할 원본 데이터 도트 최대 샘플 수 */
const MAX_SAMPLE_DOTS = 40;

/**
 * 특정 키에 대한 분절 선형 회귀를 수행하고 방정식을 반환.
 *
 * @param events      KeyEvent 배열 (전체 세션 데이터)
 * @param targetToKey 분석할 키 (예: "a", "ㄱ")
 * @returns           PiecewiseResult 또는 null
 *                    - null 반환 조건:
 *                      1) localStorage에 finalUpperBound 레코드가 없을 때
 *                      2) 필터링 후 유효 데이터가 50개 미만일 때
 *                      3) 행렬 역산 실패(특이 행렬)로 OLS 계산이 불가능할 때
 */
export function fitPiecewiseLinear(
  events: KeyEvent[],
  targetToKey: string,
): PiecewiseResult | null {
  // ----------------------------------------------------------
  // Step 1: finalUpperBound 로드 (데이터 충분성 보증 역할)
  // ----------------------------------------------------------
  const boundRecord = readSkdmFinalUpperBound();
  if (boundRecord === null) {
    // finalUpperBound가 없으면 아직 세션 데이터가 충분히 쌓이지 않은 상태
    return null;
  }

  const upperBoundMs = boundRecord.final_upper_bound_ms;

  // ----------------------------------------------------------
  // Step 2: 데이터 필터링
  //   조건 1) toKey가 대상 키와 일치
  //   조건 2) 정답 타자 이벤트 (isCorrect === true)
  //   조건 3) latencyMs가 upperBoundMs 이하 (이상치 제거)
  //   조건 4) latencyMs가 양수 (음수/0 방어)
  // ----------------------------------------------------------
  const filtered = events.filter(
    (e) =>
      e.toKey === targetToKey &&
      e.isCorrect === true &&
      e.latencyMs > 0 &&
      e.latencyMs <= upperBoundMs,
  );

  // 데이터 50개 미만이면 회귀 분석 의미 없음 → null 반환
  if (filtered.length < 50) {
    return null;
  }

  const n = filtered.length;

  // ----------------------------------------------------------
  // Step 3: X, Y 배열 구성
  //   X = 시간 순서 인덱스 [0, 1, 2, ..., N-1]
  //   Y = latencyMs 값
  // ----------------------------------------------------------
  const xs: number[] = Array.from({ length: n }, (_, i) => i);
  const Y: number[] = filtered.map((e) => e.latencyMs);

  // ----------------------------------------------------------
  // Step 4: 그리드 서치로 초기 분절점 c₀ 추정
  // ----------------------------------------------------------
  const c0 = gridSearchC0(xs, Y);

  // ----------------------------------------------------------
  // Step 5: 무제오 알고리즘으로 c₀ 정밀 수렴 → 최종 c 도출
  // ----------------------------------------------------------
  const c = muggeoMethod(xs, Y, c0);

  // ----------------------------------------------------------
  // Step 6: 최종 c로 OLS 최소제곱법 → 방정식 계수 도출
  //   설계 행렬: [1, x, max(0, x - c)]
  //   β = [beta0, beta1, beta2]
  // ----------------------------------------------------------
  const X_final = buildDesignMatrix3(xs, c);
  const beta = computeOLS(X_final, Y);

  if (beta === null) {
    // 최종 OLS 역행렬 실패 (데이터가 완전히 동일한 x값을 갖는 극단 경우)
    return null;
  }

  const [beta0, beta1, beta2] = beta;

  // ----------------------------------------------------------
  // Step 7: predict 함수 생성
  // ----------------------------------------------------------
  const predict = (x: number): number => {
    return beta0 + beta1 * x + beta2 * Math.max(0, x - c);
  };

  // ----------------------------------------------------------
  // Step 8: 시각화용 원본 데이터 도트 균등 샘플링
  //   전체 N개 중 MAX_SAMPLE_DOTS개를 고르게 추출.
  // ----------------------------------------------------------
  const sampleDots: Array<{ x: number; y: number }> = [];
  if (n <= MAX_SAMPLE_DOTS) {
    // 데이터가 적으면 전부 포함
    for (let i = 0; i < n; i++) {
      sampleDots.push({ x: xs[i], y: Y[i] });
    }
  } else {
    // 균등 간격으로 MAX_SAMPLE_DOTS개 샘플링
    for (let i = 0; i < MAX_SAMPLE_DOTS; i++) {
      const idx = Math.round((i / (MAX_SAMPLE_DOTS - 1)) * (n - 1));
      sampleDots.push({ x: xs[idx], y: Y[idx] });
    }
  }

  return {
    c,
    beta0,
    beta1,
    beta2,
    slopeBefore: beta1,
    slopeAfter: beta1 + beta2,
    n,
    predict,
    sampleDots,
  };
}
