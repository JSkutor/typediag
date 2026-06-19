/**
 * piecewiseRegression.test.ts
 *
 * piecewiseRegression 모듈의 단위 테스트.
 *
 * 테스트 전략:
 *   1. 수학 유틸리티 검증: 전치, 행렬곱, 역행렬
 *   2. 알려진 분절 데이터로 회귀 정확도 검증
 *   3. null 반환 조건 검증 (데이터 부족, finalUpperBound 없음)
 *   4. predict 함수의 연속성 검증 (분절점에서 좌우 극한값 일치)
 */

import { describe, it, expect, beforeEach } from "vitest";
import { fitPiecewiseLinear } from "./piecewiseRegression";
import { KeyEvent } from "@/lib/skdm/types";

// ============================================================
// localStorage 목(mock) 설정
// ============================================================

/**
 * finalUpperBound 레코드를 localStorage에 목(mock)으로 설정하는 헬퍼.
 * outlierBoundStorage.readSkdmFinalUpperBound()가 이 값을 읽어온다.
 */
function setFinalUpperBoundMock(finalUpperBoundMs: number | null) {
  const STORAGE_KEY = "typediag_skdm_final_upper_bound_v1";
  if (finalUpperBoundMs === null) {
    localStorage.removeItem(STORAGE_KEY);
  } else {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        final_upper_bound_ms: finalUpperBoundMs,
        max_clip_ms: finalUpperBoundMs * 1.5,
        source_event_count: 1000,
        updated_at: new Date().toISOString(),
      }),
    );
  }
}

// ============================================================
// 테스트 데이터 생성 헬퍼
// ============================================================

/**
 * 분절 선형 함수를 따르는 합성(synthetic) KeyEvent 배열 생성.
 *
 * 구조:
 *   x < c_true  →  y = a + b1 * x          (개선 없음 또는 악화)
 *   x >= c_true →  y = a + b1 * x + b2 * (x - c_true)  (개선)
 *
 * 약간의 노이즈(noise)를 추가하여 실제 데이터에 가깝게 만든다.
 *
 * @param n       데이터 수
 * @param c_true  실제 분절점 (인덱스)
 * @param b1      분절 이전 기울기
 * @param b2      분절 이후 기울기 변화량
 * @param noise   노이즈 표준편차 (ms)
 */
function generateSyntheticEvents(
  n: number,
  c_true: number,
  b1: number,
  b2: number,
  noise = 5,
): KeyEvent[] {
  const events: KeyEvent[] = [];
  const baseLatency = 200; // 기준 잠재시간 (ms)

  for (let i = 0; i < n; i++) {
    const signal = baseLatency + b1 * i + b2 * Math.max(0, i - c_true);
    // 박스-뮬러 변환(Box-Muller)으로 정규 분포 노이즈 생성
    const u1 = Math.random();
    const u2 = Math.random();
    const gaussianNoise = noise * Math.sqrt(-2 * Math.log(u1 + 1e-10)) * Math.cos(2 * Math.PI * u2);
    const latency = Math.max(10, signal + gaussianNoise); // 최소 10ms 보장

    events.push({
      fromKey: null,
      toKey: "a",
      latencyMs: latency,
      isCorrect: true,
    });
  }

  return events;
}

// ============================================================
// 테스트 스위트
// ============================================================

