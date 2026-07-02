import { KeyEvent } from "@/lib/skdm";
import targets from "@/data/targets_client.json";
import { db } from "@/utils/db";

const typedTargets = targets as Array<{
  id: string;
  content: string;
  language: string;
  source?: string;
  generator_model?: string | null;
  topic?: string | null;
  user_id?: string | null;
  usage_count?: number;
  last_used_at?: string | null;
  created_at?: string;
}>;
import { calculateMetrics } from "@/lib/practice/metrics";
import { disassemble } from "es-hangul";

// --- Seeded Random Generator for Deterministic Variance ---
class SeededRandom {
  private seed: number;
  constructor(seed: number) {
    this.seed = seed;
  }
  next(): number {
    this.seed = (this.seed * 9301 + 49297) % 233280;
    return this.seed / 233280;
  }
  range(min: number, max: number): number {
    return min + this.next() * (max - min);
  }
}

// --- Standard Touch Typing Finger Mapping ---
const FINGER_MAP: Record<string, string> = {
  // Left hand
  "1": "L5",
  q: "L5",
  a: "L5",
  z: "L5",
  shift: "L5",
  shift_l: "L5",
  "2": "L4",
  w: "L4",
  s: "L4",
  x: "L4",
  "3": "L3",
  e: "L3",
  d: "L3",
  c: "L3",
  "4": "L2",
  "5": "L2",
  r: "L2",
  t: "L2",
  f: "L2",
  g: "L2",
  v: "L2",
  b: "L2",
  // Thumbs
  space: "L1",
  " ": "L1",
  // Right hand
  "6": "R2",
  "7": "R2",
  y: "R2",
  u: "R2",
  h: "R2",
  j: "R2",
  n: "R2",
  m: "R2",
  "8": "R3",
  i: "R3",
  k: "R3",
  ",": "R3",
  "9": "R4",
  o: "R4",
  l: "R4",
  ".": "R4",
  "0": "R5",
  p: "R5",
  ";": "R5",
  "'": "R5",
  "/": "R5",
  "[": "R5",
  "]": "R5",
  "\\": "R5",
  "-": "R5",
  "=": "R5",
  enter: "R5",
  backspace: "R5",
  shift_r: "R5",
};

function getFinger(key: string): string {
  return FINGER_MAP[key.toLowerCase()] || "R2";
}

function getHand(finger: string): string {
  return finger.startsWith("L") ? "left" : "right";
}

// --- Korean Jamo to QWERTY Keyboard Mapping (Dubeolsik) ---
const JAMO_TO_QWERTY: Record<string, string> = {
  // Consonants
  ㄱ: "r",
  ㄴ: "s",
  ㄷ: "e",
  ㄹ: "f",
  ㅁ: "a",
  ㅂ: "q",
  ㅅ: "t",
  ㅇ: "d",
  ㅈ: "w",
  ㅊ: "c",
  ㅋ: "z",
  ㅌ: "x",
  ㅍ: "v",
  ㅎ: "g",
  ㄲ: "R",
  ㄸ: "E",
  ㅃ: "Q",
  ㅆ: "T",
  ㅉ: "W",
  // Vowels
  ㅏ: "k",
  ㅐ: "o",
  ㅑ: "i",
  ㅒ: "O",
  ㅓ: "j",
  ㅔ: "p",
  ㅕ: "u",
  ㅖ: "P",
  ㅗ: "h",
  ㅛ: "y",
  ㅜ: "n",
  ㅠ: "b",
  ㅡ: "m",
  ㅣ: "l",
  // Complex vowels and double batchims (if they appear as a single character)
  ㄳ: "rt",
  ㄵ: "sw",
  ㄶ: "sg",
  ㄺ: "fr",
  ㄻ: "fa",
  ㄼ: "fq",
  ㄽ: "ft",
  ㄾ: "fx",
  ㄿ: "fv",
  ㅀ: "fg",
  ㅄ: "qt",
  ㅘ: "hk",
  ㅙ: "ho",
  ㅚ: "hl",
  ㅝ: "nj",
  ㅞ: "np",
  ㅟ: "nl",
  ㅢ: "ml",
};

