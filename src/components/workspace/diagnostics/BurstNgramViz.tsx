import React from "react";
import type { BurstNgram } from "@/utils/cylindricalStats";
import { formatKeyJamo } from "./formatKey";

export function BurstNgramViz({ entry, rank }: { entry: BurstNgram; rank: number }) {
  return (
    <div className="cyl-diag__ngram-entry">
      <div className="cyl-diag__ngram-viz">
        <span className="cyl-diag__ngram-rank">#{rank}</span>
        {entry.sequence.map((key, i, arr) => (
          <React.Fragment key={i}>
            <kbd className="cyl-diag__ngram-key cyl-diag__ngram-key--burst">
              {formatKeyJamo(key)}
            </kbd>
            {i < arr.length - 1 && <span className="cyl-diag__ngram-arrow">→</span>}
          </React.Fragment>
        ))}
      </div>
      <div className="cyl-diag__penalty-content">
        <span className="cyl-diag__penalty-val">{entry.avgLatencyMs.toFixed(1)} ms</span>
        <span className="cyl-diag__penalty-count">{entry.count}회</span>
      </div>
    </div>
  );
}
