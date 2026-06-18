# MVSA (Maximum Valid Sequence Aligner) 알고리즘 명세서

MVSA(Maximum Valid Sequence Aligner)는 TypeDiag에서 실시간 타자 입력 시, QWERTY 물리 키 버퍼와 대상 문자열(Target Text)을 정렬(Alignment)하고 오타·미완성 상태를 판별하는 휴리스틱 상태 머신입니다.

| 항목 | 정본 |
| :--- | :--- |
| 구현 | `src/utils/mvsa.ts` — `MaximumValidSequenceAligner`, `runMvsa`, `getCharQwertyIndices` |
| QWERTY 조합 | `src/utils/keyboardMap.ts` — `assembleHangulWithPunctuation`, `isCompleteHangul` |
| 한글 자모 변환 | `es-hangul` — `disassemble`, `assemble`, `convertQwertyToAlphabet` |
| 단위 테스트 | `src/utils/mvsa.test.ts` |
| UI 소비 | `src/components/workspace/PracticePanel.tsx` |
| 입력·완료 판정 | `src/store/typingSlices/createInputSlice.ts` |

---

## 1. 설계 동기 (Why MVSA?)

기존 **LCS** / **Levenshtein** 은 실시간 한글 타이핑에서 다음 한계가 있습니다.

1. **IME 조합 중간 상태**: `한` 입력 중 `하`만 친 상태를 삽입/삭제로 오인.
2. **도깨비불(Carry-over)**: 종성이 다음 글자 초성으로 넘어가는 단계에서 완성형만 비교하면 오타로 오인.
3. **오타 후 복구**: LCS는 먼 미래 글자를 끌어와 WPM/타수를 오염시킴.
4. **백스페이스**: 입력 히스토리 스택 없이 현재 버퍼만으로 정렬 결과를 재현해야 함.

MVSA는 **자소 단위 Normal 매칭**, **단어 격리**, **완성형 글자 수 기반 Bounded Lookahead** 로 위 문제를 다룹니다.

---

## 2. 진입점 및 분기

```typescript
export function runMvsa(
  targetText: string,
  qwertyBuffer: string,
  isKorean: boolean,
): AlignResult[]
```

`MaximumValidSequenceAligner.align()`:

- `isKorean === false` → `runEnglishFallback()` — 타겟·버퍼 인덱스 1:1 `EQUAL` / `REPLACE` / `PENDING` / `INSERT`
- `isKorean === true` → `alignKoreanText()` — 단어 격리 후 `alignWord` 루프

### `isKorean` 전달 (호출부)

- `createInputSlice`: `targetLanguage === "ko"` 이거나, `targetLanguage === "en"` 이면서 타겟에 `[가-힣]` 포함 시 `true`
- `PracticePanel`: `targetLanguage === "ko"` 이거나 타겟에 `[가-힣]` 포함 시 `true`

MVSA는 언어를 스스로 판별하지 않습니다. 호출자가 `isKorean`을 넘깁니다.

---

## 3. 데이터 흐름 (한글 경로)

```mermaid
flowchart TD
    Start([runMvsa targetText, qwertyBuffer])
    --> Split["alignKoreanText: splitIntoWords"]
    --> Loop["단어/공백별 alignWord"]
    Loop --> NM["runNormalMode"]
    NM -->|EQUAL / PARTIAL| Loop
    NM -->|isMismatch| PM["runPanicMode"]
    PM -->|matchFound| RF["recoverFromPanic"]
    PM -->|no match| HU["handleUnrecoverablePanic"]
    RF --> Loop
    HU --> Loop
    Loop --> Excess["버퍼/타겟 잔여 → INSERT / PENDING"]
    Excess --> End([AlignResult[]])
```

### 3.1. 단어 격리 (`splitIntoWords`, `alignKoreanText`)

