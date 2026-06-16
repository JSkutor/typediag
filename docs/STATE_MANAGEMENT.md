# State Management & Session Lifecycle

This document describes the state management architecture of TypeDiag using Zustand slices, and the core session lifecycle business rules handled by `SessionService`.

---

## 1. Zustand Store Architecture

To maintain a clean and scalable codebase, the state of the typing dashboard is divided into modular slices using Zustand's slice pattern. All slices are combined in `src/store/useTypingStore.ts` into a single store.

```
src/store/
├── typingSlices/
│   ├── createInputSlice.ts      # Input buffers, target text, physical keyboard handler
│   ├── createKeystrokeSlice.ts  # Key release tracking and KeyEvent logging
│   ├── createSessionSlice.ts    # Session lifecycle, run state, & service integration
│   ├── types.ts                 # Type definitions for all slices
│   └── utils.ts                 # Utility helpers (e.g. getKeyToken)
└── useTypingStore.ts            # Root Zustand store assembly
```

### 1.1. Input Slice (`createInputSlice.ts`)

- **Purpose**: Manages the current sentence target text, the user's current typed text, and key buffer mappings.
- **Key State**:
  - `targetText`: The target sentence.
  - `typedText`: The user's input so far.
  - `qwertyBuffer`: Buffer tracking active physical layout presses to resolve correct character mappings.
- **Key Actions**:
  - `setTarget(text)`: Updates the active practice sentence.
  - `setTypedText(text)`: Updates the input string.
  - `handlePhysicalKeyPress(code, shiftKey, timestamp)`: Dispatches keypress logic, determines target characters, and records keystrokes.

### 1.2. Keystroke Slice (`createKeystrokeSlice.ts`)

- **Purpose**: Tracks active key states (press and release times) to calculate key hold durations and latencies.
- **Key State**:
  - `events`: Chronological list of `KeyEvent`s for the current page.
  - `lastKey`: The token of the last pressed key.
  - `lastKeyAt`: The timestamp of the last press.
  - `pressedKeys`: Map of key tokens to their press timestamps (used to measure hold duration on release).
- **Key Actions**:
  - `recordKey(token, timestamp, details)`: Appends a raw key event to the event list.
  - `handlePhysicalKeyRelease(code, timestamp)`: Measures hold duration and removes the key from `pressedKeys`.

### 1.3. Session Slice (`createSessionSlice.ts`)

- **Purpose**: Manages the progress state of the practice run (e.g., `idle`, `running`, `done`) and handles asynchronous persistence calls.
- **Key State**:
  - `status`: Current status (`idle` | `running` | `done`).
  - `startedAt` & `finishedAt`: Session start and end timestamps.
  - `currentRunId`: ID of the active `run` in the database.
  - `runInitPromise`: Pending initialization promise to prevent race conditions during early typing inputs.
- **Key Actions**:
  - `startPage(now)`: Resolves or triggers a new run ID via `SessionService`.
  - `finish(timestamp)`: Completes the current page, persists statistics to the database, and transitions state.
  - `reset()`: Resets the state of the active run.

---

## 2. Session Lifecycle & Outlier Rules (`SessionService`)

Business logic rules regarding session timeouts and data isolation are decoupled into `SessionService.ts`. These rules ensure that analytical models receive clean data, even if the user takes long breaks.

### 2.1. 3-Minute Inactivity (Idle) Rule

When the application starts, or when a user presses the first key of a new sentence:

- The system checks the timestamp of the last active typing event.
- If the gap since the last active page or run start is **greater than 3 minutes**, the current run is finalized (status set to `completed`), and a new `run` is created.
- If the gap is **less than 3 minutes**, the user continues within the same `run`.

### 2.2. 5-Minute Gap Splitting (Intra-page) Rule

If a user pauses mid-sentence for a very long time (e.g., gets up for a coffee) and finishes the sentence later:

- If the elapsed time for a single page exceeds **5 minutes**:
  1.  The active `run` is finalized using the timestamp of the previous completed page.
  2.  A new `run` is spawned.
  3.  The completed page is retroactively assigned to the new `run` to keep sessions concise.
  4.  The starting timestamp of this page is adjusted to prevent a massive 5-minute gap from destroying the WPM calculation (see _Time Correction_ below).

### 2.3. Outlier Latency & Time Correction

To prevent long pauses from skewing metrics like Words Per Minute (WPM) and Characters Per Minute (CPM):

- **WPM/CPM Calculation**: The elapsed time is not calculated as `finishedAt - startedAt`. Instead, it is the sum of the filtered latency durations of all keypresses.
- **Latency Blending**: Individual keypress latencies exceeding **3 seconds** are classified as outliers. During metrics calculation, these outliers are replaced by the average of the non-outlier latencies in the same sentence.
- **Gap Time Correction**: After a gap of 3+ minutes mid-sentence, the starting timestamp of the page is corrected using:
  \[
  T*{\text{started}} = T*{\text{finished}} - \text{Total Latency of Events (excluding the gap duration)}
  \]
  This keeps the timestamps clean and aligned with the physical typing time.
