# MVSA (Maximum Valid Sequence Aligner) 알고리즘 명세서

MVSA(Maximum Valid Sequence Aligner)는 TypeDiag에서 실시간 타자 입력 시, 입력 문자열과 대상 문자열(Target Text)을 자소 단위까지 분석하여 정렬(Alignment)하고 오타 및 미완성 상태를 정확하게 판별하기 위해 설계된 독자적인 휴리스틱 상태 머신 알고리즘입니다.

이 문서는 MVSA 알고리즘의 설계 동기, 핵심 아키텍처, 작동 방식 및 예외 처리 로직에 대해 상세히 설명합니다.

---

## 1. 설계 동기 (Why MVSA?)

기존 타자 연습기나 텍스트 에디터에서 널리 쓰이는 **LCS(Longest Common Subsequence)** 나 **Levenshtein Distance(최소 편집 거리)** 알고리즘은 실시간 타자 진단 환경에서 다음과 같은 한계점을 가집니다.

1. **실시간 조합형 한글(IME) 인식 한계**: 한글은 초성/중성/종성이 실시간으로 조립되는 특성을 가집니다. 일반적인 LCS는 `한`을 입력하는 과정에서 발생하는 중간 상태(`하` -> `한`)를 오타나 별개의 문자 삽입/삭제로 오인하여 불필요한 레이아웃 왜곡을 일으킵니다.
2. **도깨비불 현상(Carry-over split)**: 한글 입력기 특성상 다음 글자의 초성을 치기 전까지는 이전 글자의 종성으로 달라붙는 현상(예: `머그`를 치려고 `머ㄱ`까지 쳤을 때 `먹`이 되었다가 `ㅇ`을 치면 `머그`로 분리되는 현상)이 발생합니다. 자소 단위 대조 없이 완성형 문자만 비교하면 이 시점의 입력을 심각한 오타로 잘못 감지하게 됩니다.
3. **오타 극복 인지(Lookahead Heuristic)**: 사용자가 오타를 쳤을 때, 오타를 무시하고 다음 자리를 올바르게 치기 시작하는 시점(Recovery Point)을 정교하게 판별해야 합니다. 무제한 탐색을 수행하는 LCS는 너무 먼 미래의 글자를 끌고 와 억지로 일치(Mismatch alignment)시킴으로써 전체 타수와 WPM 계산을 오염시킵니다.
4. **무상태 복구(Stateless Rollback)**: 백스페이스(Backspace)를 눌러 오타를 지우고 되돌아갈 때, 입력 히스토리 상태를 복잡하게 관리하지 않고도 단순 버퍼 상태만으로 동일한 정렬 결과를 보장해야 합니다.

MVSA는 이러한 문제를 극복하기 위해 **QWERTY 물리 레이아웃 기반 자소 대조**, **독립적 단어 격리**, **완성형 글자 수 기반 Bounded Lookahead** 개념을 도입하여 실시간 타이핑에 특화된 상태 머신으로 설계되었습니다.

---

## 2. 핵심 아키텍처 및 데이터 흐름

MVSA는 크게 다음의 순서로 데이터를 정제하고 정렬을 수행합니다.

```mermaid
flowchart TD
    Start([Input: Target Text & QWERTY Buffer]) 
    --> Split["1. 단어 단위 격리 (Word Isolation)<br>공백 기준 단어 분할"]
    --> CheckLang{"한글 타겟 여부?"}

    CheckLang -- Yes --> LoopWords["2. 각 단어별 alignWord 실행"]
    CheckLang -- No --> SimpleAlign["영타 Fallback: 1:1 순차 대조"]

    LoopWords --> NormalMode["3. Normal Mode (순차 매칭)<br>자소 단위 일치 여부 대조"]
    NormalMode -- "일치 (EQUAL)" --> NormalMode
    NormalMode -- "미완성 (PARTIAL)" --> NormalMode
    NormalMode -- "불일치 발생" --> PanicMode["4. Panic Mode (오타 탐색)<br>Bounded Lookahead Window 설정"]

    PanicMode -- "복구 지점 발견 (matchFound)" --> Recovery["5. 오타 영역 INSERT/REPLACE 처리<br>Normal Mode 복귀"]
    PanicMode -- "일치 문자 없음" --> CompleteWord["6. 남은 버퍼 REPLACE/INSERT 처리"]

    Recovery --> LoopWords
    SimpleAlign --> End([Output: AlignResult[]])
    CompleteWord --> End
    LoopWords --> End
```

