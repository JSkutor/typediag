# MVSA (Maximum Valid Sequence Aligner) 알고리즘 명세서

## 1. 알고리즘 정의 및 설계 목적 (Definition & Objective)
**MVSA(Maximum Valid Sequence Aligner)**는 TypeDiag에서 실시간 타자 입력 시, QWERTY 물리 키 버퍼와 대상 문자열(Target Text)을 정렬(Alignment)하고 오타·미완성 상태를 판별하는 **휴리스틱 상태 머신(Heuristic State Machine)**입니다.

### 기존 범용 알고리즘(LCS, Levenshtein)의 한계와 MVSA의 차별점
1. **IME 조합 중간 상태 처리**: 기존 알고리즘은 `한`을 입력하는 과정 중 `하` 상태를 단순 삽입/삭제 오타로 오인하지만, MVSA는 자소 단위 매칭을 통해 조합 중인 상태를 판별합니다.
2. **도깨비불 현상(Carry-over) 감지**: 종성이 다음 글자의 초성으로 넘어가는 한글의 특성을 고려하여, 비정상적인 상태 전이를 상태 머신 수준에서 정상적으로 추적하고 동기화를 유지합니다.
3. **오타 전파 방지 (Bounded Lookahead)**: 오타 발생 시 매칭 윈도우(Lookahead Window)를 입력된 완성형 글자 수로 제한하여, 먼 미래의 정답 텍스트와 잘못 정렬(Align)되는 현상을 방지합니다.
4. **스테이트레스(Stateless) 설계**: 이전 상태나 버퍼 히스토리를 내부적으로 유지하지 않고, 매 호출마다 오직 `(targetText, qwertyBuffer)` 입력 쌍만을 바탕으로 처음부터 상태를 재현(Reconstruct)합니다. 단, 성능 병목( $\mathcal{O}(N^2)$ )을 방지하기 위해 Store 영역에서 **Word-Level Memoization Cache**를 주입하여 처리 완료된 안전 구간(Safe Zone)은 $\mathcal{O}(1)$로 반환합니다.

---

## 2. 파일 및 의존성 매핑 (File Mappings)
- **핵심 엔진**: `src/utils/mvsa.ts` — `MaximumValidSequenceAligner`, `runMvsa`
- **조합/정규화 유틸**: `src/utils/keyboardMap.ts` — `assembleHangulWithPunctuation`, `isCompleteHangul`
- **한글 자모 조작**: `es-hangul` 라이브러리 (`disassemble`, `assemble`, `convertQwertyToAlphabet`)
- **소비처**:
  - `src/store/typingSlices/createInputSlice.ts` (입력 판단 및 완료 검증)
  - `src/components/workspace/PracticePanel.tsx` (UI 렌더링용 실시간 Diff 계산)

---

## 3. 데이터 파이프라인 (Data Pipeline)

```mermaid
flowchart TD
    Start([runMvsa targetText, qwertyBuffer])
    --> LangCheck{isKorean?}
    LangCheck -->|False| Eng["runEnglishFallback (1:1 매칭)"]
    LangCheck -->|True| Split["splitIntoWords (어절 단위 분할)"]
    Split --> Loop["단어 영역별 alignWord 루프"]
    Loop --> NM["runNormalMode (자소 매칭)"]
    NM -->|정상 매칭| Loop
    NM -->|불일치 감지| PM["runPanicMode (완성 글자 매칭)"]
    PM -->|복구 성공| RF["recoverFromPanic (정렬 동기화)"]
    PM -->|복구 실패| HU["handleUnrecoverablePanic"]
    RF --> Loop
    HU --> Loop
    Loop --> Group["groupAlignResultsByVisualCharacters (시각적 그룹핑)"]
    Group --> End([AlignResult[] 반환])
```

### 3.1. 어절 격리 (Word Isolation)
- `targetText`를 공백(`\s+`) 기준으로 분할하여 `{ text, start }` 형태의 오프셋 객체로 파싱합니다.
- `qwertyBuffer` 역시 공백 기준으로 나누어 타겟 단어와 1:1로 매핑함으로써, 특정 단어에서 발생한 오타가 다른 단어로 전파되는 것을 원천 차단합니다.

