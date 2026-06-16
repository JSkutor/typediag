"""Generate a deterministic gold-reference fixture for the TypeScript port.

Produces JSON containing the raw events, the full pipeline results, and the
Delaunay adjacency (by key name) so the TS test can verify exact parity.

Run:  .venv/bin/python skdm/gen_fixture.py
"""

from __future__ import annotations

import json
import os
from collections import defaultdict

from skdm.layout import build_layout
from skdm.model import (
    KeyEvent,
    aggregate_pairs,
    filter_backspaces,
    filter_outliers,
    run_pipeline,
    summarize_keys,
    triangulate,
    _build_adjacency,
)


def make_events() -> list[KeyEvent]:
    """Deterministic synthetic typing stream.

    Latency is a fixed function of the key pair so both languages reproduce it
    exactly. Includes backspaces and an outlier to exercise those branches.
    """
    text = "the quick brown fox jumps over the lazy dog and types again slowly " * 50
    events: list[KeyEvent] = []
    prev = None
    for i, ch in enumerate(text):
        if ch == " ":
            cur = "space"
        else:
            cur = ch
        if prev is not None:
            # deterministic latency in ms from char codes
            latency = 80.0 + ((ord(prev[0]) * 7 + ord(cur[0]) * 13 + i * 3) % 400)
            events.append(KeyEvent(from_key=prev, self_key=cur, latency_ms=float(latency)))
        prev = cur

    # inject a typo that wasn't corrected
    events.append(KeyEvent(from_key="e", self_key="x", latency_ms=130.0, is_correct=False))

    # inject a couple of backspaces (typo + correction)
    events.append(KeyEvent(from_key="g", self_key="x", latency_ms=140.0, is_correct=False))
    events.append(KeyEvent(from_key="x", self_key="backspace", latency_ms=120.0))
    events.append(KeyEvent(from_key="backspace", self_key="g", latency_ms=200.0))
    
    # inject a valid typing stretch that is later deleted
    # e.g., correctly typed "the " but then backspaced
    events.append(KeyEvent(from_key="g", self_key="t", latency_ms=110.0, is_correct=True))
    events.append(KeyEvent(from_key="t", self_key="h", latency_ms=105.0, is_correct=True))
    events.append(KeyEvent(from_key="h", self_key="e", latency_ms=125.0, is_correct=True))
    events.append(KeyEvent(from_key="e", self_key="space", latency_ms=90.0, is_correct=True))
    events.append(KeyEvent(from_key="space", self_key="backspace", latency_ms=210.0))
    events.append(KeyEvent(from_key="backspace", self_key="backspace", latency_ms=150.0))
    events.append(KeyEvent(from_key="backspace", self_key="backspace", latency_ms=140.0))
    events.append(KeyEvent(from_key="backspace", self_key="backspace", latency_ms=145.0))
    events.append(KeyEvent(from_key="backspace", self_key="t", latency_ms=180.0))

    # inject an outlier (very slow)
    events.append(KeyEvent(from_key="g", self_key="o", latency_ms=5000.0))
    return events


def main() -> None:
    layout = build_layout()
    events = make_events()

    results = run_pipeline(events, layout)

    # adjacency by key name (sorted) for parity check
    cleaned = filter_backspaces(events)
    valid, max_clip_ms = filter_outliers(cleaned)
    pair_stats = aggregate_pairs(valid, max_clip_ms)
    res2 = summarize_keys(pair_stats, layout, valid)
    keys, tri = triangulate(res2)
    adj_idx = _build_adjacency(keys, tri)
    adjacency = {
        keys[i]: sorted(keys[j] for j in neighbors)
        for i, neighbors in adj_idx.items()
    }

    payload = {
        "events": [
            {
                "fromKey": e.from_key, 
                "selfKey": e.self_key, 
                "latencyMs": e.latency_ms,
                "isCorrect": e.is_correct
            }
            for e in events
        ],
        "results": {
            k: {
                "key": r.key,
                "row": r.row,
                "x": r.x,
                "y": r.y,
                "z": r.z,
                "confidence": r.confidence,
                "stdev": r.stdev,
                "zSmoothed": r.z_smoothed,
                "stdevSmoothed": r.stdev_smoothed,
            }
            for k, r in results.items()
        },
        "adjacency": adjacency,
    }

    out_dir = os.path.join(os.path.dirname(__file__), "..", "src", "lib", "skdm", "__fixtures__")
    out_dir = os.path.abspath(out_dir)
    os.makedirs(out_dir, exist_ok=True)
    out_path = os.path.join(out_dir, "python-reference.json")
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(payload, f, ensure_ascii=False, indent=2)
    print(f"wrote {out_path} ({len(events)} events, {len(results)} keys)")


if __name__ == "__main__":
    main()
