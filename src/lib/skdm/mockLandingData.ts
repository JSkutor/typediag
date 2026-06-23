import { KeyResult, KeyEvent } from "./types";
import { KEYBOARD_META } from "./keyboardMeta";

/**
 * Generates realistic mock KeyResult data for the LatencySurface3D on the landing page.
 * Creates a "mountainous" topography to show off the 3D features, e.g. simulating a user
 * who is slower at typing the right hand pinky/ring fingers (o, p) and left hand bottom row (z, x).
 */
export function getMockKeyStats(): Record<string, KeyResult> {
  const stats: Record<string, KeyResult> = {};
  const keys = Object.keys(KEYBOARD_META);

  // Assign basic coordinates based on standard QWERTY layout stagger
  keys.forEach((key) => {
    const meta = KEYBOARD_META[key];
    
    // Simulate typical latencies.
    // Let's make 'o', 'p', 'z', 'x', 'c' have higher latency (z-value)
    let zValue = 0.3; // base latency ~ 0.3
    
    if (["o", "p"].includes(key)) {
      zValue = 0.85; // high peak
    } else if (["z", "x", "c"].includes(key)) {
      zValue = 0.7; // medium peak
    } else if (["w", "e", "r"].includes(key)) {
      zValue = 0.5; // low peak
    } else if (["j", "k", "l"].includes(key)) {
      zValue = 0.15; // very fast
    } else {
      zValue = 0.3 + (Math.random() * 0.1 - 0.05); // noise
    }

    stats[key] = {
      key,
      row: meta.row,
      x: 0, 
      y: 0, 
      z: zValue,
      confidence: 100 + Math.random() * 50,
      stdev: 20 + Math.random() * 10,
      zSmoothed: zValue, // For mock, smoothed is same as z
      stdevSmoothed: 20,
    };
  });

  return stats;
}

/**
 * Generates a mock list of KeyEvents for the CylindricalVector3D.
 * Focuses on a specific "target" key to show nice vectors.
 */
export function getMockCylindricalEvents(): KeyEvent[] {
  const events: KeyEvent[] = [];

  // Let's create vectors ending at 'o' (often a bottleneck)
  const targetKey = "o";
  
  // High volume from adjacent/common keys
  const fromKeys = ["p", "i", "l", "k", "n", "m", "j", "a", "s", "e"];
  
  fromKeys.forEach((fromKey) => {
    // Determine how many events to generate based on fromKey
    const count = fromKey === "p" || fromKey === "i" ? 40 : 15;
    
    for (let i = 0; i < count; i++) {
      // Latency ranges
      let baseLatency = 200;
      if (fromKey === "p") baseLatency = 450; // slow transition
      if (fromKey === "a") baseLatency = 120; // fast transition
      
      const latencyMs = baseLatency + (Math.random() * 100 - 50);
      
      events.push({
        fromKey,
        toKey: targetKey,
        latencyMs,
      });
    }
  });

  // Let's create vectors ending at 'p' as well to add density
  const targetKey2 = "p";
  const fromKeys2 = ["o", "l", "a"];
  fromKeys2.forEach((fromKey) => {
    for (let i = 0; i < 20; i++) {
      events.push({
        fromKey,
        toKey: targetKey2,
        latencyMs: 300 + (Math.random() * 80 - 40),
      });
    }
  });

  return events;
}