### 3.2. 단어 내부 정렬 알고리즘 (`alignWord`)
각 단어 내부에서는 `tIdx`(타겟 포인터)와 `qIdx`(버퍼 포인터)를 사용하여 비교를 수행합니다.

---

## 4. 핵심 처리 모드 (Normal & Panic Mode)

### 4.1. Normal Mode (자소 기반 매칭)
타겟 문자를 자소 분리(`disassemble`)한 후, QWERTY 입력 문자열의 대응 영자들과 비교합니다.
- **EQUAL**: 타겟 글자의 모든 자소가 버퍼와 정확히 일치하여 조합이 완료된 상태.
- **PARTIAL**: 버퍼가 정답 자소 경로를 따르고 있으나, 아직 타이핑이 미완성된 상태 (예: '하'까지 침).

### 4.2. Panic Mode (완성형 기반 복구 탐색)
자소 불일치가 발생하면 동작 모드를 전환하여 **완성형 한글 글자 단위**로 복구를 시도합니다.

1. **윈도우 크기 산출 (Lookahead Window)**
   불일치 시점 이후의 미처리 버퍼 중, 완성된 글자 수(Complete Unit)를 세어 검색 범위의 한계선(`maxLookahead`)을 정의합니다.
   $$\text{maxLookahead} = \text{completeCharCount} + 1$$
2. **역방향 복구 탐색 (R2L Search)**
   입력 버퍼의 완성 글자들을 왼쪽에서 오른쪽으로 스캔하며, 해당 글자가 제한 범위 내의 타겟 텍스트에 존재하는지 **우측에서 좌측(역방향)**으로 검사합니다. 역방향 비교를 통해 마지막으로 일치하는 동기화 지점(Sync Point)을 빠르게 확보합니다.
3. **정렬 복구 (`recoverFromPanic`)**
   - **동기화 성공**: 동기화 지점 이전의 입력들을 `REPLACE`(오타) 또는 `INSERT`(과입력)로 분류하고, 빠뜨린 정답 글자들은 `OMIT`(누락)으로 처리한 후 복구된 지점부터 Normal Mode로 회귀합니다.
   - **동기화 실패**: 복구 지점을 찾지 못할 경우 잔여 타겟에 대해 `REPLACE` 및 `PENDING` 처리 후 탐색을 종료합니다.

### 4.3. Safe Zone Caching (Window Sliding)
MVSA 알고리즘의 순수 함수적이고 Stateless한 구조는 테스트 및 유지보수에 유리하지만, 타자 텍스트 길이 $N$이 커질 경우 매 키스트로크마다 전체 문자열을 처음부터 재파싱하여 $\mathcal{O}(N)$의 비용이 누적되는 병목($\mathcal{O}(N^2)$)을 유발합니다. 
이를 해결하기 위해 **안전 구간(Safe Zone) 캐싱 기법**이 적용되어 있습니다.
1. **단어 단위 메모이제이션**: 각 어절(Word)별로 공백을 기준으로 분할한 뒤, `targetOffset:qOffset:wordQwerty` 형태의 고유 키를 생성하여 정렬 결과를 `MvsaCache` 객체에 저장합니다.
2. **자연스러운 무효화**: 사용자가 백스페이스를 통해 이전 단어의 공백을 지워 두 단어가 병합될 경우, `wordQwerty` 문자열 전체의 해시 키가 자연스럽게 무효화(Cache Miss)되어 자동으로 재평가됩니다.
3. **Stateless 원칙의 보존**: MVSA 엔진(`mvsa.ts`) 내부에 캐시 상태를 두지 않고, Zustand Store(`createInputSlice`)에서 캐시 맵 객체를 관리하고 매개변수로 주입하는 형태로 순수 함수적인 아키텍처를 유지합니다. 이를 통해 장문 입력 시 실질적인 연산 복잡도를 $\mathcal{O}(W)$(현재 타이핑 중인 단어 길이)로 획기적으로 낮춥니다.

---

## 5. 시각적 캐릭터 그룹핑 (Visual Character Grouping)

한글은 여러 물리 키가 조합되어 하나의 완성된 글자(Visual Character)를 이루므로, 자소 레벨의 정렬 결과 배열을 UI가 렌더링하기 편한 완성형 글자 단위로 매핑해 주어야 합니다.

