/**
 * Resolves a JSON import that may be wrapped in a default property depending on
 * the module resolution and compiler options.
 */
export function resolveJsonDefault<T>(json: unknown): T {
  if (json && typeof json === "object" && "default" in json) {
    return (json as { default: T }).default;
  }
  return json as T;
}