### 2.1. 단어 단위 격리 (Word Isolation)
* 사용자의 오타가 다음 단어(Word)의 정렬에 영향을 주지 않도록, 전체 `targetText`를 공백(`\s+`) 기준으로 쪼개어 단어 리스트를 구성합니다.
* `qwertyBuffer` 또한 공백을 기준으로 쪼개어 각 단어 영역을 1:1로 매핑합니다.
* 한 단어 안에서 아무리 심한 오타가 발생해도 공백 문자를 만나면 포인터가 동기화되므로, 오타의 파급 효과가 어절 단위로 차단(Isolate)됩니다.

---

## 3. 세부 매칭 알고리즘

### 3.1. Normal Mode (자소 순차 대조)
Normal Mode에서는 대상 문자(Target Character)의 자소를 분석하여 입력 버퍼의 QWERTY 자판값과 1:1 순차 비교를 진행합니다.

1. **자소 분해**: 대상 문자(예: `안`)를 자소 단위로 분해합니다 (`[ㅇ, ㅏ, ㄴ]`).
2. **QWERTY 자판 비교**: 입력 버퍼의 QWERTY 키 값을 알파벳/한글 자모로 변환하여 순차 대조합니다.
   - **EQUAL (완전 일치)**: 대상 문자의 모든 자소가 순서대로 매핑되어 완벽히 일치하는 경우.
   - **PARTIAL (미완성 일치)**: 입력된 QWERTY 자모들이 대상 문자의 앞부분 자소들과 일치하지만, 아직 대상 문자를 완성하기에 입력 자수가 모자란 상태 (예: 대상은 `한`인데 입력은 `ㅎ` 또는 `하`만 친 상태).
3. **불일치 감지**: 입력된 자모가 대상 문자의 자소와 어긋나는 즉시 Normal Mode를 중단하고 **Panic Mode**로 전환합니다.

### 3.2. Panic Mode (오타 복구 탐색)
타이핑 중 오타(Mismatch)가 발생했을 때, 사용자가 언제 다시 오타를 멈추고 올바른 위치로 복구했는지 찾아내는 단계입니다.

#### ① 탐색 윈도우 설정 (Lookahead Heuristic)
오타를 쳤을 때 무한정 뒤를 뒤져서 미래의 글자와 대조하는 것을 방지하기 위해, 남은 입력 버퍼의 **완성형 문자 개수**에 기반한 유동적 탐색 윈도우를 정의합니다.
1. 현재 Panic Mode가 시작된 시점의 남은 QWERTY 버퍼를 조합(`assembleHangulWithPunctuation`)합니다.
2. 조합된 텍스트 중 **완성형 한글** 또는 **알파벳/숫자/유효 기호**의 개수 `completeCharCount`를 구합니다.
3. 대상 문자열에서의 최대 탐색 범위(`maxLookahead`)는 다음과 같이 제한됩니다:
   $$\text{maxLookahead} = \text{completeCharCount} + 1$$
4. 즉, 사용자가 오타 상태에서 실제로 입력한 글자 수보다 더 멀리 있는 대상 문자는 절대 탐색하지 않음으로써 매칭 오염을 방지합니다.

