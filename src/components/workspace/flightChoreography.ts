/**
 * Shared flight choreography constants.
 *
 * The whole "sentence -> swarm -> keyboard" sequence is driven by a single
 * global timeline (FLIGHT_D). Every flying glyph runs one Web Animations API
 * animation of the same duration that starts at the same instant, so phase
 * boundaries stay perfectly in sync without fragile chained setTimeouts.
 *
 * page.tsx, FlightAnimator and VirtualKeyboard all import these values so the
 * glyph flight and the keycap assembly land on exactly the same clock.
 */

/** Total per-glyph timeline length (ms). Snappy pacing. */
export const FLIGHT_D = 1400;

/** When the (empty) keyboard frame fades in, just before the first glyph lands. */
export const LANDING_START = 980;

/** When the assembled flat keyboard tilts back into the 3D diagnostics view. */
export const TILT_AT = 1540;

/**
 * Phase boundaries as fractions of FLIGHT_D, shared by every glyph so all
 * letters finish detaching (and hover-hold) before the swarm begins.
 */
export const PHASE = {
  holdEnd: 0.40,
  swarmEnd: 0.65,
  /** Per-glyph landing is randomised within this band for a staggered arrival. */
  landMin: 0.72,
  landMax: 0.92,
} as const;

export interface Flight {
  id: number;
  char: string;
  /** Start position (text glyph origin, or just below the screen). */
  sx: number;
  sy: number;
  /** Hover position at the end of the detach phase. */
  hx: number;
  hy: number;
  /** Staggered start and end for detachment (fraction of FLIGHT_D) */
  detachStart: number;
  detachEnd: number;
  /** Two mid-air swarm waypoints. */
  w1x: number;
  w1y: number;
  w2x: number;
  w2y: number;
  /** Approach point, just above the target keycap slot. */
  ax: number;
  ay: number;
  /** Final target (keycap slot centre). */
  tx: number;
  ty: number;
  rotA: number;
  rotB: number;
  rotC: number;
  /** When this glyph reaches its slot, as a fraction of FLIGHT_D (landMin..landMax). */
  landOffset: number;
  /** Original character index in the sentence. */
  textIdx?: number;
  /** Pre-calculated keyframes to avoid main-thread calculation during animation start. */
  keyframes?: Keyframe[];
}

const tf = (x: number, y: number, s: number, r: number) =>
  `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0) scale(${s}) rotate(${r.toFixed(1)}deg)`;

/**
 * Build a fully-resolved keyframe array (no CSS vars / calc) so the browser can
 * run the animation entirely on the compositor thread — the key fix for jank.
 */
export function buildFrames(f: Flight): Keyframe[] {
  const land = f.landOffset;
  const fade = Math.min(land + 0.05, 0.999);

  const frames: Keyframe[] = [];
  
  frames.push(
    // 0% ~ 30% (0ms ~ 420ms): Hold in place and pulse with a soft white glow
    { offset: 0, transform: tf(f.sx, f.sy, 1, 0), opacity: 1, filter: "drop-shadow(0 0 0px rgba(255, 255, 255, 0)) brightness(1)", easing: "ease-out" },
    { offset: 0.15, transform: tf(f.sx, f.sy, 1.06, 0), opacity: 1, filter: "drop-shadow(0 0 8px rgba(255, 255, 255, 0.35)) brightness(1.35)", easing: "ease-in" },
    { offset: 0.3, transform: tf(f.sx, f.sy, 1, 0), opacity: 1, filter: "drop-shadow(0 0 0px rgba(255, 255, 255, 0)) brightness(1)", easing: "cubic-bezier(0.25, 1, 0.5, 1)" },
    // 30% ~ land: Flight & scale down to keycap text size
    { offset: land, transform: tf(f.tx, f.ty, 0.47, 0), opacity: 1, filter: "none", easing: "linear" },
    // Hand off to the solid keycap: fade out
    { offset: fade, transform: tf(f.tx, f.ty, 0.40, 0), opacity: 0, filter: "none", easing: "linear" },
    // Stay hidden until the timeline ends
    { offset: 1, transform: tf(f.tx, f.ty, 0.40, 0), opacity: 0, filter: "none" }
  );

  return frames;
}