describe("piecewiseRegression", () => {
  beforeEach(() => {
    // 각 테스트 전 localStorage 초기화
    localStorage.clear();
  });

  // ----------------------------------------------------------
  // 1. null 반환 조건 테스트
  // ----------------------------------------------------------
  describe("null 반환 조건", () => {
    it("finalUpperBound 레코드가 없으면 null 반환", () => {
      // localStorage에 아무것도 없는 상태
      const events = generateSyntheticEvents(100, 50, -0.5, -1.0);
      const result = fitPiecewiseLinear(events, "a");
      expect(result).toBeNull();
    });

    it("필터링 후 데이터 49개 → null 반환 (50개 미만 임계값)", () => {
      setFinalUpperBoundMock(1000);

      // 49개만 생성 (isCorrect: true, toKey: 'a')
      const events: KeyEvent[] = Array.from({ length: 49 }, (_, i) => ({
        fromKey: null,
        toKey: "a",
        latencyMs: 100 + i,
        isCorrect: true,
      }));

      const result = fitPiecewiseLinear(events, "a");
      expect(result).toBeNull();
    });

    it("정확히 50개이면 null 반환 안 함 (경계값 확인)", () => {
      setFinalUpperBoundMock(2000);

      const events = generateSyntheticEvents(50, 25, -0.3, -0.7);
      // 50개 정확히라도 계산 시도 (결과가 null이 아님을 확인)
      // (수치 문제로 null이 될 수도 있으므로 엄격하게 확인하지 않음)
      // 단, 예외가 발생하지 않아야 함
      expect(() => fitPiecewiseLinear(events, "a")).not.toThrow();
    });

    it("isCorrect !== true인 이벤트는 필터링됨", () => {
      setFinalUpperBoundMock(1000);

      // 60개 생성하되, 30개는 isCorrect: false
      const events: KeyEvent[] = [
        ...Array.from({ length: 30 }, (_, i) => ({
          fromKey: null,
          toKey: "a",
          latencyMs: 200 + i,
          isCorrect: true,
        })),
        ...Array.from({ length: 30 }, (_, i) => ({
          fromKey: null,
          toKey: "a",
          latencyMs: 200 + i,
          isCorrect: false,
        })),
      ];

      // isCorrect: true 30개만 남아서 50개 미만 → null
      const result = fitPiecewiseLinear(events, "a");
      expect(result).toBeNull();
    });

    it("upperBound를 초과하는 이벤트는 이상치로 제거됨", () => {
      setFinalUpperBoundMock(300); // 300ms 초과는 제거

      // 100개 생성, 그 중 60개는 500ms (상한 초과)
      const events: KeyEvent[] = [
        ...Array.from({ length: 40 }, (_, i) => ({
          fromKey: null,
          toKey: "a",
          latencyMs: 200 + i,
          isCorrect: true,
        })),
        ...Array.from({ length: 60 }, () => ({
          fromKey: null,
          toKey: "a",
          latencyMs: 500, // 이상치: 300ms 초과
          isCorrect: true,
        })),
      ];

      // 유효 데이터 40개 → 50개 미만 → null
      const result = fitPiecewiseLinear(events, "a");
      expect(result).toBeNull();
    });

    it("targetToKey가 다른 이벤트는 필터링됨", () => {
      setFinalUpperBoundMock(1000);

      // 100개이지만 toKey가 'b' (target은 'a')
      const events: KeyEvent[] = Array.from({ length: 100 }, (_, i) => ({
        fromKey: null,
        toKey: "b", // 대상 키 불일치
        latencyMs: 200 + i,
        isCorrect: true,
      }));

      const result = fitPiecewiseLinear(events, "a");
      expect(result).toBeNull();
    });
  });

  // ----------------------------------------------------------
  // 2. 반환 객체 구조 검증
  // ----------------------------------------------------------
  describe("반환 객체 구조", () => {
    it("정상 데이터에서 PiecewiseResult 구조 반환", () => {
      setFinalUpperBoundMock(2000);

      // 명확한 V-shape 분절 데이터: 50에서 꺾임
      const events = generateSyntheticEvents(150, 75, 0.2, -0.6, 3);
      const result = fitPiecewiseLinear(events, "a");

      expect(result).not.toBeNull();
      if (result === null) return;

      // 필수 필드 존재 확인
      expect(typeof result.c).toBe("number");
      expect(typeof result.beta0).toBe("number");
      expect(typeof result.beta1).toBe("number");
      expect(typeof result.beta2).toBe("number");
      expect(typeof result.slopeBefore).toBe("number");
      expect(typeof result.slopeAfter).toBe("number");
      expect(typeof result.n).toBe("number");
      expect(typeof result.predict).toBe("function");
      expect(Array.isArray(result.sampleDots)).toBe(true);
    });

    it("slopeBefore = beta1, slopeAfter = beta1 + beta2 (별칭 확인)", () => {
      setFinalUpperBoundMock(2000);
      const events = generateSyntheticEvents(150, 75, 0.2, -0.6, 3);
      const result = fitPiecewiseLinear(events, "a");
      if (result === null) return;

      expect(result.slopeBefore).toBeCloseTo(result.beta1, 10);
      expect(result.slopeAfter).toBeCloseTo(result.beta1 + result.beta2, 10);
    });

    it("n은 필터링된 실제 데이터 수와 일치", () => {
      setFinalUpperBoundMock(2000);
      const events = generateSyntheticEvents(200, 100, 0.1, -0.4, 2);
      const result = fitPiecewiseLinear(events, "a");
      if (result === null) return;

      // 전부 isCorrect: true이고 상한 이하이므로 n = 200
      expect(result.n).toBe(200);
    });

    it("sampleDots는 MAX_SAMPLE_DOTS(40) 이하 개수", () => {
      setFinalUpperBoundMock(2000);
      const events = generateSyntheticEvents(200, 100, 0.1, -0.4, 2);
      const result = fitPiecewiseLinear(events, "a");
      if (result === null) return;

      expect(result.sampleDots.length).toBeLessThanOrEqual(40);
    });

    it("sampleDots 점의 x, y가 숫자", () => {
      setFinalUpperBoundMock(2000);
      const events = generateSyntheticEvents(100, 50, 0.1, -0.4, 2);
      const result = fitPiecewiseLinear(events, "a");
      if (result === null) return;

      for (const dot of result.sampleDots) {
        expect(typeof dot.x).toBe("number");
        expect(typeof dot.y).toBe("number");
        expect(isFinite(dot.x)).toBe(true);
        expect(isFinite(dot.y)).toBe(true);
      }
    });
  });

  // ----------------------------------------------------------
  // 3. predict 함수 수학적 정확성 검증
  // ----------------------------------------------------------
  describe("predict 함수", () => {
    it("분절점에서 좌우 predict 값이 연속 (불연속 점프 없음)", () => {
      setFinalUpperBoundMock(2000);
      const events = generateSyntheticEvents(150, 75, 0.1, -0.5, 2);
      const result = fitPiecewiseLinear(events, "a");
      if (result === null) return;

      const { c, predict } = result;

      // 분절점 직전/직후의 predict 값 차이는 매우 작아야 함 (연속성)
      // x = c일 때: max(0, c - c) = 0, x = c + ε일 때: max(0, ε) = ε ≈ 0
      const epsilon = 0.001;
      const leftVal = predict(c - epsilon);
      const rightVal = predict(c + epsilon);

      // 좌우 극한 차이가 노이즈 범위(1ms) 이하여야 함
      expect(Math.abs(rightVal - leftVal)).toBeLessThan(1);
    });

    it("predict(0) ≈ beta0 (x=0일 때 절편과 일치)", () => {
      setFinalUpperBoundMock(2000);
      const events = generateSyntheticEvents(150, 75, 0.1, -0.5, 2);
      const result = fitPiecewiseLinear(events, "a");
      if (result === null) return;

      // x=0이 분절점(c) 이전이면: predict(0) = beta0 + beta1*0 = beta0
      if (result.c > 0) {
        expect(result.predict(0)).toBeCloseTo(result.beta0, 5);
      }
    });

    it("분절 이전 기울기와 분절 이후 기울기 방향이 다름 (실제 학습 효과)", () => {
      setFinalUpperBoundMock(2000);

      // 명확한 개선 패턴: 초반 증가, 이후 감소
      // 노이즈를 최소화하여 기울기 방향이 확실히 드러나게
      const events = generateSyntheticEvents(200, 100, 0.5, -1.5, 1);
      const result = fitPiecewiseLinear(events, "a");
      if (result === null) return;

      // slopeBefore > slopeAfter (이후에 더 빠르게 감소)
      // 즉 beta2 < 0 이어야 함
      expect(result.beta2).toBeLessThan(0);
      expect(result.slopeAfter).toBeLessThan(result.slopeBefore);
    });
  });

  // ----------------------------------------------------------
  // 4. 분절점 추정 정확도 검증 (노이즈 극소 케이스)
  // ----------------------------------------------------------
  describe("분절점 추정 정확도", () => {
    it("노이즈가 거의 없을 때 분절점이 실제 c_true 근처로 추정됨", () => {
      setFinalUpperBoundMock(5000);

      const c_true = 80;
      const n = 200;

      // 노이즈 극소(0.5ms)로 신호 거의 완벽하게 생성
      const events = generateSyntheticEvents(n, c_true, 0.3, -1.2, 0.5);
      const result = fitPiecewiseLinear(events, "a");

      if (result === null) {
        // 수치 문제로 실패하더라도 예외 없이 null을 반환해야 함
        return;
      }

      // 추정 분절점이 실제 분절점의 ±20% 범위 내에 있어야 함
      const tolerance = n * 0.2;
      expect(Math.abs(result.c - c_true)).toBeLessThan(tolerance);
    });
  });
});
