import thetaOrderJson from "./theta_order.json";
import { resolveJsonDefault } from "@/utils/resolveJsonDefault";

export type ThetaOrderData = Record<string, string[]>;
export const THETA_ORDER: ThetaOrderData = resolveJsonDefault<ThetaOrderData>(thetaOrderJson);

/**
 * Returns the angular position (theta in radians) of `fromKey` relative to `centerKey`.
 * Uses the pre-calculated sequence from `theta_order.json` which normalizes angles
 * to be evenly distributed from 0 to 2PI avoiding overlaps.
 */
export function getTheta(centerKey: string, fromKey: string): number {
  const center = centerKey.toLowerCase();
  const from = fromKey.toLowerCase();

  const order = THETA_ORDER[center];
  if (!order) return 0; // Fallback if center key is not in map

  const idx = order.indexOf(from);
  if (idx === -1) return 0; // Not found in order, fallback to 0

  // 25 keys evenly distributed (26 alphabetic keys - 1 center key)
  return (idx / 25) * 2 * Math.PI;
}