#### ② Chronological Search (Left-to-Right)
LCS와 달리 실시간 입력의 시간 흐름을 보장하기 위해 QWERTY 버퍼의 조합 결과를 왼쪽에서 오른쪽(L2R)으로 검색합니다.
* 탐색 범위 내에서 `panicTyped[pIdx]`와 `wordTarget[lookTIdx]`가 일치하는 최소 인덱스 쌍을 찾습니다.
* **복구 지점 발견 시 (Recovery)**:
  - 복구된 일치 문자 이전까지의 잘못 입력된 버퍼 구간을 `INSERT` 혹은 `REPLACE` 연산으로 정렬합니다.
  - 일치하는 대상 문자는 `EQUAL` 처리합니다.
  - 포인터를 복구 지점 이후로 순간 이동시킨 뒤, 다시 **Normal Mode**로 전환합니다.
* **복구 지점 미발견 시**:
  - 오타 상태에서 단어 끝까지 올바른 문자가 입력되지 않은 경우이므로, 남은 단어 영역 전체를 `REPLACE` 또는 `INSERT`/`DELETE`로 채우고 매칭을 종료합니다.

---

## 4. 한국어 IME 및 백스페이스 예외 처리

### 4.1. 도깨비불 현상 (Carry-over Split) 방지
한글 입력기의 실시간 조합을 지원하기 위해 QWERTY 물리 키 입력 값을 `es-hangul` 라이브러리를 통해 한글 자모로 가상 변환하여 비교합니다.
* QWERTY 버퍼 자체는 영문 문자열(예: `dkssud`)이지만, 이를 실시간 자모로 디스어셈블 및 가상 매칭함으로써 종성이 다음 글자의 초성으로 넘어가는 단계에서도 정밀한 `PARTIAL` 상태를 유지합니다.

### 4.2. 무상태성 (Stateless) 설계와 Backspace 복구
MVSA는 입력 과정의 전이 상태(Transition state)나 이전 히스토리 스택을 저장하지 않는 **Stateless** 구조입니다.

* 사용자가 `Backspace`를 누르면 Zustand 스토어의 `qwertyBuffer`에서 마지막 1글자(QWERTY 물리 문자 1개)가 제거됩니다.
* 단지 줄어든 `qwertyBuffer` 전체가 `alignInput`에 새로 입력될 뿐이며, 알고리즘은 처음부터 다시 매칭을 수행합니다.
* 이 방식은 다음과 같은 강력한 이점을 제공합니다:
  - 복잡한 히스토리 롤백이나 스택 깨짐 버그가 발생하지 않습니다.
  - 한글의 자소 단위 삭제(`한` $\to$ `하` $\to$ `ㅎ`)가 입력 버퍼의 차원 축소에 의해 완전하고 자연스럽게 렌더링에 반영됩니다.

---

## 5. Fallback & 성능 분석

### 5.1. English Fallback
* 타겟 텍스트가 영어일 경우(`isKorean === false`), 한글 자모 분석이나 단어 단위 패닉 윈도우 계산이 불필요합니다.
* 이 경우 즉시 1:1 순차 루프 대조 알고리즘으로 분기하여 `EQUAL`, `REPLACE`, `INSERT`, `DELETE` 배열을 즉시 반환(O(N))함으로써 불필요한 CPU 연산을 회피합니다.

### 5.2. 성능 복잡도
* **Normal Mode**: 단순 1:1 순차 순회이므로 시간 복잡도는 $O(N)$입니다 ($N$은 입력 길이).
* **Panic Mode**: Mismatch 발생 시 활성화되지만, 탐색 범위가 $W = \text{maxLookahead}$로 매우 작게 제한(일반적으로 $W \le 4$)되므로, 최악의 경우에도 단어 내 오타 구간 복구 탐색 연산은 매우 가볍게 끝납니다.
* 따라서 매 키입력마다 실시간으로 알고리즘이 동작해도 1ms 미만의 지연 시간 내에 연산이 완료되어 렌더링 성능에 영향이 없습니다.
