import { describe, it, expect } from "vitest";
import { isDbConnectionError, formatDbErrorForClient } from "@/utils/dbErrors";

describe("dbErrors", () => {
  it("detects ECONNREFUSED on nested AggregateError causes", () => {
    const error = {
      message: "Failed query: select ...",
      cause: {
        code: "ECONNREFUSED",
        errors: [{ code: "ECONNREFUSED", message: "connect ECONNREFUSED 127.0.0.1:5432" }],
      },
    };

    expect(isDbConnectionError(error)).toBe(true);
  });

  it("returns a client-safe 503 message for connection failures", () => {
    const formatted = formatDbErrorForClient({ code: "ECONNREFUSED" });
    expect(formatted.status).toBe(503);
    expect(formatted.code).toBe("DB_UNAVAILABLE");
    expect(formatted.message).toContain("docker compose up -d");
    expect(formatted.message).not.toContain("Failed query");
  });

  it("returns a generic 500 message for other database failures", () => {
    const formatted = formatDbErrorForClient(new Error("constraint violation on users_pkey"));
    expect(formatted.status).toBe(500);
    expect(formatted.code).toBe("DB_ERROR");
    expect(formatted.message).toBe("An internal database error occurred.");
    expect(formatted.message).not.toContain("users_pkey");
  });
});