- **가중치 기반 연산자 우선순위 (Operator Priority)**:
  하나의 완성 글자 영역 내에서 충돌하는 자소별 연산자가 있을 경우, 아래 우선순위에 의거하여 글자의 대표 상태를 결정합니다.
  $$\text{REPLACE (5)} > \text{INSERT (4)} > \text{PARTIAL (3)} > \text{EQUAL (2)} > \text{OMIT (1)} > \text{PENDING (0)}$$

### 예시: 도깨비불 현상 발생 시의 상태 추적 (`가나다라` -> `간다라`)
1. `rk` -> `가` 매칭 (`EQUAL`, index 1)
2. `s` 입력 시 `가`는 `간`으로 변함.
3. `e` -> `다` 입력으로 인해 모음 불일치 발생, Panic Mode 진입.
4. `da` (`다`)와 정답 `다` 매칭 확인 (동기화 지점 탐색 성공).
5. 자소 매칭 결과:
   - `가` -> `EQUAL`
   - `ㄴ` -> `나` 매칭 실패로 인한 오타 처리 구간 포함
   - `다` -> `EQUAL`
6. `groupAlignResultsByVisualCharacters`에 의한 최종 시각적 정렬:
   - `간` -> `PARTIAL` (가 + ㄴ 조합)
   - `나` -> `OMIT` (입력 없이 건너뜜)
   - `다` -> `EQUAL`
   - `라` -> `EQUAL`

---

## 6. 반환 스키마 (`AlignResult`) 및 상태 테이블

```typescript
export type AlignOp = "EQUAL" | "PARTIAL" | "REPLACE" | "INSERT" | "OMIT" | "PENDING";

export interface AlignResult {
  op: AlignOp;
  char: string;         // 사용자 입력 글자 또는 매핑된 상태 문자
  targetChar?: string;  // 대상 정답 문자
  targetIndex?: number; // 정답 문자열 기준의 절대 인덱스
  inputIndex?: number;  // QWERTY 버퍼 기준의 절대 인덱스
}
```

### 정렬 연산자 스펙 (Alignment Operations Specification)

| 연산자 (`op`) | 대응 입력값 (`char`) | 대응 타겟값 (`targetChar`) | 설명 | UI 렌더링 규칙 |
| :--- | :--- | :--- | :--- | :--- |
| **`EQUAL`** | 완전 조합 글자 | 정답 글자 | 정답과 일치하는 글자 입력 완료 | 기본 색상 |
| **`PARTIAL`** | 조합 중인 자소/글자 | 정답 글자 | 올바른 경로로 조합 중인 미완성 글자 | 기본 색상 (커서 포커스) |
| **`REPLACE`** | 입력된 오타 글자 | 정답 글자 (혹은 구간) | 정답 자리에 잘못 입력된 오타 | 빨간색 폰트 / 경고 배경 |
| **`INSERT`** | 초과 입력된 글자 | 없음 | 필요 이상으로 추가 입력된 글자 | 빨간색 폰트 / 경고 배경 |
| **`OMIT`** | 빈 문자 (`""`) | 누락된 정답 글자 | 사용자가 건너뛰어 누락된 정답 글자 | 빨간색 밑줄 공백 |
| **`PENDING`** | 빈 문자 (`""`) | 잔여 정답 글자 | 아직 입력 차례가 오지 않은 글자 | 회색 반투명 폰트 |

---

## 7. 성능 및 시간 복잡도 (Time Complexity)
- **Normal Mode**: 버퍼 길이에 비례하는 선형 탐색 $\mathcal{O}(N)$
- **Panic Mode**: 실패 시 탐색 윈도우 한계가 `maxLookahead`로 강력하게 규제되므로 최악의 경우에도 실질적으로 단어 길이 수준의 상수 시간 $\mathcal{O}(W \cdot L)$ 범위에 속합니다. (여기서 $W$는 남은 입력 크기, $L$은 Lookahead 길이)
- 매 입력 시점마다 전체 정렬을 수행하지만, 텍스트가 단어 단위로 고립되어 연산량이 극도로 제한되므로 브라우저 환경에서 FPS 프레임 드랍 없이 부드러운 UI 갱신이 보장됩니다.