- `targetText.split(/(\s+)/)` 로 토큰 분할. 공백 토큰(`trim() === ""`)과 비공백 토큰 모두 `{ text, start }` 오프셋과 함께 유지.
- `qwertyBuffer`는 `qPtr`부터 다음 공백(` `) 전까지를 한 단어 영역으로 `slice`하여 1:1 매핑.
- `qPtr`가 버퍼 끝인데 타겟 토큰이 남으면 해당 토큰 전체 `PENDING`.
- 모든 타겟 처리 후 `qPtr`가 버퍼 끝보다 앞이면 남은 버퍼는 `assembleHangulWithPunctuation` + `getCharQwertyIndices`로 `INSERT` emit.

### 3.2. 단어 내부 루프 (`alignWord`)

`while (tIdx < wordTarget.length && qIdx < wordQwerty.length)`:

1. `runNormalMode` — 성공 시 `results`에 push, `tIdx++`, `qIdx` 갱신
2. `isMismatch` 시 `runPanicMode` — `results`에 push, `tIdx`/`qIdx`를 패닉 결과로 점프

루프 종료 후:

- `qIdx < wordQwerty.length` → 잔여 버퍼 `INSERT`
- `tIdx < wordTarget.length` → 잔여 타겟 `PENDING`

---

## 4. Normal Mode (`runNormalMode`)

대상 글자 `targetChar`에 대해:

1. `tDis = disassemble(targetChar)`
2. `wordQwerty[qIdx..]` 각 키를 `convertQwertyToAlphabet` 후 `tDis`와 순차 비교
3. 자모가 어긋나면 즉시 `{ isMismatch: true, newQIdx: qIdx }` 반환

일치가 끝까지 이어지면:

| 조건 | `op` | `char` | `inputIndex` |
| :--- | :--- | :--- | :--- |
| `matchedDisLen === tDis.length` | `EQUAL` | `targetChar` | `qOffset + tempQIdx - 1` |
| 자모가 부족 (버퍼 소진) | `PARTIAL` | `assembleHangulWithPunctuation(wordQwerty.slice(qIdx, tempQIdx))` | 동일 |

---

## 5. Panic Mode (`runPanicMode`)

자소 불일치 시 진입. 남은 단어 버퍼 `panicQBuffer = wordQwerty.slice(qIdx)` 기준:

```typescript
const charToQwertyIdx = getCharQwertyIndices(panicQBuffer);
const panicTyped = assembleHangulWithPunctuation(panicQBuffer);
const maxLookahead = calculateLookaheadWindow(panicTyped);
const targetLookaheadEnd = Math.min(wordTarget.length, tIdx + maxLookahead);
```

### 5.1. Normal vs Panic — 비교 단위

| | Normal Mode | Panic Mode |
| :--- | :--- | :--- |
| 단위 | **자소** (`disassemble` vs `convertQwertyToAlphabet`) | **완성형** (`panicTyped[i]` vs `wordTarget[j]`) |
| 역할 | 조합 중 `PARTIAL` 유지 | 오타 구간에서 복구 글자 탐색 |

Normal은 키 입력마다 자소를 맞추고, Panic은 이미 어긋난 뒤 조합된 문자열에서 복구 지점을 찾습니다.

### 5.2. Lookahead (`calculateLookaheadWindow`)

`panicTyped`를 순회하며 아래에 해당하는 글자 수를 `completeCharCount`로 셉니다.

- `isCompleteHangul(char)` — 완성형 한글 (가-힣)
- `/[a-zA-Z0-9.,?!]/` — 영문·숫자·일부 구두점

`maxLookahead = completeCharCount + 1`

### 5.3. 복구 탐색 (L2R)

`panicTyped`를 `pIdx` 0부터 순회. 각 `pChar`에 대해:

