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

SKDM latency surface는 `latencyMs`만 사용. `holdDurationMs`는 DB 영속화 및 **구름타법** 진단 (`docs/DIAGNOSTICS.md` §3)에 사용.

### 1.5. Topic Mode Fetching & State (`createTopicSlice.ts`)

- **Purpose**: Manages the local pool of generated/fetched sentences for Topic Mode. Logic lives in `createTopicSlice.ts` and is merged into `createInputSlice.ts` via `createTopicTopicActions`.
- **Key State** (`topicInitialState`):
  - `topicTargets`: 문장 풀 (최대 100개)
  - `topicTargetIndex`: 현재 문장 인덱스
  - `currentTopic`: 활성 주제어
  - `isTopicInputActive`, `isTopicLoading`, `isTopicGenerating`: UI/로딩 플래그
- **Key Actions**:
  - `fetchTopicTarget(topic)`: `POST /api/practice/topic` → 404 시 `POST /api/practice/topic/generate` 폴백. body는 `{ topic }`만 전송.
  - `requestMoreTopicTargets(topic)`: 풀 보충용 generate 호출 (내부 함수, `isTopicGenerating` 가드).
  - `topicNextTarget` / `topicPrevTarget`: 문장 이동. `createInputSlice`의 `nextTarget`/`prevTarget`이 topic 모드에서 위임.
  - `handleTopicInputKeyPress`: 주제어 입력 UI (Enter로 검색, Backspace/타건 처리).
  - `applyTopicSetMode`: topic 모드 진입 시 초기 상태 설정.
- **Prefetch**: 초기 fetch 결과가 3개 미만이거나, `topicNextTarget`에서 남은 문장 수 `remainingCount <= 3`이면 `requestMoreTopicTargets`를 백그라운드 호출.
- **Delegation**: `createInputSlice.ts`가 `setMode("topic")`, `nextTarget`, `prevTarget`, 물리 키 라우팅 시 topic slice에 위임.
- 상세 파이프라인: [TOPIC_MODE.md](TOPIC_MODE.md)

### 1.6. Cylindrical Diagnostics (`useCylindricalDiagnostics`)

진단 모드(`diagnosticMode === "cylindrical"`)에서 3패널 통계는 Zustand가 아닌 **전용 훅**이 계산합니다. 구조·용어 SSOT: [DIAGNOSTICS.md](DIAGNOSTICS.md) §0.

| 항목 | SSOT |
| :--- | :--- |
| 이벤트 소스 | `useDiagnosticsTransition` → `analysisEvents` (DB run 병합 또는 live `events`) |
| 통계 훅 | `src/hooks/useCylindricalDiagnostics.ts` |
| 1패스 누산 | `buildDiagnosticsAccumulator` (`src/utils/cylindricalStats/accumulator.ts`) |
| focusKey별 집계 | `finalizeKeystrokeDiagnostics(acc, focusKey)` |
| 분절회귀 | `fitPiecewiseFromLatencies` (`piecewiseRegression.ts`) |
| UI | `CylindricalDiagnosticsPanel.tsx` — `focusKey` 셀렉터, `focusKeyOptions` |

**용어**: 분석 초점은 **`focusKey`**. `toKey === focusKey` 행은 **reference transition**, `fromKey === focusKey` 행은 **outgoing transition**. `holdDurationMs`는 reference에서, Cloud Typing의 latency는 outgoing에서 읽습니다.

`focusKey`만 바꿀 때 `events` 재순회 없이 accumulator를 재사용합니다.

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
  $$
  T_{\text{started}} = T_{\text{finished}} - \text{Total Latency of Events (excluding the gap duration)}
  $$
  - This keeps the timestamps clean and aligned with the physical typing time.

세션 API·게스트 인증 상세: [API.md](API.md), [AUTH.md](AUTH.md)
