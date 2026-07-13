export {
  FATAL_NGRAM_MIN_SAMPLES,
  FATAL_NGRAM_ERROR_RATE_THRESHOLD,
  CLOUD_TYPING_MIN_DENOM,
  BURST_LATENCY_MAX_MS,
  BURST_MIN_SAMPLES,
  BURST_TOP_N,
} from "./constants";

export type {
  KeystrokeDiagnostics,
  BurstNgram,
  FatalNgramEntry,
  CloudTypingLevel,
  CloudTypingEffectiveness,
  CloudTypingDiagnostics,
  OutgoingTransitionSample,
  SpatialErrorDistanceResult,
  ChartData,
} from "./types";

export {
  computeNormalizedDifference,
  extractOutgoingSamples,
  filterOutgoingHesitation,
  isCloudTypingStroke,
  computePearsonCorrelation,
  computeCloudTypingFromSamples,
  computeCloudTypingDiagnostics,
} from "./cloudTyping";

export {
  getCloudTypingEffectivenessLabel,
  cloudTypingEffectivenessToneClass,
} from "./effectivenessLabel";
export { buildDiagnosticsAccumulator } from "./accumulator";
export { finalizeKeystrokeDiagnostics, selectFatalNgrams, selectBurstNgrams } from "./finalize";
export { calculateChartData } from "./chart";