- `isComparableCompleteUnit(pChar)` 가 아니면 **skip** (`continue`)
- `wordTarget[tIdx .. targetLookaheadEnd)` 에서 `pChar`와 같은 첫 `lookTIdx`를 찾으면 복구 지점으로 확정 (`break` 양쪽)
- 복구 구간의 미완성 자모는 Panic 리스트의 완성 글자로 보지 않고, 대응 target을 `OMIT`으로 확정합니다. 예: `가나다라` → `간다라`에서 `ㄴ`은 `나`의 `PARTIAL`이 아니라 `나` 생략의 원인이 됩니다.

**복구 성공 (`recoverFromPanic`)**

- `bestMatchInputIdx > 0` 이면 그 이전 qwerty 구간을 오타로 묶음
  - `tIdx === bestMatchTargetIdx` → `INSERT` (`char`: `typoTyped`)
  - 그 외 → `REPLACE` (`char`: `typoTyped`, `targetChar`: `wordTarget.slice(tIdx, bestMatchTargetIdx)`)
- `bestMatchInputIdx === 0` 이면 `tIdx .. bestMatchTargetIdx-1` → `OMIT`
- 복구 글자 → `EQUAL`
- 반환: `newTIdx = bestMatchTargetIdx + 1`, `newQIdx = qIdx + charToQwertyIdx[bestMatchInputIdx] + 1`

**복구 실패 (`handleUnrecoverablePanic`)**

- `tIdx < wordTarget.length`: 현재 위치 `REPLACE` (`char`: `panicTyped` 전체, `targetChar`: `wordTarget[tIdx]`) + 이후 타겟 `PENDING`
- `tIdx >= wordTarget.length`: `panicTyped` 각 글자 `INSERT`

---

## 6. QWERTY 버퍼 파싱

### 6.1. `assembleHangulWithPunctuation` (`keyboardMap.ts`)

`convertQwertyToAlphabet(qwerty)` 순회 → 연속 자모는 `assemble` → 비자모는 그대로 이어 붙여 **표시용 문자열** 반환.

사용처: `typedText`, Panic의 `panicTyped`, Normal `PARTIAL`의 `char`, excess `INSERT`의 `char`.

### 6.2. `getCharQwertyIndices` (`mvsa.ts`)

동일한 자모 버퍼 순회 패턴에 더해, 조합된 각 글자마다 `disassemble` 길이만큼 알파벳 인덱스를 전진시키고 **해당 글자의 마지막 qwerty 인덱스**를 배열에 push.

사용처: `AlignResult.inputIndex`, Panic의 `charToQwertyIdx`, excess `INSERT`의 `inputIndex`.

두 함수는 순회 구조가 같지만 반환값이 다릅니다 (문자열 vs 인덱스 배열). Panic·excess 처리에서 `panicTyped[i]`와 `charToQwertyIdx[i]`를 짝지어 `inputIndex`를 계산합니다.

---

## 7. 백스페이스와 MVSA

MVSA는 내부 상태·히스토리를 갖지 않습니다. 매 호출 시 `(targetText, qwertyBuffer)` 전체를 처음부터 정렬합니다.

백스페이스 시 **버퍼 변경은 MVSA 밖**에서 일어납니다 (`createInputSlice`):

| 조건 | `nextBuffer` |
| :--- | :--- |
| 영문 (`!isKorean`) | `qwertyBuffer.slice(0, -1)` |
| 한글, `typedText.length >= maxTypedTextLength` | `slice(0, -1)` — 물리 키 1개 삭제 |
| 한글, `typedText.length < maxTypedTextLength` | `assembleHangulWithPunctuation` 결과 길이가 `typedText.length - 1` 이하가 되도록 **가장 긴 접두 버퍼** 탐색 (글자 단위 삭제) |

키 입력 시에만 `createInputSlice`가 `runMvsa`를 호출해 정답·완료를 판정합니다. UI diff는 `PracticePanel`이 `qwertyBuffer` 변경마다 `runMvsa`를 `useMemo`로 재계산합니다.

---

## 8. `AlignResult`

