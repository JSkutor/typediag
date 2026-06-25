import { KeyEvent } from "@/lib/skdm";
import { KEYBOARD_META, needsShift } from "@/lib/skdm/keyboardMeta";
import { charToLayoutKey } from "@/lib/practice/hangulRules";
import { buildLayout } from "@/lib/skdm/layout";
import { keyDistanceU } from "@/lib/skdm/geometry";
import {
  ACCUMULATOR_EXCLUDE_KEYS,
  ALPHA_KEY_REGEX,
  BURST_LATENCY_MAX_MS,
  CLOUD_TYPING_EXCLUDE_TO_KEYS,
} from "./constants";
import { hasValidHold } from "./cloudTyping";
import type { DiagnosticsAccumulator, PerKeyAccumulator } from "./types";

function getOrCreatePerKey(
  perKey: Map<string, PerKeyAccumulator>,
  key: string,
): PerKeyAccumulator {
  let entry = perKey.get(key);
  if (!entry) {
    entry = {
      referenceLatencies: [],
      fingerCounts: {
        oppositeHand: 0,
        sameHandPinky: 0,
        sameHandRing: 0,
        sameHandMiddle: 0,
        sameHandIndex: 0,
        other: 0,
        total: 0,
      },
      outgoingSamples: [],
      errorInducementCount: 0,
      lateKeystrokeCount: 0,
      spatialErrors: { distancesU: [], typoCounts: {} },
      contextualTypos: { ngrams: new Map() },
    };
    perKey.set(key, entry);
  }
  return entry;
}

/**
 * events 배열을 단일 O(N) 순회하여 모든 진단 데이터를 누산합니다.
 *
 * 반환된 DiagnosticsAccumulator를 `finalizeKeystrokeDiagnostics(acc, focusKey)`에
 * 전달하면 events 재순회 없이 O(k) 시간에 진단 결과를 생성할 수 있습니다.
 */
