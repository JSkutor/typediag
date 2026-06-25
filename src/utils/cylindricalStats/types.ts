import type { PiecewiseFitOutcome } from "@/utils/piecewiseRegression";

export interface KeystrokeDiagnostics {
  errorInducement: {
    rate: number;
    count: number;
    totalErrorStartsCount: number;
  };
  lateKeystroke: {
    rate: number;
    count: number;
    totalErrorsCount: number;
  };
  commonPair: {
    rank: number;
    from: string;
    to: string;
    count: number;
  } | null;
  unconsciousKey: {
    rank: number;
    key: string;
    errorRate: number;
    errorCount: number;
    totalCount: number;
  } | null;
  shiftPenalty: {
    shiftMedianMs: number;
    nonShiftMedianMs: number;
    differenceMs: number;
    shiftCount: number;
  } | null;
  speedMetrics: {
    medianLatencyMs: number;
    equivalentCpm: number;
  };
  cloudTyping: CloudTypingDiagnostics;
  hesitation: {
    ratio: number;
    hasTendency: boolean;
    thresholdMs: number;
  };
  fingerTransitions: {
    ratios: {
      oppositeHand: number;
      sameHandPinky: number;
      sameHandRing: number;
      sameHandMiddle: number;
      sameHandIndex: number;
      other: number;
    };
    counts: {
      oppositeHand: number;
      sameHandPinky: number;
      sameHandRing: number;
      sameHandMiddle: number;
      sameHandIndex: number;
      other: number;
      total: number;
    };
  };
  relativeSpeed: {
    speedDiffMs: number;
    handMedianMs: number;
  };
  latencyConsistency: {
    madMs: number;
    medianMs: number;
    /** MAD / median — robust analog of coefficient of variation */
    relativeMad: number;
    sampleCount: number;
    level: "steady" | "moderate" | "erratic";
    histogram: number[];
  } | null;
  spatialErrorDistance: SpatialErrorDistanceResult | null;
  fatalNgrams: FatalNgramEntry[];
  burstNgrams: BurstNgram[];
}

export interface BurstNgram {
  sequence: string[];
  avgLatencyMs: number;
  count: number;
}

export interface FatalNgramEntry {
  sequence: string[];
  errorRate: number;
  totalCount: number;
}

export type CloudTypingLevel = "not_applied" | "weak" | "moderate" | "strong";
export type CloudTypingEffectiveness = "effective" | "counterproductive" | "neutral";

export interface HoldCorrelationResult {
  pearsonR: number;
  pValue: number;
  isSignificant: boolean;
  sampleCount: number;
}

/** outgoing transition(fromKey === focusKey) 집계 결과 */
export interface CloudTypingKeyResult {
  key: string;
  dwellMs: number;
  flightMs: number;
  /** 전이 latency 중앙값 (dwell+flight 바 비율의 분모) */
  latencyMs: number;
  normalizedDifference: number;
  cloudTypingRatio: number;
  sampleCount: number;
  level: CloudTypingLevel;
}

export interface CloudTypingDiagnostics {
  effectivenessCorrelation: HoldCorrelationResult;
  effectiveness: CloudTypingEffectiveness;
  sessionCloudTypingRatio: number;
  key: CloudTypingKeyResult | null;
  /** 분석 풀 n ≤ CLOUD_TYPING_MIN_SAMPLES — 연산 생략 */
  insufficientSample: boolean;
  analysisPoolCount: number;
}

/**
 * 전이 샘플 한 건: outgoing(또는 일반 transition) 행의 latency + fromKey reference transition 행의 hold.
 * hold는 reference transition 행(toKey === focusKey)의 holdDurationMs에 붙는다.
 */
export interface TransitionDwellSample {
  fromKey: string;
  toKey: string;
  latencyMs: number;
  fromHoldMs: number;
}

/** 키 하나에 대한 누산 데이터. buildDiagnosticsAccumulator 내부에서 생성됩니다. */
export interface PerKeyAccumulator {
  /** reference transition 정답 latency 배열 (toKey===key, isCorrect, latencyMs>0). 시간순 보존. */
  referenceLatencies: number[];
  /** reference transition 기준 손가락 전환 카운트 */
  fingerCounts: {
    oppositeHand: number;
    sameHandPinky: number;
    sameHandRing: number;
    sameHandMiddle: number;
    sameHandIndex: number;
    other: number;
    total: number;
  };
  /** outgoing transition 샘플 (fromKey===key). cloud typing 집계용. */
  outgoingSamples: TransitionDwellSample[];
  /** 이 키가 오타 스트릭의 시작점(toKey===key && isErrorStart)인 횟수 */
  errorInducementCount: number;
  /** late keystroke 횟수 (expectedChar===key && nextEvent.toKey===key) */
  lateKeystrokeCount: number;
  /** 공간적 오타 거리 데이터 (expectedChar===key && isCorrect===false) */
  spatialErrors: {
    distancesU: number[];
    typoCounts: Record<string, number>;
  };
  contextualTypos: {
    ngrams: Map<string, { total: number; error: number }>;
  };
}

/** 단일 O(N) 순회로 수집한 전역·키별 누산 데이터 */
export interface DiagnosticsAccumulator {
  /** toKey → correct count (all keys, countCorrectReferenceTransitions와 동일) */
  correctByKey: Map<string, number>;
  /** 전역 순서쌍 빈도 (correct, alpha 키만) */
  pairCounts: Map<string, number>;
  /** 키별 correct/incorrect 카운트 (EXCLUDE_KEYS 제외, unconsciousKey·lateKeystroke 분모용) */
  keyStats: Map<string, { correct: number; incorrect: number }>;
  /** 전역 오타 스트릭 시작 횟수 */
  totalErrorStartsCount: number;
  /** Shift 조합 키 정답 이벤트의 latency 배열 */
  shiftLatencies: number[];
  /** 일반(비-Shift) 정답 이벤트의 latency 배열 */
  nonShiftLatencies: number[];
  /** 키별 누산 데이터 */
  perKey: Map<string, PerKeyAccumulator>;
  /** 버스트 패턴 누산 (latency <= BURST_LATENCY_MAX_MS 연속) */
  bursts: Map<string, { count: number; totalLatencyMs: number }>;
}

export interface SpatialErrorDistanceResult {
  sampleCount: number;
  /** Quartiles of expected→typo distances in layout U units. */
  quartilesU: { q1: number; q2: number; q3: number };
  /** Typo key press counts (toKey when expected was target). */
  typoCounts: Record<string, number>;
}

export interface ChartData {
  points: Array<{ x: number; y: number }>;
  regressionSamples: Array<{ x: number; y: number }>;
  xMax: number;
  domainYMin: number;
  domainYMax: number;
  yTickValues: number[];
}
