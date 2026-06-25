import React from "react";
import type { BurstNgram } from "@/utils/cylindricalStats";
import { formatKey } from "./formatKey";

export function BurstNgramViz({ entry, rank }: { entry: BurstNgram; rank: number }) {
  return (
    <div className="cyl-diag__ngram-entry">
      <div
        className="cyl-diag__ngram-viz"
        style={{ display: "flex", alignItems: "center", gap: "6px", margin: "12px 0" }}
      >
        <span style={{ color: "var(--accent)", fontWeight: "bold", marginRight: "8px" }}>#{rank}</span>
        {entry.sequence.map((key, i, arr) => (
          <React.Fragment key={i}>
            <kbd
              className="cyl-diag__ngram-key"
              style={{
                padding: "4px 8px",
                borderRadius: "4px",
                background: "rgba(16, 185, 129, 0.1)",
                border: "1px solid rgba(16, 185, 129, 0.3)",
                color: "var(--success)",
                fontFamily: "var(--font-mono)",
              }}
            >
              {formatKey(key)}
            </kbd>
            {i < arr.length - 1 && <span style={{ color: "var(--text-muted)" }}>→</span>}
          </React.Fragment>
        ))}
      </div>
      <div className="cyl-diag__optional-item">
        <span className="text-success">{entry.avgLatencyMs.toFixed(1)} ms</span>
        <span className="cyl-diag__count">n={entry.count}</span>
      </div>
    </div>
  );
}
