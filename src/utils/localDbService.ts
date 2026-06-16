import fs from "fs";
import path from "path";
import type { RunRow, PageRow } from "./db";

const DB_FILE_PATH = path.join(process.cwd(), "src/data/local_db.json");

export interface LocalDbData {
  runs: RunRow[];
  pages: PageRow[];
}

/**
 * Safely reads the JSON database from the filesystem.
 * If the directory or file doesn't exist, they are initialized.
 */
function readDbFile(): LocalDbData {
  try {
    const dir = path.dirname(DB_FILE_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    if (!fs.existsSync(DB_FILE_PATH)) {
      const initialData: LocalDbData = { runs: [], pages: [] };
      fs.writeFileSync(DB_FILE_PATH, JSON.stringify(initialData, null, 2), "utf-8");
      return initialData;
    }

    const raw = fs.readFileSync(DB_FILE_PATH, "utf-8");
    return JSON.parse(raw);
  } catch (err) {
    console.error("[localDbService] Error reading local db file:", err);
    return { runs: [], pages: [] };
  }
}

/**
 * Writes the JSON database back to the filesystem.
 */
function writeDbFile(data: LocalDbData): void {
  try {
    const dir = path.dirname(DB_FILE_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(DB_FILE_PATH, JSON.stringify(data, null, 2), "utf-8");
  } catch (err) {
    console.error("[localDbService] Error writing local db file:", err);
  }
}

export const localDbService = {
  /**
   * Retrieves the entire database contents.
   */
  async getData(): Promise<LocalDbData> {
    return readDbFile();
  },

  /**
   * Appends or updates a practice session run.
   */
  async createRun(runData: Omit<RunRow, "created_at"> & { created_at?: string }): Promise<RunRow> {
    const db = readDbFile();
    const existingIdx = db.runs.findIndex((r) => r.id === runData.id);
    const newRun: RunRow = {
      ...runData,
      finished_at: runData.finished_at ?? null,
      cpm: runData.cpm ?? null,
      wpm: runData.wpm ?? null,
      accuracy: runData.accuracy ?? null,
      created_at: runData.created_at || new Date().toISOString(),
    };

    if (existingIdx !== -1) {
      db.runs[existingIdx] = newRun;
    } else {
      db.runs.push(newRun);
    }

    writeDbFile(db);
    return newRun;
  },

  /**
   * Updates fields on an existing run.
   */
  async updateRun(runId: string, updates: Partial<Omit<RunRow, "id" | "created_at">>): Promise<RunRow> {
    const db = readDbFile();
    const idx = db.runs.findIndex((r) => r.id === runId);
    if (idx === -1) {
      throw new Error(`Run with ID ${runId} not found`);
    }

    const updatedRun = {
      ...db.runs[idx],
      ...updates,
    };
    db.runs[idx] = updatedRun;
    writeDbFile(db);
    return updatedRun;
  },

  /**
   * Deletes a run and all associated pages.
   */
  async deleteRun(runId: string): Promise<void> {
    const db = readDbFile();
    db.runs = db.runs.filter((r) => r.id !== runId);
    db.pages = db.pages.filter((p) => p.run_id !== runId);
    writeDbFile(db);
  },

  /**
   * Appends or updates a page result within a run.
   */
  async createPage(pageData: Omit<PageRow, "created_at"> & { created_at?: string }): Promise<PageRow> {
    const db = readDbFile();
    const existingIdx = db.pages.findIndex((p) => p.id === pageData.id);
    const newPage: PageRow = {
      ...pageData,
      created_at: pageData.created_at || new Date().toISOString(),
    };

    if (existingIdx !== -1) {
      db.pages[existingIdx] = newPage;
    } else {
      db.pages.push(newPage);
    }

    writeDbFile(db);
    return newPage;
  },

  /**
   * Finalizes a run by calculating metrics aggregates (WPM, CPM, Accuracy) from its pages.
   */
  async finalizeRun(runId: string, finishedAtStr?: string): Promise<RunRow | null> {
    const db = readDbFile();
    const runIdx = db.runs.findIndex((r) => r.id === runId);
    if (runIdx === -1) return null;

    const pages = db.pages
      .filter((p) => p.run_id === runId)
      .sort((a, b) => a.order_index - b.order_index);

    if (pages.length === 0) {
      const updatedRun: RunRow = {
        ...db.runs[runIdx],
        status: "completed",
        finished_at: finishedAtStr || new Date().toISOString(),
        cpm: 0,
        wpm: 0,
        accuracy: 100,
      };
      db.runs[runIdx] = updatedRun;
      writeDbFile(db);
      return updatedRun;
    }

    const validPages = pages.filter((p) => p.elapsed_time_ms > 0);
    const pagesToAggregate = validPages.length > 0 ? validPages : pages;

    const totalTimeMs = pagesToAggregate.reduce((sum, p) => sum + p.elapsed_time_ms, 0);
    const avgCpm = totalTimeMs > 0
      ? Math.round(pagesToAggregate.reduce((sum, p) => sum + p.cpm * p.elapsed_time_ms, 0) / totalTimeMs)
      : Math.round(pagesToAggregate.reduce((sum, p) => sum + p.cpm, 0) / pagesToAggregate.length);

    const avgWpm = totalTimeMs > 0
      ? Math.round(pagesToAggregate.reduce((sum, p) => sum + p.wpm * p.elapsed_time_ms, 0) / totalTimeMs)
      : Math.round(pagesToAggregate.reduce((sum, p) => sum + p.wpm, 0) / pagesToAggregate.length);

    const totalKeystrokes = pagesToAggregate.reduce((sum, p) => sum + p.key_events.length, 0);
    const avgAccuracy = totalKeystrokes > 0
      ? pagesToAggregate.reduce((sum, p) => sum + p.accuracy * p.key_events.length, 0) / totalKeystrokes
      : (totalTimeMs > 0
          ? pagesToAggregate.reduce((sum, p) => sum + p.accuracy * p.elapsed_time_ms, 0) / totalTimeMs
          : pagesToAggregate.reduce((sum, p) => sum + p.accuracy, 0) / pagesToAggregate.length);

    const updatedRun: RunRow = {
      ...db.runs[runIdx],
      status: "completed",
      finished_at: finishedAtStr || new Date().toISOString(),
      cpm: avgCpm,
      wpm: avgWpm,
      accuracy: avgAccuracy,
    };
    db.runs[runIdx] = updatedRun;
    writeDbFile(db);
    return updatedRun;
  },
};