```typescript
export type AlignOp = "EQUAL" | "PARTIAL" | "REPLACE" | "INSERT" | "OMIT" | "PENDING";

export interface AlignResult {
  op: AlignOp;
  char: string;
  targetChar?: string;
  targetIndex?: number;
  inputIndex?: number;
}
```

### 연산자

| `op` | `char` | `targetChar` | `inputIndex` |
| :--- | :--- | :--- | :--- |
| `EQUAL` | 입력 조합 결과 (보통 완성 글자) | 대상 1글자 | 마지막 관련 qwerty 인덱스 |
| `PARTIAL` | 조합 중 표시 (예: `ㅅ`, `하`) | 대상 1글자 | 동일 |
| `REPLACE` | 오타 구간 조합 문자열 (복수 글자 가능) | 대상 1글자 또는 `slice` 구간 문자열 | 오타 구간 마지막 키 |
| `INSERT` | 삽입된 조합 문자열 | 없음 | 삽입 구간 마지막 키 |
| `OMIT` | 없음 (`""`) | 복구 지점 앞에서 입력 없이 건너뛴 대상 1글자 | 없음 |
| `PENDING` | 없음 (`""`) | 아직 입력되지 않은 대상 1글자 | 없음 |

`recoverFromPanic`의 `REPLACE`는 `targetChar`에 `wordTarget.slice(tIdx, bestMatchTargetIdx)` 처럼 **여러 글자**가 들어갈 수 있습니다 (`src/utils/mvsa.test.ts` — `가가` / `나다` 케이스).

### 소비자 동작 (코드 기준)

**`PracticePanel`**

- `diffResult = runMvsa(targetText, qwertyBuffer, isKorean)`
- `lastInputIndex = findLastIndex(d => d.inputIndex !== undefined)` — 커서 위치
- `EQUAL`/`PARTIAL` → 정상 색, `INSERT`/`REPLACE` → 오류 색, `OMIT` → 누락 밑줄, `PENDING` → 일반 대기 글자

**`createInputSlice` (일반 키 입력)**

- `alignments = runMvsa(state.targetText, nextBuffer, isKorean)`
- `lastOp` = `inputIndex`가 있는 마지막 항목
- `isCorrect`: `lastOp.op === "EQUAL" || lastOp.op === "PARTIAL"`
- `expectedChar`: `lastOp.op === "REPLACE"` 일 때 `lastOp.targetChar`
- `shouldFinish`: 마지막 입력 인덱스 뒤에 `PENDING`이 없을 때 `true`; 한글이면 `lastOp.op === "PARTIAL"` 이면 `false`로 덮어씀

---

## 9. 영문 Fallback (`runEnglishFallback`)

`isKorean === false`일 때 `targetText`와 `qwertyBuffer`를 인덱스별 1:1 비교. 한글 자모·단어 패닉·lookahead 없음. 시간 복잡도 `O(max(len(target), len(buffer)))`.

---

## 10. 성능

- Normal: 입력 길이에 선형 `O(N)`.
- Panic: mismatch 시 `maxLookahead`(통상 작음) × `panicTyped.length` 탐색. 단어 단위로만 활성화.
- 매 키입력·버퍼 변경 시 전체 재정렬. 연습 문장 길이에서는 `PracticePanel` `useMemo`와 함께 사용.

---

## 11. 현재 단위 테스트가 고정하는 동작 (`mvsa.test.ts`)

| 테스트 | 시나리오 |
| :--- | :--- |
| identical | `마우스가` 정상 입력, `inputIndex` |
| partial | `마우ㅅ` — `PARTIAL` |
| inserted typo | `정엉말로` — `INSERT` 후 Panic 복구 |
| replaced typo | `가가가라마` — 다글자 `REPLACE` 후 복구 |
| omission | `간다라` — 자모 오타 후 복구 |
| isolate per word | 어절 격리 + 공백 `EQUAL` |
| English | `hello` / `heXlo` Fallback |

`getCharQwertyIndices`는 테스트 파일에 import되어 있으나 단언은 없습니다.
