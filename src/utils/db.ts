import targets from "@/data/targets.json";

// --- DB Entity Definitions matching db_schema.md ---

export interface UserRow {
  id: string;
  email: string | null;
  nickname: string;
  created_at: string;
  updated_at: string;
}

export interface TargetTextRow {
  id: string;
  content: string;
  language: string;
  created_at: string;
}

export interface RunRow {
  id: string;
  user_id: string | null;
  status: "pending" | "in_progress" | "completed";
  started_at: string; // ISO string
  finished_at: string | null; // ISO string
  cpm: number | null;
  wpm: number | null;
  accuracy: number | null;
  created_at: string; // ISO string
}

export interface KeyEventSchema {
  from_key: string | null;
  to_key: string;
  key_char: string;
  latency: number;
  hold_duration_ms: number | null;
  is_correct: boolean | null;
  expected_char: string | null;
}

export interface PageRow {
  id: string;
  run_id: string;
  target_text_id: string;
  order_index: number;
  language: string;
  typed_text: string;
  wpm: number;
  cpm: number;
  accuracy: number;
  started_at: string; // ISO string
  finished_at: string; // ISO string
  elapsed_time_ms: number;
  key_events: KeyEventSchema[];
  created_at: string; // ISO string
}

// --- LocalStorage Keys ---
const KEYS = {
  RUNS: "typediag_db_runs",
  PAGES: "typediag_db_pages",
};

// --- Mock User ---
const MOCK_USER: UserRow = {
  id: "user_001",
  email: "user@example.com",
  nickname: "Typing Master",
  created_at: new Date("2026-06-15T00:00:00Z").toISOString(),
  updated_at: new Date("2026-06-15T00:00:00Z").toISOString(),
};

// --- Helper Functions to read/write localStorage ---
function getStored<T>(key: string, defaultVal: T): T {
  if (typeof window === "undefined") return defaultVal;
  const data = localStorage.getItem(key);
  return data ? JSON.parse(data) : defaultVal;
}

function setStored<T>(key: string, value: T): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(key, JSON.stringify(value));
}

// --- Dev Server Sync Helpers ---
const isDev = process.env.NODE_ENV === "development";

async function getLocalDbData(): Promise<{ runs: RunRow[]; pages: PageRow[] }> {
  const res = await fetch("/api/db");
  if (!res.ok) {
    throw new Error("Failed to fetch local database data");
  }
  return res.json();
}

async function fetchDbApi<T>(action: string, payload: Record<string, any> = {}): Promise<T> {
  const res = await fetch("/api/db", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ action, ...payload }),
  });
  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.error || `Failed API call: ${action}`);
  }
  return res.json();
}

// --- Asynchronous DB API (easy to migrate to Prisma/Supabase/API endpoints later) ---