const KEY_NEIGHBORS: Record<string, string> = {
  a: "qwsz",
  b: "vghn",
  c: "xdfv",
  d: "ersfxc",
  e: "wsdr",
  f: "rtgvcd",
  g: "tyhbvf",
  h: "yujngt",
  i: "ujko",
  j: "uikmh",
  k: "ijlm",
  l: "okp.",
  m: "njk,",
  n: "bhjm",
  o: "iklp",
  p: "ol",
  q: "wa",
  r: "edft",
  s: "wedxza",
  t: "rfgy",
  u: "yhji",
  v: "cfgb",
  w: "qase",
  x: "zsdc",
  y: "tghu",
  z: "asx",
};

function getNeighborKey(key: string, random: SeededRandom): string {
  const neighbors = KEY_NEIGHBORS[key.toLowerCase()];
  if (!neighbors) return "space";
  const idx = Math.floor(random.next() * neighbors.length);
  return neighbors[idx];
}

// --- Keyboard Dynamic Latency Calculator Based on Fingers & Alternation ---
function calculateSimulatedLatency(
  fromKey: string | null,
  toKey: string,
  random: SeededRandom,
): number {
  if (fromKey === null) {
    return Math.round(random.range(150, 300));
  }

  if (fromKey === toKey) {
    return Math.round(random.range(180, 260));
  }

  const fromFinger = getFinger(fromKey);
  const toFinger = getFinger(toKey);

  if (fromFinger === toFinger && fromFinger !== "unknown") {
    // Same finger, different key (e.g. moving rows) -> slower
    return Math.round(random.range(200, 280));
  }

  const fromHand = getHand(fromFinger);
  const toHand = getHand(toFinger);

  let base = 120;
  if (fromHand !== toHand) {
    // Hand alternation -> very fast
    base = random.range(65, 115);
  } else {
    // Same hand, different fingers -> moderate
    base = random.range(115, 160);
  }

  // Add finger penalty (weaker fingers are slower)
  if (toFinger === "L5" || toFinger === "R5") {
    base += random.range(20, 50); // Pinky
  } else if (toFinger === "L4" || toFinger === "R4") {
    base += random.range(10, 30); // Ring
  }

  // Special keys penalty
  if (toKey === "backspace") {
    base += random.range(40, 80);
  }

  return Math.round(base);
}