export function buildDiagnosticsAccumulator(events: KeyEvent[]): DiagnosticsAccumulator {
  const correctByKey = new Map<string, number>();
  const pairCounts = new Map<string, number>();
  const keyStats = new Map<string, { correct: number; incorrect: number }>();
  const perKey = new Map<string, PerKeyAccumulator>();
  let totalErrorStartsCount = 0;
  const shiftLatencies: number[] = [];
  const nonShiftLatencies: number[] = [];
  const window3Gram: Array<{ key: string; isCorrect: boolean }> = [];
  const windowFast: Array<{ key: string; latencyMs: number }> = [];
  const bursts = new Map<string, { count: number; totalLatencyMs: number }>();

  const layout = buildLayout();

  for (let i = 0; i < events.length; i++) {
    const event = events[i];
    const prevEvent = i > 0 ? events[i - 1] : null;
    const nextEvent = i < events.length - 1 ? events[i + 1] : null;

    // 1. correctByKey (all keys, focusKeyOptions용)
    if (event.isCorrect === true) {
      correctByKey.set(event.toKey, (correctByKey.get(event.toKey) ?? 0) + 1);
    }

    // 2. keyStats (EXCLUDE_KEYS 제외, unconsciousKey·totalErrorsCount용)
    if (!ACCUMULATOR_EXCLUDE_KEYS.has(event.toKey) && (event.isCorrect === true || event.isCorrect === false)) {
      const stat = keyStats.get(event.toKey) ?? { correct: 0, incorrect: 0 };
      if (event.isCorrect === true) stat.correct++;
      else stat.incorrect++;
      keyStats.set(event.toKey, stat);
    }

    // 3. pairCounts (correct & alpha 키 순서쌍)
    if (
      event.isCorrect === true &&
      event.fromKey &&
      ALPHA_KEY_REGEX.test(event.toKey) &&
      !ACCUMULATOR_EXCLUDE_KEYS.has(event.fromKey) &&
      !ACCUMULATOR_EXCLUDE_KEYS.has(event.toKey)
    ) {
      const pairKey = `${event.fromKey}→${event.toKey}`;
      pairCounts.set(pairKey, (pairCounts.get(pairKey) ?? 0) + 1);
    }

    // 4. shiftLatencies / nonShiftLatencies
    if (event.isCorrect === true && !ACCUMULATOR_EXCLUDE_KEYS.has(event.toKey)) {
      const char = event.expectedChar || event.keyChar;
      if (needsShift(char)) shiftLatencies.push(event.latencyMs);
      else nonShiftLatencies.push(event.latencyMs);
    }

    // 5. 오타 스트릭 시작 → errorInducementCount
    const isErrorStart =
      event.isCorrect === false && (prevEvent === null || prevEvent.isCorrect === true);
    if (isErrorStart) {
      totalErrorStartsCount++;
      getOrCreatePerKey(perKey, event.toKey).errorInducementCount++;
    }

    // 6. Late keystroke (event.expectedChar === nextEvent.toKey 동시 체크)
    if (
      nextEvent !== null &&
      event.isCorrect === false &&
      nextEvent.isCorrect === false &&
      (prevEvent === null || prevEvent.isCorrect === true) &&
      event.expectedChar &&
      nextEvent.toKey === event.expectedChar
    ) {
      getOrCreatePerKey(perKey, event.expectedChar).lateKeystrokeCount++;
    }

    // 7. Reference transition (toKey === key && isCorrect && latencyMs > 0)
    if (event.isCorrect === true && event.latencyMs > 0) {
      const keyEntry = getOrCreatePerKey(perKey, event.toKey);
      keyEntry.referenceLatencies.push(event.latencyMs);

      // 손가락 전환 분류 (fromKey → toKey 기준)
      const targetMeta = KEYBOARD_META[event.toKey.toLowerCase()];
      if (targetMeta) {
        const fromKeyLower = event.fromKey?.toLowerCase();
        const fromMeta = fromKeyLower ? KEYBOARD_META[fromKeyLower] : undefined;

        if (!event.fromKey || !fromMeta) {
          keyEntry.fingerCounts.other++;
        } else if (fromMeta.hand !== targetMeta.hand) {
          keyEntry.fingerCounts.oppositeHand++;
        } else {
          switch (fromMeta.finger) {
            case "pinky":
              keyEntry.fingerCounts.sameHandPinky++;
              break;
            case "ring":
              keyEntry.fingerCounts.sameHandRing++;
              break;
            case "middle":
              keyEntry.fingerCounts.sameHandMiddle++;
              break;
            case "index":
              keyEntry.fingerCounts.sameHandIndex++;
              break;
            default:
              keyEntry.fingerCounts.other++;
          }
        }
        keyEntry.fingerCounts.total++;
      }
    }

    // 8. Outgoing transition (fromKey === key) → cloud typing 샘플
    if (
      i > 0 &&
      event.fromKey &&
      event.isCorrect === true &&
      event.latencyMs > 0 &&
      !CLOUD_TYPING_EXCLUDE_TO_KEYS.has(event.toKey)
    ) {
      const refEvent = events[i - 1];
      if (refEvent.toKey === event.fromKey && hasValidHold(refEvent)) {
        const keyEntry = getOrCreatePerKey(perKey, event.fromKey);
        keyEntry.outgoingSamples.push({
          fromKey: event.fromKey,
          toKey: event.toKey,
          latencyMs: event.latencyMs,
          fromHoldMs: refEvent.holdDurationMs,
        });
      }
    }

    // 9. 공간적 오타 거리 (expectedChar === key && isCorrect === false)
    if (event.isCorrect === false && event.expectedChar) {
      const expectedLayoutKey = charToLayoutKey(event.expectedChar);
      if (expectedLayoutKey) {
        const toKeyNorm = event.toKey?.toLowerCase();
        const typoKey = toKeyNorm && /^[a-z]$/.test(toKeyNorm) ? toKeyNorm : null;
        if (typoKey) {
          const distU = keyDistanceU(expectedLayoutKey, typoKey, layout);
          if (distU !== null) {
            const keyEntry = getOrCreatePerKey(perKey, expectedLayoutKey);
            keyEntry.spatialErrors.distancesU.push(distU);
            keyEntry.spatialErrors.typoCounts[typoKey] =
              (keyEntry.spatialErrors.typoCounts[typoKey] ?? 0) + 1;
          }
        }
      }
    }

    // 10. Contextual Typos (3-Gram)
    if (window3Gram.length >= 2 && window3Gram[0].isCorrect && window3Gram[1].isCorrect) {
      let targetKey: string | null = null;
      if (event.isCorrect === true) {
        targetKey = event.toKey;
      } else if (event.isCorrect === false && event.expectedChar) {
        targetKey = charToLayoutKey(event.expectedChar);
      }

      if (targetKey && ALPHA_KEY_REGEX.test(targetKey) && !ACCUMULATOR_EXCLUDE_KEYS.has(targetKey)) {
        const seq = `${window3Gram[0].key}→${window3Gram[1].key}`;
        const keyEntry = getOrCreatePerKey(perKey, targetKey);
        const ngramMap = keyEntry.contextualTypos.ngrams;
        const stat = ngramMap.get(seq) ?? { total: 0, error: 0 };
        stat.total++;
        if (event.isCorrect === false) stat.error++;
        ngramMap.set(seq, stat);
      }
    }

    if (event.toKey && ALPHA_KEY_REGEX.test(event.toKey) && !ACCUMULATOR_EXCLUDE_KEYS.has(event.toKey)) {
      window3Gram.push({ key: event.toKey, isCorrect: event.isCorrect === true });
      if (window3Gram.length > 2) window3Gram.shift();

      if (event.isCorrect === true) {
        if (event.latencyMs <= BURST_LATENCY_MAX_MS && windowFast.length > 0) {
          windowFast.push({ key: event.toKey, latencyMs: event.latencyMs });
        } else {
          windowFast.length = 0;
          windowFast.push({ key: event.toKey, latencyMs: event.latencyMs });
        }

        if (windowFast.length >= 2) {
          const k1 = windowFast[windowFast.length - 2];
          const k2 = windowFast[windowFast.length - 1];
          const seq2 = `${k1.key}→${k2.key}`;
          const stat2 = bursts.get(seq2) ?? { count: 0, totalLatencyMs: 0 };
          stat2.count++;
          stat2.totalLatencyMs += k2.latencyMs;
          bursts.set(seq2, stat2);
        }
        if (windowFast.length >= 3) {
          const k1 = windowFast[windowFast.length - 3];
          const k2 = windowFast[windowFast.length - 2];
          const k3 = windowFast[windowFast.length - 1];
          const seq3 = `${k1.key}→${k2.key}→${k3.key}`;
          const stat3 = bursts.get(seq3) ?? { count: 0, totalLatencyMs: 0 };
          stat3.count++;
          stat3.totalLatencyMs += (k2.latencyMs + k3.latencyMs) / 2;
          bursts.set(seq3, stat3);
        }
      } else {
        windowFast.length = 0;
      }
    } else {
      window3Gram.length = 0;
      windowFast.length = 0;
    }
  }

  return {
    correctByKey,
    pairCounts,
    keyStats,
    totalErrorStartsCount,
    shiftLatencies,
    nonShiftLatencies,
    perKey,
    bursts,
  };
}
