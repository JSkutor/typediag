/**
 * Shared flight choreography constants.
 */

export const FLIGHT_DURATION = 1500; // Legacy, can be kept for compatibility if needed.
export const LANDING_START = 1500;
export const TILT_AT = 1600;

export const PHASE = {
  holdEnd: 0.40,
  swarmEnd: 0.65,
  landMin: 0.72,
  landMax: 0.92,
} as const;

export const TRANSITION_TIMING = {
  detachmentDuration: 0.4,
  landingDuration: 0.7,
  handoffDuration: 0.6,
  surfaceCrossFadeDelay: 0.22, // 220ms
  surfaceElevationDuration: 1.2, // 1200ms
} as const;

export interface Flight {
  id: number;
  char: string;
  isFromText: boolean; // TRUE: detaches from text. FALSE: spawns from bottom.
  sx: number;
  sy: number;
  hx: number;
  hy: number;
  w1x: number;
  w1y: number;
  w2x: number;
  w2y: number;
  ax: number;
  ay: number;
  tx: number;
  ty: number;
  rotA: number;
  rotB: number;
  rotC: number;
  landOffset: number;
  textIdx?: number;
}