// --- Simulates a realistic typing event stream for a given string ---
export function simulateEventsForText(
  targetText: string,
  seed: number,
  errorProbability = 0.04,
): {
  events: KeyEvent[];
  qwertyBuffer: string;
  typedText: string;
} {
  const random = new SeededRandom(seed);
  const isKorean = /[가-힣]/.test(targetText);
  const steps: { keyToken: string; keyChar: string }[] = [];

  if (isKorean) {
    const decomposed = disassemble(targetText);
    for (const char of decomposed) {
      if (char === " ") {
        steps.push({ keyToken: "space", keyChar: " " });
      } else if (JAMO_TO_QWERTY[char]) {
        const keysStr = JAMO_TO_QWERTY[char];
        for (const key of keysStr) {
          steps.push({ keyToken: key.toLowerCase(), keyChar: char });
        }
      } else {
        steps.push({ keyToken: char.toLowerCase(), keyChar: char });
      }
    }
  } else {
    for (const char of targetText) {
      if (char === " ") {
        steps.push({ keyToken: "space", keyChar: " " });
      } else {
        steps.push({ keyToken: char.toLowerCase(), keyChar: char });
      }
    }
  }

  const events: KeyEvent[] = [];
  let lastKey: string | null = null;

  for (let i = 0; i < steps.length; i++) {
    const step = steps[i];

    // Inject typos with errorProbability, avoiding consecutive errors or spaces
    const canHaveTypo =
      errorProbability > 0 && i > 1 && i < steps.length - 2 && step.keyToken !== "space";
    const isTypo = canHaveTypo && random.next() < errorProbability;

    if (isTypo) {
      const typoKeyToken = getNeighborKey(step.keyToken, random);
      const rawTypoChar = typoKeyToken === "space" ? " " : typoKeyToken;
      const typoKeyChar =
        isKorean && /[a-zA-Z]/.test(rawTypoChar)
          ? JAMO_TO_QWERTY[rawTypoChar] || rawTypoChar
          : rawTypoChar;

      const latency = calculateSimulatedLatency(lastKey, typoKeyToken, random);
      events.push({
        fromKey: lastKey,
        toKey: typoKeyToken,
        latencyMs: latency,
        keyChar: typoKeyChar,
        holdDurationMs: Math.round(random.range(40, 70)),
        isCorrect: false,
        expectedChar: step.keyChar,
      });
      lastKey = typoKeyToken;

      // Type Backspace
      const backspaceLatency = calculateSimulatedLatency(lastKey, "backspace", random);
      events.push({
        fromKey: lastKey,
        toKey: "backspace",
        latencyMs: backspaceLatency,
        keyChar: "backspace",
        holdDurationMs: Math.round(random.range(45, 65)),
        isCorrect: true,
        expectedChar: null,
      });
      lastKey = "backspace";
    }

    // Type correct character
    const latency = calculateSimulatedLatency(lastKey, step.keyToken, random);
    events.push({
      fromKey: lastKey,
      toKey: step.keyToken,
      latencyMs: latency,
      keyChar: step.keyChar,
      holdDurationMs: Math.round(random.range(40, 70)),
      isCorrect: true,
      expectedChar: null,
    });
    lastKey = step.keyToken;
  }

  // Assemble qwertyBuffer
  let qwertyBuffer = "";
  for (const ev of events) {
    if (ev.toKey === "backspace") {
      qwertyBuffer = qwertyBuffer.slice(0, -1);
    } else {
      qwertyBuffer += ev.toKey === "space" ? " " : ev.toKey;
    }
  }

  return {
    events,
    qwertyBuffer,
    typedText: targetText,
  };
}

// --- Generates extra training/historical dummy keystrokes to ensure 3D surface completeness ---
function generateExtraEvents(
  count: number,
  random: SeededRandom,
  startKey: string | null,
): KeyEvent[] {
  const extraEvents: KeyEvent[] = [];
  const keys = "abcdefghijklmnopqrstuvwxyz.,".split("");
  let lastKey = startKey;

  for (let i = 0; i < count; i++) {
    const toKey = keys[Math.floor(random.next() * keys.length)];
    const latency = calculateSimulatedLatency(lastKey, toKey, random);

    // Determine Korean jamo representation for 3D visualization compatibility
    const keyChar = JAMO_TO_QWERTY[toKey] || toKey;

    extraEvents.push({
      fromKey: lastKey,
      toKey,
      latencyMs: latency,
      keyChar,
      holdDurationMs: Math.round(random.range(40, 70)),
      isCorrect: true,
      expectedChar: null,
    });
    lastKey = toKey;
  }

  return extraEvents;
}

// --- Generates store-compatible dummy state conforming to DB schema ---
export function generateDummyTypingState(targetTextFallback: string) {
  const targetText = targetTextFallback || (typedTargets.length > 0 ? typedTargets[0].content : "");
  const random = new SeededRandom(98765);

  // Generate realistic text typing events
  const textTyping = simulateEventsForText(targetText, 12345, 0.03);

  // Append 1500 extra realistic events so the 3D grid surface is richly filled
  const lastKey =
    textTyping.events.length > 0 ? textTyping.events[textTyping.events.length - 1].toKey : null;
  const extraEvents = generateExtraEvents(1500, random, lastKey);
  const dummyEvents = [...textTyping.events, ...extraEvents];

  const totalElapsedTime = dummyEvents.reduce((sum, ev) => sum + ev.latencyMs, 0);
  const finishedAt = Date.now();
  const startedAt = finishedAt - totalElapsedTime;

  return {
    typedText: targetText,
    qwertyBuffer: textTyping.qwertyBuffer,
    events: dummyEvents,
    status: "done" as const,
    startedAt,
    finishedAt,
    lastKey: dummyEvents[dummyEvents.length - 1].toKey,
    lastKeyAt: finishedAt,
  };
}

