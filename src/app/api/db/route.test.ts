import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "./route";

// Ensure environment is 'development' since the API blocks otherwise
vi.stubEnv("NODE_ENV", "development");

// Mock localDbService
vi.mock("@/utils/localDbService", () => ({
  localDbService: {
    createRun: vi.fn().mockResolvedValue({ id: "run_123" }),
  },
}));

function createMockRequest(body: unknown) {
  return new Request("http://localhost/api/db", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
}

describe("POST /api/db Validation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return 400 for an invalid action", async () => {
    const request = createMockRequest({ action: "unknownAction" });
    const response = await POST(request);

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toBe("Invalid payload");
    expect(data.details).toBeDefined();
  });

  it("should return 400 for a malformed body (missing required fields for createRun)", async () => {
    const request = createMockRequest({
      action: "createRun",
      runData: {
        id: "run_123",
        // Missing user_id, status, started_at
      },
    });
    const response = await POST(request);

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toBe("Invalid payload");
    expect(data.details).toBeDefined();
  });

  it("should parse successfully for a valid payload", async () => {
    const request = createMockRequest({
      action: "createRun",
      runData: {
        id: "run_123",
        user_id: null,
        status: "pending",
        started_at: new Date().toISOString(),
      },
    });
    const response = await POST(request);

    expect(response.status).toBe(200);
  });
});
