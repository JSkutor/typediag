import type { KeystrokeDiagnostics, ChartData } from "@/utils/cylindricalStats";
import type { PiecewiseFitSuccess } from "@/utils/piecewiseRegression";

export const DEV_MOCK_DIAGNOSTICS: KeystrokeDiagnostics = {
  errorInducement: {
    rate: 14.5,
    count: 29,
    totalErrorStartsCount: 200,
  },
  lateKeystroke: {
    rate: 2.3,
    count: 5,
    totalErrorsCount: 215,
  },
  commonPair: {
    rank: 1,
    from: "ㅇ",
    to: "ㅏ",
    count: 142,
  },
  unconsciousKey: {
    rank: 1,
    key: "ㅁ",
    errorRate: 18.2,
    errorCount: 45,
    totalCount: 247,
  },
  shiftPenalty: {
    shiftMedianMs: 145.2,
    nonShiftMedianMs: 110.5,
    differenceMs: 34.7,
    shiftCount: 82,
  },
  speedMetrics: {
    medianLatencyMs: 95.4,
    equivalentCpm: 628,
  },
  cloudTyping: {
    effectivenessCorrelation: {
      pearsonR: -0.45,
      pValue: 0.012,
      isSignificant: true,
      sampleCount: 150,
    },
    effectiveness: "effective",
    sessionCloudTypingRatio: 0.32,
    key: {
      key: "ㅇ",
      holdMs: 85,
      latencyMs: 42,
      normalizedDifference: 0.33,
      cloudTypingRatio: 0.45,
      sampleCount: 65,
      level: "strong",
    },
    insufficientSample: false,
    analysisPoolCount: 150,
  },
  hesitation: {
    ratio: 12.5,
    hasTendency: true,
    thresholdMs: 180,
  },
  fingerTransitions: {
    // finalizeKeystrokeDiagnostics: (count / total) * 100
    ratios: {
      oppositeHand: 45,
      sameHandPinky: 5,
      sameHandRing: 10,
      sameHandMiddle: 15,
      sameHandIndex: 20,
      other: 5,
    },
    counts: {
      oppositeHand: 450,
      sameHandPinky: 50,
      sameHandRing: 100,
      sameHandMiddle: 150,
      sameHandIndex: 200,
      other: 50,
      total: 1000,
    },
  },
  relativeSpeed: {
    speedDiffMs: -12.5,
    handMedianMs: 105.0,
  },
  latencyConsistency: {
    madMs: 15.2,
    medianMs: 95.4,
    relativeMad: 0.16,
    sampleCount: 1000,
    level: "steady",
    histogram: [10, 45, 120, 250, 300, 180, 70, 20, 5, 0, 0, 0],
    histogramUpperBoundMs: 500,
  },
  spatialErrorDistance: {
    sampleCount: 45,
    quartilesU: { q1: 1.0, q2: 1.1, q3: 1.4 },
    typoCounts: { "ㅁ": 25, "ㄴ": 12, "ㄹ": 8 },
  },
  fatalNgrams: [
    {
      sequence: ["ㄱ", "ㅏ", "ㅂ"],
      errorRate: 25.4,
      totalCount: 150,
    },
    {
      sequence: ["ㅅ", "ㅡ", "ㅇ"],
      errorRate: 18.2,
      totalCount: 220,
    },
  ],
  burstNgrams: [
    {
      sequence: ["ㅇ", "ㅏ", "ㄴ"],
      avgLatencyMs: 45.2,
      count: 85,
    },
    {
      sequence: ["ㅎ", "ㅏ", "ㄷ"],
      avgLatencyMs: 52.1,
      count: 62,
    },
  ],
};

const mockPredict = (x: number) => {
  if (x <= 50) return 120 - 0.5 * x;
  return 95 + 0.1 * (x - 50);
};

export const DEV_MOCK_OUTCOME: PiecewiseFitSuccess = {
  result: {
    c: 50,
    beta0: 120,
    beta1: -0.5,
    beta2: 0.6,
    slopeBefore: -0.5,
    slopeAfter: 0.1,
    n: 100,
    predict: mockPredict,
    sampleDots: Array.from({ length: 40 }, (_, i) => ({
      x: i * 2.5,
      y: mockPredict(i * 2.5) + (Math.random() * 10 - 5),
    })),
  },
  diagnostics: {
    focusKey: "ㅇ",
    boundRecord: {
      final_upper_bound_ms: 200,
      max_clip_ms: 200,
      source_event_count: 150,
      updated_at: new Date().toISOString(),
    },
    upperBoundMs: 200,
    rawCorrectCount: 120,
    excludedByBoundCount: 20,
    c0: 50,
    points: Array.from({ length: 100 }, (_, i) => ({
      x: i,
      y: mockPredict(i) + (Math.random() * 10 - 5),
    })),
  },
};

export const DEV_MOCK_CHART_DATA: ChartData = {
  points: DEV_MOCK_OUTCOME.result.sampleDots,
  regressionSamples: Array.from({ length: 100 }, (_, i) => ({
    x: i,
    y: mockPredict(i),
  })),
  xMax: 100,
  domainYMin: 50,
  domainYMax: 150,
  yTickValues: [50, 100, 150],
};
