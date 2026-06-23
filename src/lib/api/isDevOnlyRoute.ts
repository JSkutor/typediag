/** True when dev-only API routes and controls should be enabled. */
export function isDevOnlyEnabled(): boolean {
  return process.env.NODE_ENV === "development";
}
