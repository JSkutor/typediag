# State Management & Session Lifecycle

This document describes the state management architecture of TypeDiag using Zustand slices, and the core session lifecycle business rules handled by `SessionService`.

---

## 1. Zustand Store Architecture

To maintain a clean and scalable codebase, the state of the typing dashboard is divided into modular slices using Zustand's slice pattern. All slices are combined in `src/store/useTypingStore.ts` into a single store.

```
src/store/
├── typingSlices/
│   ├── createInputSlice.ts      # Input buffers, target text, physical keyboard handler
│   ├── createTopicSlice.ts      # Topic mode state, fetch/prefetch, topic key handling
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
  - `typedText`: The user's input so far (assembled Hangul for Korean targets).
  - `qwertyBuffer`: Raw physical QWERTY key sequence (e.g. `"gks"` for `한`).
  - `maxTypedTextLength`: High-water mark of `typedText.length` — **not decremented on backspace**. Used to detect when the user is deleting back into previously completed text.
  - `alignments`: Latest MVSA alignment results (drives `PracticePanel` diff/highlight/cursor).
- **Key Actions**:
  - `setTarget(text)`: Updates the active practice sentence.
  - `setTypedText(text)`: Updates the input string.
  - `handlePhysicalKeyPress(code, shiftKey, timestamp)`: Dispatches keypress logic, determines target characters, and records keystrokes.
    - **Note**: This action delegates the alignment logic to the **[MVSA (Maximum Valid Sequence Aligner) Algorithm](MVSA_ALGORITHM.md)**. MVSA dynamically maps raw physical key inputs to Hangul Jamo sequences for precise error diagnostics.

#### Backspace deletion (`handlePhysicalKeyPress`)

- **In `done` status**: Pressing `Backspace` transitions the status back to `"running"`, clears `finishedAt`, and continues to delete characters normally.
- **In other statuses**: There is no native `<input>` — deletion mutates `qwertyBuffer` directly, then re-assembles `typedText` and re-runs MVSA.

| Language | Default | When `shouldDeleteCharByChar` |
| :--- | :--- | :--- |
| **English** | Remove last QWERTY key (`slice(0, -1)`) | N/A |
| **Korean** | Remove last QWERTY key (one jamo) | Remove the last **complete visual character** in one step |

Korean `shouldDeleteCharByChar` is `true` when **both**:

1. `typedText.length < maxTypedTextLength` — user is deleting back into text they had already progressed past.
2. Last alignment op is not `PARTIAL` or `PENDING` — not an IME intermediate / carry-over state (e.g. 종성 빨림).

When deleting by character, `getCharQwertyIndices(qwertyBuffer)` finds each visual character's end index in the QWERTY buffer and slices back to the previous character's boundary (or clears the buffer if only one character remains).

`evaluateKeystroke` always marks backspace as `isCorrect: true` (valid correction). Each press (including OS key-repeat events) appends a separate `backspace` `KeyEvent`.

**Example** (target `한글`, typed `gks` → `r`):

1. `한` — `maxTypedTextLength = 1`
2. `한ㄱ` — `maxTypedTextLength = 2`
3. Backspace → removes `ㄱ` only (jamo-level; not going backwards yet)
4. Backspace → removes `한` entirely (char-level; going backwards into completed text)

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
    - `holdDurationMs` is **`null` at `recordKey` time** and set to a **number on keyup** (see §1.4 key repeat note).

### 1.3. Session Slice (`createSessionSlice.ts`)

- **Purpose**: Manages the progress state of the practice run (e.g., `idle`, `running`, `done`) and handles asynchronous persistence calls.
- **Key State**:
  - `status`: Current status (`idle` | `running` | `done`).
  - `startedAt` & `finishedAt`: Session start and end timestamps.
  - `currentRunId`: ID of the active `run` in the database.
  - `runInitPromise`: Pending initialization promise to prevent race conditions during early typing inputs.
- **Key Actions**:
  - `startPage(now)`: Resolves or triggers a new run ID via `SessionService`.
  - `finish(timestamp)`: Completes the current page (transitions status to `"done"` and sets finished timestamp) without immediately persisting to the database.
  - `saveCurrentPage()`: Synchronously sets status to `"idle"` (to prevent duplicate saves) and asynchronously persists the current completed page to the database. Triggered during page transition actions (`nextTarget`, `setTarget`, `setMode`).
  - `reset()`: Resets the state of the active run.

### 1.4. Keyboard Bindings (`useWorkspaceKeybindings.ts`)

Global `keydown` / `keyup` listeners route practice-mode input to the typing store.

| Key / condition | Behavior |
| :--- | :--- |
| `Tab` (practice) | Transition to diagnostics |
| `Tab` (diagnostics) | Return to practice |
| `Ctrl` / `Meta` / `Alt` combos | Ignored in practice |
| `Space`, `ArrowRight`, `Enter`, `Backspace` | `preventDefault()` in practice |
| Other keys | `handlePhysicalKeyPress` → `handlePhysicalKeyRelease` on keyup |

#### Key repeat (`e.repeat`)

- **Letter / symbol keys**: repeat events are **ignored** — holding `a` does not produce `aaaa…`.
- **Backspace**: repeat events are **allowed** — holding backspace triggers continuous deletion via repeated `handlePhysicalKeyPress("Backspace", …)` calls.

Implementation: `if (e.repeat && e.code !== "Backspace") return;`

When the buffer is empty, repeat backspace events still arrive from the OS but `handlePhysicalKeyPress` no-ops safely.

#### Hold duration during key repeat

`KeyEvent.holdDurationMs` is typed as `number | null | undefined`. On keyup, `handlePhysicalKeyRelease` finds the **last** event whose `toKey` matches the released key and writes `holdDurationMs`.

For a held backspace burst:

- Each repeat keydown creates a new event with `holdDurationMs: null`.
- Only the **final** backspace event in the burst receives the total press-to-release duration on keyup; earlier repeat events stay `null`.

SKDM latency analysis does not use `holdDurationMs`; this is mainly for persistence / future diagnostics.

### 1.5. Topic Mode Fetching & State (`useTopicTargets`)

- **Purpose**: Manages the local pool of generated/fetched sentences specifically for Topic Mode, providing an infinite-scroll-like experience.
- **Key State / Mechanism**:
  - Maintains an array of `targets` fetched from `/api/practice/topic`.
  - When the user types through the sentences and the remaining count in the pool drops below a threshold (e.g., `< 3`), it triggers `fetchMoreTopicTargets()`.
  - `fetchMoreTopicTargets()` calls the LLM fallback (`/api/practice/topic/generate`) passing the `existingSentences` array to prevent duplicate sentences from being generated by Gemini.
  - Topic mode logic lives in `createTopicSlice.ts` (`fetchTopicTarget`, prefetch, topic input key handling). `createInputSlice.ts` delegates to it for `setMode("topic")`, `nextTarget`, and topic key routing.
  - This state is strictly isolated from the generic typing flow to keep the core typing store agnostic of the specific mode's data-fetching strategies.

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
