import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { localDbService } from "./localDbService";
import fs from "fs";
import path from "path";
import type { RunRow } from "./db";

vi.mock("fs", () => ({
  default: {
    existsSync: vi.fn(),
    mkdirSync: vi.fn(),
    writeFileSync: vi.fn(),
    readFileSync: vi.fn(),
  },
}));

vi.mock("path", async () => {
  const actual = await vi.importActual("path");
  return {
    ...actual,
    default: {
      ...actual,
      join: vi.fn((...args) => args.join("/")),
      dirname: vi.fn((p) => "mocked/dir"),
    },
  };
});

describe("localDbService", () => {
  const mockRun: RunRow = {
    id: "run_123",
    user_id: "user_001",
    status: "in_progress",
    started_at: "2026-06-15T00:00:00Z",
    finished_at: null,
    cpm: null,
    wpm: null,
    accuracy: null,
    created_at: "2026-06-15T00:00:00Z",
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should initialize DB file if it doesn't exist", async () => {
    vi.mocked(fs.existsSync).mockReturnValue(false); // dir and file don't exist

    const data = await localDbService.getData();

    expect(fs.mkdirSync).toHaveBeenCalledWith("mocked/dir", { recursive: true });
    expect(fs.writeFileSync).toHaveBeenCalled();
    expect(data.runs).toEqual([]);
    expect(data.pages).toEqual([]);
  });

  it("should read DB successfully if valid JSON exists", async () => {
    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(fs.readFileSync).mockReturnValue(
      JSON.stringify({
        runs: [mockRun],
        pages: [],
      }),
    );

    const data = await localDbService.getData();
    expect(data.runs).toHaveLength(1);
    expect(data.runs[0].id).toBe("run_123");
  });

  it("should fallback to empty DB if JSON is corrupt", async () => {
    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(fs.readFileSync).mockReturnValue("{ corrupt json");

    const data = await localDbService.getData();

    // Should gracefully catch syntax error and return empty structure
    expect(data.runs).toEqual([]);
    expect(data.pages).toEqual([]);
  });

  it("should create a new run correctly", async () => {
    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify({ runs: [], pages: [] }));

    const newRun = await localDbService.createRun({
      id: "run_999",
      user_id: "user_001",
      status: "pending",
      started_at: "2026-06-16T00:00:00Z",
    });

    expect(newRun.id).toBe("run_999");
    expect(fs.writeFileSync).toHaveBeenCalled();

    // Verify arguments passed to writeFileSync
    const writeCall = vi.mocked(fs.writeFileSync).mock.calls[0];
    const writtenData = JSON.parse(writeCall[1] as string);
    expect(writtenData.runs).toHaveLength(1);
    expect(writtenData.runs[0].id).toBe("run_999");
  });
});
