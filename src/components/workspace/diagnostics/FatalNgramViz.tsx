import React from "react";
import type { FatalNgramEntry } from "@/utils/cylindricalStats";
import { formatKeyJamo } from "./formatKey";

export function FatalNgramViz({ entry }: { entry: FatalNgramEntry }) {
  return (
    <div className="cyl-diag__ngram-entry">
      <div className="cyl-diag__ngram-viz">
        {entry.sequence.map((key, i, arr) => (
          <React.Fragment key={i}>
            <kbd
              className={`cyl-diag__ngram-key${i === arr.length - 1 ? " cyl-diag__ngram-key--fatal-last" : ""}`}
            >
              {formatKeyJamo(key)}
            </kbd>
            {i < arr.length - 1 && <span className="cyl-diag__ngram-arrow">→</span>}
          </React.Fragment>
        ))}
      </div>
      <div className="cyl-diag__penalty-content">
        <span className="cyl-diag__median-val cyl-diag__median-val--danger">
          {entry.errorRate.toFixed(1)}%
        </span>
        <span className="cyl-diag__penalty-count">{entry.totalCount}회</span>
      </div>
    </div>
  );
}
