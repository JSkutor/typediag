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

/** Total per-glyph timeline length (ms). Dramatic pacing. */
export const FLIGHT_D = 3800;

/** When the (empty) keyboard frame fades in, just before the first glyph lands. */
export const LANDING_START = 2350;

/** When the assembled flat keyboard tilts back into the 3D diagnostics view. */
export const TILT_AT = 4050;

/**
 * Phase boundaries as fractions of FLIGHT_D, shared by every glyph so all
 * letters finish detaching (and hover-hold) before the swarm begins.
 *  - 0            -> detachEnd : Stage 1, lift off the text / rise from below
 *  - detachEnd    -> holdEnd   : hover hold (wait until everything detached)
 *  - holdEnd      -> swarmEnd  : Stage 2, pure mid-air swarm / tangle
 *  - swarmEnd     -> landOffset: Stage 3, converge onto the keycap slot
 *  - landOffset   -> 1         : fade out (hand off to the solid keycap)
 */
export const PHASE = {
  detachEnd: 0.16,
  holdEnd: 0.25,
  swarmEnd: 0.58,
  /** Per-glyph landing is randomised within this band for a staggered arrival. */
  landMin: 0.66,
  landMax: 0.88,
} as const;