export const db = {
  /**
   * Get the current user profile.
   */
  async getCurrentUser(): Promise<UserRow> {
    return MOCK_USER;
  },

  /**
   * Get list of all target texts (mocked from targets.json).
   */
  async getTargetTexts(): Promise<TargetTextRow[]> {
    return targets.map((t) => ({
      id: t.id,
      content: t.content,
      language: t.language,
      created_at: new Date("2026-06-15T00:00:00Z").toISOString(),
    }));
  },

  /**
   * Find a target text by its ID or content.
   */
  async findTargetText(query: { id?: string; content?: string }): Promise<TargetTextRow | null> {
    const all = await this.getTargetTexts();
    if (query.id) {
      return all.find((t) => t.id === query.id) || null;
    }
    if (query.content) {
      return all.find((t) => t.content === query.content) || null;
    }
    return null;
  },

  /**
   * Create a new practice run (session).
   */
  async createRun(runData: Omit<RunRow, "created_at" | "finished_at" | "cpm" | "wpm" | "accuracy">): Promise<RunRow> {
    if (isDev) {
      return fetchDbApi<RunRow>("createRun", { runData });
    }
    const runs = getStored<RunRow[]>(KEYS.RUNS, []);
    const newRun: RunRow = {
      ...runData,
      finished_at: null,
      cpm: null,
      wpm: null,
      accuracy: null,
      created_at: new Date().toISOString(),
    };
    runs.push(newRun);
    setStored(KEYS.RUNS, runs);
    return newRun;
  },

  /**
   * Delete a run session.
   */
  async deleteRun(runId: string): Promise<void> {
    if (isDev) {
      await fetchDbApi<void>("deleteRun", { runId });
      return;
    }
    const runs = getStored<RunRow[]>(KEYS.RUNS, []);
    const updatedRuns = runs.filter((r) => r.id !== runId);
    setStored(KEYS.RUNS, updatedRuns);
  },

  /**
   * Update an existing run session (e.g. status, CPM, WPM, accuracy, finished_at).
   */
  async updateRun(runId: string, updates: Partial<Omit<RunRow, "id" | "created_at">>): Promise<RunRow> {
    if (isDev) {
      return fetchDbApi<RunRow>("updateRun", { runId, updates });
    }
    const runs = getStored<RunRow[]>(KEYS.RUNS, []);
    const idx = runs.findIndex((r) => r.id === runId);
    if (idx === -1) {
      throw new Error(`Run with ID ${runId} not found`);
    }
    const updatedRun = {
      ...runs[idx],
      ...updates,
    };
    runs[idx] = updatedRun;
    setStored(KEYS.RUNS, runs);
    return updatedRun;
  },

  /**
   * Get a run by its ID.
   */
  async getRun(runId: string): Promise<RunRow | null> {
    if (isDev) {
      const data = await getLocalDbData();
      return data.runs.find((r) => r.id === runId) || null;
    }
    const runs = getStored<RunRow[]>(KEYS.RUNS, []);
    return runs.find((r) => r.id === runId) || null;
  },

  /**
   * Get all runs in descending order.
   */
  async getAllRuns(): Promise<RunRow[]> {
    if (isDev) {
      const data = await getLocalDbData();
      return data.runs.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    }
    const runs = getStored<RunRow[]>(KEYS.RUNS, []);
    return runs.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  },

  /**
   * Get the latest run (session).
   */
  async getLatestRun(): Promise<RunRow | null> {
    const runs = await this.getAllRuns();
    return runs[0] || null;
  },

  /**
   * Create a new page typing result (sentence).
   */
  async createPage(pageData: Omit<PageRow, "created_at">): Promise<PageRow> {
    if (isDev) {
      return fetchDbApi<PageRow>("createPage", { pageData });
    }
    const pages = getStored<PageRow[]>(KEYS.PAGES, []);
    const newPage: PageRow = {
      ...pageData,
      created_at: new Date().toISOString(),
    };
    pages.push(newPage);
    setStored(KEYS.PAGES, pages);
    return newPage;
  },

  /**
   * Get all pages for a specific run.
   */
  async getPagesForRun(runId: string): Promise<PageRow[]> {
    if (isDev) {
      const data = await getLocalDbData();
      return data.pages
        .filter((p) => p.run_id === runId)
        .sort((a, b) => a.order_index - b.order_index);
    }
    const pages = getStored<PageRow[]>(KEYS.PAGES, []);
    return pages
      .filter((p) => p.run_id === runId)
      .sort((a, b) => a.order_index - b.order_index);
  },

  /**
   * Finalize a run by compiling metrics from all its pages.
   */
  async finalizeRun(runId: string, finishedAtStr?: string): Promise<RunRow | null> {
    if (isDev) {
      return fetchDbApi<RunRow>("finalizeRun", { runId, finishedAtStr });
    }
    const run = await this.getRun(runId);
    if (!run) return null;
    
    const pages = await this.getPagesForRun(runId);
    if (pages.length === 0) {
      return this.updateRun(runId, {
        status: "completed",
        finished_at: finishedAtStr || new Date().toISOString(),
        cpm: 0,
        wpm: 0,
        accuracy: 100,
      });
    }

    const avgCpm = Math.round(pages.reduce((sum, p) => sum + p.cpm, 0) / pages.length);
    const avgWpm = Math.round(pages.reduce((sum, p) => sum + p.wpm, 0) / pages.length);
    const avgAccuracy = pages.reduce((sum, p) => sum + p.accuracy, 0) / pages.length;

    return this.updateRun(runId, {
      status: "completed",
      finished_at: finishedAtStr || new Date().toISOString(),
      cpm: avgCpm,
      wpm: avgWpm,
      accuracy: avgAccuracy,
    });
  },

  /**
   * Sync active session on app mount:
   * If there is an unfinished run, finalize it if idle for more than 5 minutes.
   */
  async syncSessionOnMount(): Promise<void> {
    const latestRun = await this.getLatestRun();
    if (!latestRun || latestRun.status === "completed") {
      return;
    }

    if (latestRun.status === "pending") {
      await this.deleteRun(latestRun.id);
      return;
    }

    const pages = await this.getPagesForRun(latestRun.id);
    const lastActiveStr = pages.length > 0 ? pages[pages.length - 1].finished_at : latestRun.started_at;
    const lastActiveAt = new Date(lastActiveStr).getTime();
    const now = Date.now();

    if (now - lastActiveAt > 5 * 60 * 1000) {
      await this.finalizeRun(latestRun.id, lastActiveStr);
    }
  },
};
