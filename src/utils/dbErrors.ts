const CONNECTION_ERROR_CODES = new Set(["ECONNREFUSED", "ENOTFOUND", "ETIMEDOUT", "ECONNRESET"]);

function collectErrorCodes(error: unknown, depth = 0): string[] {
  if (error == null || depth > 4) return [];

  const codes: string[] = [];
  const direct = (error as { code?: string }).code;
  if (typeof direct === "string") codes.push(direct);

  const cause = (error as { cause?: unknown }).cause;
  if (cause) codes.push(...collectErrorCodes(cause, depth + 1));

  const errors = (error as { errors?: unknown[] }).errors;
  if (Array.isArray(errors)) {
    for (const nested of errors) {
      codes.push(...collectErrorCodes(nested, depth + 1));
    }
  }

  return codes;
}

/** True when postgres.js / Drizzle cannot reach PostgreSQL. */
export function isDbConnectionError(error: unknown): boolean {
  return collectErrorCodes(error).some((code) => CONNECTION_ERROR_CODES.has(code));
}

export interface ClientDbError {
  message: string;
  status: number;
  code: "DB_UNAVAILABLE" | "DB_ERROR";
}

const DB_UNAVAILABLE_MESSAGE =
  "Database is unavailable. Start PostgreSQL with: docker compose up -d";

const DB_GENERIC_MESSAGE = "An internal database error occurred.";

/** Map DB errors to safe API responses (no raw SQL in client payloads). */
export function formatDbErrorForClient(error: unknown): ClientDbError {
  if (isDbConnectionError(error)) {
    return {
      message: DB_UNAVAILABLE_MESSAGE,
      status: 503,
      code: "DB_UNAVAILABLE",
    };
  }

  return {
    message: DB_GENERIC_MESSAGE,
    status: 500,
    code: "DB_ERROR",
  };
}

export function logDbError(scope: string, error: unknown): void {
  if (isDbConnectionError(error)) {
    console.error(`[${scope}] Database connection failed. Is PostgreSQL running?`);
    return;
  }

  console.error(`[${scope}]`, error);
}
