import React from "react";
import type { FatalNgramEntry } from "@/utils/cylindricalStats";
import { formatKey } from "./formatKey";

export function FatalNgramViz({ entry }: { entry: FatalNgramEntry }) {
  return (
    <div className="cyl-diag__ngram-entry">
      <div
        className="cyl-diag__ngram-viz"
        style={{ display: "flex", alignItems: "center", gap: "6px", margin: "12px 0" }}
      >
        {entry.sequence.map((key, i, arr) => (
          <React.Fragment key={i}>
            <kbd
              className="cyl-diag__ngram-key"
              style={{
                padding: "4px 8px",
                borderRadius: "4px",
                background:
                  i === arr.length - 1
                    ? "rgba(239, 68, 68, 0.1)"
                    : "rgba(255, 255, 255, 0.05)",
                border:
                  i === arr.length - 1
                    ? "1px solid rgba(239, 68, 68, 0.3)"
                    : "1px solid rgba(255, 255, 255, 0.1)",
                color: i === arr.length - 1 ? "var(--danger)" : "var(--text-primary)",
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
        <span className="cyl-diag__error-rate text-danger">
          {entry.errorRate.toFixed(1)}%
        </span>
        <span className="cyl-diag__count">n={entry.totalCount}</span>
      </div>
    </div>
  );
}
