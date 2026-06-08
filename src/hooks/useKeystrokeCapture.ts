import { useCallback } from "react";

import { normalizeCode } from "@/lib/keyboard/normalize";
import { useTypingStore } from "@/store/useTypingStore";

/**
 * Captures raw physical keystrokes from an input element and feeds the typing
 * store. Returns a `keydown` handler to spread onto a textarea/input.
 *
 * Latency between consecutive physical key presses (keydown -> keydown) is the
 * transition time the SKDM model consumes. Auto-repeat is ignored so holding a
 * key does not flood the stream.
 */
export function useKeystrokeCapture() {
  const recordKey = useTypingStore((s) => s.recordKey);

  const onKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.repeat) return;
      const token = normalizeCode(e.code);
      if (!token) return;
      recordKey(token, performance.now());
    },
    [recordKey],
  );

  return { onKeyDown };
}