// --- Populates Local Storage database with mock runs and pages matching db_schema.md ---
export async function populateDummyDatabase(
  runId: string,
  currentEvents: KeyEvent[],
  currentTargetText: string,
) {
  if (typeof window === "undefined") return;

  // Clear previous runs and pages to prevent cluttering and start fresh
  localStorage.removeItem("typediag_db_runs");
  localStorage.removeItem("typediag_db_pages");

  const random = new SeededRandom(54321);

  // 1. Create Run 1 (completed 2 days ago)
  const run1Id = "run_dummy_1";
  const run1Date = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
  await db.createRun({
    id: run1Id,
    user_id: "user_001",
    status: "in_progress",
    started_at: run1Date.toISOString(),
  });

  const targetsToUse = typedTargets.slice(0, 3);
  let orderIndex = 0;
  let pageDate = new Date(run1Date);

  for (const target of targetsToUse) {
    const { events, typedText } = simulateEventsForText(
      target.content,
      random.range(1000, 99999),
      0.02,
    );
    const metrics = calculateMetrics(events, {
      targetText: target.content,
      language: target.language,
      outlierThresholdMs: 3000,
    });

    const pageStartedAt = new Date(pageDate);
    pageDate = new Date(pageDate.getTime() + metrics.elapsed_time_ms + 10000);
    const pageFinishedAt = new Date(pageDate);

    await db.createPage({
      id: `page_dummy_1_${orderIndex}`,
      run_id: run1Id,
      target_text_id: target.id,
      order_index: orderIndex++,
      language: target.language,
      typed_text: typedText,
      wpm: metrics.wpm,
      cpm: metrics.cpm,
      accuracy: metrics.accuracy,
      started_at: pageStartedAt.toISOString(),
      finished_at: pageFinishedAt.toISOString(),
      elapsed_time_ms: metrics.elapsed_time_ms,
      key_events: events.map((e) => ({
        from_key: e.fromKey,
        to_key: e.toKey,
        key_char: e.keyChar || "",
        latency: e.latencyMs,
        hold_duration_ms: e.holdDurationMs ?? 50,
        is_correct: e.isCorrect ?? true,
        expected_char: e.expectedChar ?? null,
      })),
    });
  }
  await db.finalizeRun(run1Id, pageDate.toISOString());

  // 2. Create Run 2 (completed 1 day ago)
  const run2Id = "run_dummy_2";
  const run2Date = new Date(Date.now() - 1 * 24 * 60 * 60 * 1000);
  await db.createRun({
    id: run2Id,
    user_id: "user_001",
    status: "in_progress",
    started_at: run2Date.toISOString(),
  });

  const targetsToUse2 = typedTargets.slice(1, 4);
  orderIndex = 0;
  pageDate = new Date(run2Date);

  for (const target of targetsToUse2) {
    const { events, typedText } = simulateEventsForText(
      target.content,
      random.range(1000, 99999),
      0.04,
    );
    const metrics = calculateMetrics(events, {
      targetText: target.content,
      language: target.language,
      outlierThresholdMs: 3000,
    });

    const pageStartedAt = new Date(pageDate);
    pageDate = new Date(pageDate.getTime() + metrics.elapsed_time_ms + 8000);
    const pageFinishedAt = new Date(pageDate);

    await db.createPage({
      id: `page_dummy_2_${orderIndex}`,
      run_id: run2Id,
      target_text_id: target.id,
      order_index: orderIndex++,
      language: target.language,
      typed_text: typedText,
      wpm: metrics.wpm,
      cpm: metrics.cpm,
      accuracy: metrics.accuracy,
      started_at: pageStartedAt.toISOString(),
      finished_at: pageFinishedAt.toISOString(),
      elapsed_time_ms: metrics.elapsed_time_ms,
      key_events: events.map((e) => ({
        from_key: e.fromKey,
        to_key: e.toKey,
        key_char: e.keyChar || "",
        latency: e.latencyMs,
        hold_duration_ms: e.holdDurationMs ?? 50,
        is_correct: e.isCorrect ?? true,
        expected_char: e.expectedChar ?? null,
      })),
    });
  }
  await db.finalizeRun(run2Id, pageDate.toISOString());

  // 3. Create the current session Run (which will be in_progress)
  const run3Date = new Date(Date.now() - 5 * 60 * 1000);
  await db.createRun({
    id: runId,
    user_id: "user_001",
    status: "in_progress",
    started_at: run3Date.toISOString(),
  });

  // Add 2 completed pages to this run to simulate progression
  const targetsToUse3 = typedTargets.slice(2, 4);
  orderIndex = 0;
  pageDate = new Date(run3Date);

  for (const target of targetsToUse3) {
    const { events, typedText } = simulateEventsForText(
      target.content,
      random.range(1000, 99999),
      0.03,
    );
    const metrics = calculateMetrics(events, {
      targetText: target.content,
      language: target.language,
      outlierThresholdMs: 3000,
    });

    const pageStartedAt = new Date(pageDate);
    pageDate = new Date(pageDate.getTime() + metrics.elapsed_time_ms + 12000);
    const pageFinishedAt = new Date(pageDate);

    await db.createPage({
      id: `page_dummy_3_${orderIndex}`,
      run_id: runId,
      target_text_id: target.id,
      order_index: orderIndex++,
      language: target.language,
      typed_text: typedText,
      wpm: metrics.wpm,
      cpm: metrics.cpm,
      accuracy: metrics.accuracy,
      started_at: pageStartedAt.toISOString(),
      finished_at: pageFinishedAt.toISOString(),
      elapsed_time_ms: metrics.elapsed_time_ms,
      key_events: events.map((e) => ({
        from_key: e.fromKey,
        to_key: e.toKey,
        key_char: e.keyChar || "",
        latency: e.latencyMs,
        hold_duration_ms: e.holdDurationMs ?? 50,
        is_correct: e.isCorrect ?? true,
        expected_char: e.expectedChar ?? null,
      })),
    });
  }

  // Pre-save the current page (which we loaded into the store state) to the DB
  // This allows startDiagnosticsTransition to pick it up immediately!
  const currentTargetTextObj = typedTargets.find((t) => t.content === currentTargetText);
  const currentTargetTextId = currentTargetTextObj ? currentTargetTextObj.id : "unknown";
  const currentLanguage = currentTargetTextObj ? currentTargetTextObj.language : "en";

  const currentMetrics = calculateMetrics(currentEvents, {
    targetText: currentTargetText,
    language: currentLanguage,
    outlierThresholdMs: 3000,
  });
  const pageStartedAt = new Date(pageDate);
  pageDate = new Date(pageDate.getTime() + currentMetrics.elapsed_time_ms);
  const pageFinishedAt = new Date(pageDate);

  await db.createPage({
    id: `page_dummy_3_current`,
    run_id: runId,
    target_text_id: currentTargetTextId,
    order_index: orderIndex++,
    language: currentLanguage,
    typed_text: currentTargetText,
    wpm: currentMetrics.wpm,
    cpm: currentMetrics.cpm,
    accuracy: currentMetrics.accuracy,
    started_at: pageStartedAt.toISOString(),
    finished_at: pageFinishedAt.toISOString(),
    elapsed_time_ms: currentMetrics.elapsed_time_ms,
    key_events: currentEvents.map((e) => ({
      from_key: e.fromKey,
      to_key: e.toKey,
      key_char: e.keyChar || "",
      latency: e.latencyMs,
      hold_duration_ms: e.holdDurationMs ?? 50,
      is_correct: e.isCorrect ?? true,
      expected_char: e.expectedChar ?? null,
    })),
  });
}
