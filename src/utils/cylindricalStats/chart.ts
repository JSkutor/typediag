import type { PiecewiseFitOutcome } from "@/utils/piecewiseRegression";
import type { ChartData } from "./types";

export function calculateChartData(outcome: PiecewiseFitOutcome | null): ChartData | null {
  if (!outcome || !("result" in outcome)) return null;

  const { points } = outcome.diagnostics;
  const { result } = outcome;

  if (points.length === 0) return null;

  const xMax = Math.max(...points.map((p) => p.x), 1);
  const yValues = points.map((p) => p.y);
  const regressionSamples = [
    { x: 0, y: result.predict(0) },
    { x: result.c, y: result.predict(result.c) },
    { x: xMax, y: result.predict(xMax) },
  ];

  const yMin = Math.min(...yValues, ...regressionSamples.map((p) => p.y));
  const yMax = Math.max(...yValues, ...regressionSamples.map((p) => p.y));
  const yPadding = Math.max(8, (yMax - yMin) * 0.08);
  const domainYMin = yMin - yPadding;
  const domainYMax = yMax + yPadding;

  const yTicksCount = 4;
  const yTickValues = Array.from({ length: yTicksCount }, (_, i) => {
    const t = i / (yTicksCount - 1);
    return domainYMin + t * (domainYMax - domainYMin);
  });

  return {
    points,
    regressionSamples,
    xMax,
    domainYMin,
    domainYMax,
    yTickValues,
  };
}
