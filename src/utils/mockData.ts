import { KeyEvent } from "@/lib/skdm";
import reference from "@/lib/skdm/__fixtures__/python-reference.json";
import targets from "@/data/targets.json";

export function generateDummyTypingState(targetTextFallback: string) {
  const baseEvents = (reference.events as { fromKey: string; selfKey: string; latencyMs: number }[]).map((ev) => ({
    fromKey: ev.fromKey,
    toKey: ev.selfKey,
    latencyMs: ev.latencyMs,
  }));
  
  const extraEvents: KeyEvent[] = [];
  const keys = "abcdefghijklmnopqrstuvwxyz.,".split("");
  for (let i = 0; i < 2000; i++) {
    const fromKey = keys[Math.floor(Math.random() * keys.length)];
    const toKey = keys[Math.floor(Math.random() * keys.length)];
    const isCommon = "e a s t n o r i".includes(toKey);
    const latencyMs = Math.random() * 200 + (isCommon ? 50 : 150);
    extraEvents.push({ fromKey, toKey, latencyMs });
  }
  
  const dummyEvents = [...baseEvents, ...extraEvents];
  const targetText = targetTextFallback || (targets.length > 0 ? targets[0].content : "");
  
  return {
    typedText: targetText,
    qwertyBuffer: targetText,
    events: dummyEvents,
    status: "done" as const,
    startedAt: performance.now() - 10000,
    finishedAt: performance.now(),
    lastKey: dummyEvents[dummyEvents.length - 1].toKey,
    lastKeyAt: performance.now(),
  };
}
