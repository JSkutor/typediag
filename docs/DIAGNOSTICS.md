# TypeDiag: Cylindrical Diagnostics 명세

Cylindrical Vector 진단 드로어의 **구조·용어·데이터 흐름**과 주요 통계 알고리즘 명세입니다.

---

## 0. 아키텍처 (구조 SSOT)

### 이벤트 스트림과 전이 방향

`KeyEvent`는 시간순으로 `{ fromKey, toKey, latencyMs, holdDurationMs?, isCorrect?, expectedChar? }`를 기록합니다. **focusKey**를 중심으로 같은 스트림을 두 방향으로 읽습니다.

| 용어 | 식별 | 의미 | 대표 용도 |
| :--- | :--- | :--- | :--- |
| **focusKey** | `focusKey` | 진단·원통 3D의 분석 초점 키 | UI 선택값, Key·Pro 집계 pivot |
| **flowFromKey** | UI `fromKey` → `resolveEffectiveFlowFromKey` | Flow 열 reference `fromKey` (명시 또는 샘플 최다) | 연결 속도·머뭇거림·순서 반대·commonPair |
| **reference transition** | `toKey === focusKey` | focusKey를 **누른** 행 | 분절회귀, MAD, hold(D), 원통 θ·r·z, Flow latency |
| **outgoing transition** | `fromKey === focusKey` | focusKey **다음** 행 | Cloud Typing(L), ND |

```
행 i-1   … → f   toKey=f     holdDurationMs=D   ← reference
행 i     f → …   fromKey=f   latencyMs=L        ← outgoing
```

hold(D)는 reference 행, latency(L)는 outgoing 행에서 읽습니다. 원통 3D(`buildCylindricalVectors`)는 reference만 사용 — [SKDM_ARCHITECTURE.md](SKDM_ARCHITECTURE.md) §5.

### 타 모듈 용어 매핑

| 이 문서 (diag) | 다른 모듈 | 비고 |
| :--- | :--- | :--- |
| **reference transition** (`toKey === focusKey`) | SKDM `summarizeKeys`의 **incoming pair** (`PairStat.toKey` 기준) | focusKey 없이 키보드 전체 집계 |
| **outgoing transition** | SKDM `runPipeline`과 무관 | Cloud Typing 전용 |
| **hold (D)** / `holdDurationMs` | DB `hold_duration_ms` | reference transition에서 키를 누르고 있는 시간 |
| **latency (L)** | `KeyEvent.latencyMs`, DB `latency` | outgoing transition 간격 |
| **semantic 귀속 키** | 오타 시 `charToLayoutKey(expectedChar)` | `errorInducement`, 3-Gram K₃, `spatialErrorDistance` |
| **focusKey** | 원통 UI `focusKey` 인자 | MVSA `targetText`와 별개 도메인 |
| **flowFromKey** | 원통 UI `fromKey` / `cylindrical.ts` `pickDefaultCylindricalSelection` | Flow 열·`referenceLatenciesByFrom` 버킷 키 |

오타 유발율(`errorInducement`)은 오타 스트릭 **시작** 이벤트를 물리 `toKey`가 아니라 **의도 키 `expectedChar`**(layout 변환 후)에 귀속합니다. `expectedChar`가 없으면 키별 카운트에 포함하지 않습니다(세션 전체 `totalErrorStartsCount`에는 포함).

### 모듈 SSOT

| 계층 | SSOT |
| :--- | :--- |
| UI 패널 | `CylindricalDiagnosticsPanel.tsx` — 3열 **Key** / **Flow** / **Pro** |
| UI 서브컴포넌트 | `diagnostics/` — `PiecewiseChart`, `LatencyDistributionView`, `FingerTransitionViz`, `CloudTypingView`, `FatalNgramViz`, `BurstNgramViz`, `formatKey` |
| flowFromKey 정규화 | `accumulator.ts` — `normalizeReferenceFromKey`, `pickRichestReferenceFromKey`, `resolveEffectiveFlowFromKey` |
| 3D 오타 궤도 | `SpatialErrorOrbitViz.tsx` |
| 훅 | `useCylindricalDiagnostics.ts` |
| barrel export | `cylindricalStats/index.ts` |
| 1패스 누산 | `cylindricalStats/accumulator.ts` — `buildDiagnosticsAccumulator` |
| focusKey 집계 | `cylindricalStats/finalize.ts` — `finalizeKeystrokeDiagnostics`, `selectFatalNgrams`, `selectBurstNgrams` |
| Cloud Typing | `cylindricalStats/cloudTyping.ts` — `computeCloudTypingFromSamples` 등 |
| Cloud Typing UI 라벨 | `cylindricalStats/effectivenessLabel.ts` — `getCloudTypingEffectivenessLabel` |
| 분절회귀 차트 | `cylindricalStats/chart.ts` — `calculateChartData` |
| 타입·상수 | `cylindricalStats/types.ts`, `constants.ts` |
| 분절 회귀 | `piecewiseRegression.ts` — `fitPiecewiseFromLatencies` |
| 이상치 상한 | `lib/dev/piecewiseDev.ts` — `ensureFinalUpperBound` |
| dev 실험 | `cloudTypingDev.ts`, `/dev/cloud-typing/` |

### 데이터 흐름

`useCylindricalDiagnostics(events, focusKey, fromKey?)` — **events 변경 시만** O(N) 스캔, **focusKey·fromKey 변경 시** accumulator 재사용.

```mermaid
flowchart TD
    Events["analysisEvents"]
    FromKey["fromKey (optional)"]
    Events --> Acc["buildDiagnosticsAccumulator O(N)"]
    Acc --> FKOpt["focusKeyOptions"]
    Acc --> PW["fitPiecewiseFromLatencies"]
    PW --> Chart["calculateChartData"]
    FromKey --> Fin["finalizeKeystrokeDiagnostics O(k)"]
    Acc --> Fin
    Fin --> Panel["CylindricalDiagnosticsPanel"]
    FKOpt --> Panel
    Chart --> Panel
```

**`DiagnosticsAccumulator`**: `correctByKey`, `pairCounts`, `keyStats`, `shiftLatencies`/`nonShiftLatencies`, `totalErrorStartsCount`, `perKey`, `bursts` (고속 연타 2·3-gram).

**`PerKeyAccumulator`**: `referenceLatencies`, `referenceLatenciesByFrom`, `fingerCounts`, `outgoingSamples`, `errorInducementCount`, `lateKeystrokeCount`, `lateKeystrokeByFrom`, `incorrectReferenceByFrom`, `spatialErrors`, `contextualTypos` (3-Gram 누산).

**flowFromKey** (`resolveEffectiveFlowFromKey`): UI·원통 3D에서 넘긴 `fromKey`가 있으면 `normalizeReferenceFromKey`로 검증 후 사용. 없거나 무효면 `referenceLatenciesByFrom` 중 정답 샘플 수가 가장 많은 fromKey(동률 시 알파벳 우선). Flow 패널의 `speedMetrics`·`hesitation`·`lateKeystroke`·`commonPair`는 모두 이 전이(`flowFromKey → focusKey`)에 스코프됩니다.

훅 반환: `focusKeyOptions`, `outcome`(분절회귀), `chartData`, `diagnostics`(`KeystrokeDiagnostics` — `fatalNgrams`, `burstNgrams` 포함).

---

## 1. 지표 목록

UI는 3열 그리드 (`cylindrical-visualizer.css`). 열 헤더: **Key** · **Flow** · **Pro**. SSOT: `CylindricalDiagnosticsPanel.tsx`.

Flow 열 헤더는 `focusKey ← fromKey` 전이를 표시합니다. `fromKey`는 원통 3D 선택값과 동기화되며, 훅·finalize에 그대로 전달됩니다.

### Key · 키 단위 Dynamics

| UI 라벨 | 요약 | 상세 |
| :--- | :--- | :--- |
| 지연시간 추이 | reference latency 개선 추이·변곡점 | §2 |
| 속도 일관성 | rMAD로 steady / moderate / erratic | focusKey 전체 reference `latencyConsistency` |
| 오타 유발 비율 | 의도 키(expectedChar) 기준 오타 스트릭 시작 비율 | `errorInducement` |
| 같은 손가락 다른 키와 비교 | 같은 손 다른 키 reference 중앙값 대비 차이 | `relativeSpeed` |
| 이전 타건 손가락 위치 | focusKey로 들어오는 reference 전이 전체의 손가락 분포 | `fingerTransitions` |
| 무의식적으로 많이 치는 키 | 오타율 높은 키 Top3 내 focusKey 순위 (키별 타건 >5) | `unconsciousKey` (optional) |
| 시프트로 생기는 추가 지연 | Shift vs 비-Shift 중앙값 차 (Shift ≥10회, 차이 >0) | `shiftPenalty` (optional) |

### Flow · 전이(`flowFromKey → focusKey`) 타이밍 & 오타

| UI 라벨 | 요약 | 상세 |
| :--- | :--- | :--- |
| 연결 속도 | 선택 reference 전이 정답 latency 중앙값·CPM | `speedMetrics` · §1.1 |
| 머뭇거림 | 동일 전이 reference latency IQR 이상치 비율 | `hesitation` · §1.1 |
| 타자 순서 반대 | 연속 오타 중 의도 키가 focusKey↔fromKey로 뒤바뀐 비율 | `lateKeystroke` · §6 |
| 가장 많이 사용한 연결 | `flowFromKey→focusKey` 빈도·focusKey 진입 쌍 내 순위 | `commonPair` (optional) · §1.1 |

### Pro · 공간 & 패턴

| UI 라벨 | 요약 | 상세 |
| :--- | :--- | :--- |
| 오타 위치 | 정답↔실제 키 거리 Q1·Q2·Q3 궤도 | `spatialErrorDistance` |
| 구름타법 | 롤오버 %, hold/latency 바, 효과성 r | §3 |
| 취약한 흐름 | K₁✓ K₂✓ → focusKey, 오타율 >20%, 10회↑ | `fatalNgrams` (optional) · §4 |
| 초고속 구간 | focusKey 포함 2·3-gram, 연속 ≤30ms, 10회↑ | `burstNgrams` (optional) · §5 |

신규 지표는 `buildDiagnosticsAccumulator` 루프에 수집 단계를 추가한 뒤 `finalizeKeystrokeDiagnostics`에서 소비합니다.

### 1.1 Flow 패널 — `flowFromKey` 스코프

Flow 열 지표는 **특정 reference transition** `flowFromKey → focusKey`에 한정됩니다. Key 열의 분절회귀·속도 일관성은 focusKey의 **모든** reference 정답 latency를 씁니다.

**flowFromKey 결정** (`resolveEffectiveFlowFromKey`):

1. `CylindricalDiagnosticsPanel`·원통 3D가 넘긴 `fromKey`가 비어 있지 않으면 `normalizeReferenceFromKey(fromKey, focusKey)`로 검증
2. 명시값이 없거나 무효(자기전이·비알파·제외키)면 `pickRichestReferenceFromKey` — `referenceLatenciesByFrom` 중 정답 샘플 수 최다 fromKey (동률 시 알파벳 우선)
3. 유효한 flowFromKey가 없으면 Flow 수치는 0·null

**`normalizeReferenceFromKey(fromKey, focusKey)`**: 소문자 알파, `from !== focus`, `ACCUMULATOR_EXCLUDE_KEYS` 아님. 원통 3D·Flow 패널 공통 SSOT.

| 지표 | finalize 입력 |
| :--- | :--- |
| `speedMetrics` | `referenceLatenciesByFrom.get(flowFromKey)` 중앙값 → CPM = `60000 / median` |
| `hesitation` | 동일 배열에 IQR 필터: 임계 = $Q_3 + 1.5 \times \mathrm{IQR}$, 초과 비율. `hasTendency` = 비율 ≥ 5% |
| `lateKeystroke` | `lateKeystrokeByFrom.get(flowFromKey)` / `incorrectReferenceByFrom.get(flowFromKey)` · §6 |
| `commonPair` | 전역 `pairCounts`에서 `to === focusKey` 쌍 빈도순 정렬 후 `from === flowFromKey` 행의 순위·횟수 |

---

## 2. 분절 선형 회귀 (Piecewise Regression)

focusKey **reference transition** 정답 latency의 시간순 개선 추이를 두 연결 직선으로 피팅하고 **변곡점 c**를 탐지합니다.

$$y = \beta_0 + \beta_1 x + \beta_2 \max(0,\, x - c)$$

SSOT: `fitPiecewiseFromLatencies(referenceLatencies, focusKey, rawCorrectCount)` — accumulator가 모은 시퀀스를 입력합니다.

**파이프라인**

1. SKDM `finalUpperBound`로 이상치 제외 (레코드 없거나 유효 < 20건 → 중단)
2. 20개 균등 윈도우, 윈도우별 latency **중앙값** → 20점
3. Grid Search로 초기 $c_0$, Muggeo 수렴, 최종 OLS

```mermaid
flowchart LR
    Lat["referenceLatencies"]
    Lat --> Filter["upperBound 필터"]
    Filter --> Win["20 윈도우 median"]
    Win --> Grid["Grid Search c0"]
    Grid --> Muggeo["Muggeo"]
    Muggeo --> OLS["OLS beta"]
```

---

## 3. Cloud Typing — 구름타법 (Hold · Latency)

Pro 열 및 `/dev/cloud-typing`. focusKey **outgoing** 전이에서 롤오버(겹침) 타이밍을 측정합니다.

| 용어 | 정의 |
| :--- | :--- |
| **D** | reference `holdDurationMs` |
| **L** | outgoing `latencyMs` |
| **M** | ND 분모 하한, 기본 300ms (`CLOUD_TYPING_MIN_DENOM`) |
| **ND** | $\lvert L - D \rvert / \max(L + D, M)$ — 0에 가까울수록 구름 |
| **구름 stroke** | ND ≤ 0.25 |
| **분석 풀** | outgoing 원시 샘플 → 머뭇거림 IQR 통과분 |

**샘플 추출** (`extractOutgoingSamples`): outgoing 정답·`latencyMs>0`·제외키 없음 + 직전 행이 reference이고 hold 유효. reference `isCorrect`는 검사 안 함.

**IQR 필터**: outgoing latency 기준 $Q_3 + 1.5 \times \mathrm{IQR}$ 초과 제외.

**집계**: 분석 풀 n ≤ 10 → `insufficientSample`. 비율 → `level` (`not_applied` / `weak`≥0.7 / `moderate`≥0.8 / `strong`≥0.9). ND↔L Pearson r → `effectiveness` (|r|>0.3, p<0.05, n≥5). UI 라벨 SSOT: `effectivenessLabel.ts` (`효과 있음` / `효과 없음` / `역효과` / `관계없음` / `데이터 부족`).

SSOT: 집계 `cylindricalStats/cloudTyping.ts`, dev 산점도 `cloudTypingDev.ts`. 테스트: `cloudTyping.test.ts`, `cloudTypingDev.test.ts`, `pearsonCorrelation.test.ts`.

**제한**: 마지막 키 hold 미기록 시 샘플 누락. IQR로 풀 n 감소 가능. $D>L$ 가능(ND는 절댓값).

---

## 4. Contextual 3-Gram — 치명적 오타 맥락

Pro 열 **「취약한 흐름」**. `finalizeKeystrokeDiagnostics`가 선택한 **focusKey**를 K₃로 두고, **연속 알파 스트림**에서 K₁·K₂가 모두 정타인 직후에 focusKey를 시도한 횟수·오타율을 집계합니다.

### 한 줄 정의

> **K₁(정타) → K₂(정타) → K₃(focusKey)** 연속 알파 3타마다 `total` +1. K₃ 오타면 `error` +1.

인접 3-gram만 셉니다. 이벤트 전체에서 임의의 (i, j, k) 삼중 조합을 열거하지 않습니다.

### 용어

| 용어 | 정의 |
| :--- | :--- |
| **3-Gram 패턴** | `[K₁, K₂, focusKey]` — K₁·K₂ 정타 뒤 focusKey 시도 |
| **K₁, K₂** | `window3Gram`에 쌓인 **직전 2연속 알파 `toKey`**. 각각 `isCorrect === true` 여야 집계 |
| **K₃** | 현재 이벤트. 누산 시 `targetKey`로 해석 — 정타면 `toKey`, 오타면 `charToLayoutKey(expectedChar)` |
| **focusKey** | UI·`finalizeKeystrokeDiagnostics` pivot. K₃의 `targetKey`와 같을 때만 해당 키의 `ngrams` Map에서 조회 |
| **total** | K₃ **정타 + 오타** 모두 (focusKey 시도 1회) |
| **error** | K₃ `isCorrect === false` 만 |
| **오타율** | `error / total × 100` |
| **치명적 맥락** | `total ≥ FATAL_NGRAM_MIN_SAMPLES` **그리고** `오타율 > FATAL_NGRAM_ERROR_RATE_THRESHOLD` |

### 복잡도

| 단계 | 시간 | 설명 |
| :--- | :--- | :--- |
| `buildDiagnosticsAccumulator` §10 | **O(N)** | events 1회 순회. `window3Gram` 길이 ≤ 2, 이벤트당 Map get/set 1회 |
| `selectFatalNgrams` | **O(k log k)** | k = focusKey에 등장한 distinct `K₁→K₂` 패턴 수 (키보드 알파 조합 상한 ≪ N) |
| 전체 | **O(N + k log k) ≈ O(N)** | O(N²)가 아님 — 과거 이벤트 쌍·삼중을 재탐색하지 않음 |

1패스 누산 중 **모든** `targetKey`에 대해 `perKey[targetKey].contextualTypos.ngrams`를 갱신합니다. `focusKey` 변경 시 events 재순회 없이 `perKey.get(focusKey)`만 읽습니다 (`useCylindricalDiagnostics`).

### 수집 알고리즘 (`buildDiagnosticsAccumulator` §10)

전역 `window3Gram: { key, isCorrect }[]` (최대 길이 2)를 유지합니다.

**이벤트당 처리 순서** (코드 순서와 동일):

1. 현재 이벤트를 K₃로 보고, `window3Gram`의 K₁·K₂로 집계 (윈도우 갱신 **전**)
2. 현재 이벤트 `toKey`로 `window3Gram` push 또는 clear

```mermaid
flowchart TD
    E["event i (K₃ 후보)"]
    E --> Q{"window3Gram: K₁✓ K₂✓?"}
    Q -->|yes| T["resolve targetKey\n정타→toKey\n오타→charToLayoutKey(expectedChar)"]
    T --> F{"targetKey alpha\n& not excluded?"}
    F -->|yes| R["perKey[targetKey].ngrams[K₁→K₂]: total++\nerror++ if K₃✗"]
    F -->|no| W
    Q -->|no| W
    R --> W{"toKey 연속 alpha?"}
    W -->|yes| P["push {key, isCorrect}, shift(max 2)"]
    W -->|no| X["window3Gram.length = 0"]
```

**K₃ `targetKey`**

- `isCorrect === true` → `toKey`
- `isCorrect === false` + `expectedChar` → `charToLayoutKey(expectedChar)`
- 오타인데 `expectedChar` 없음 → 집계 안 함
- `targetKey`가 `[a-zA-Z]`가 아니거나 제외키 → 집계 안 함

**맥락 조건**

1. `window3Gram.length ≥ 2`, K₁·K₂ 모두 `isCorrect === true`
2. K₁→K₂→K₃ 사이에 비알파·제외 `toKey`가 없음 (연속 알파 스트림만 윈도우에 유지)

**window 갱신** (집계 직후, 동일 이벤트)

| 현재 `toKey` | 동작 |
| :--- | :--- |
| `[a-zA-Z]` 이고 `ACCUMULATOR_EXCLUDE_KEYS` 아님 | `{ key: toKey, isCorrect: isCorrect===true }` push, 길이 > 2면 shift |
| 그 외 (space, backspace, enter, shift 등) | `window3Gram.length = 0` |

제외키 (`ACCUMULATOR_EXCLUDE_KEYS`): `shift_l`, `shift_r`, `backspace`, `enter`.

`backspace`·`enter`는 윈도우만 끊고, 그 이전에 이미 누적된 ngram 통계는 되돌리지 않습니다.

### 예시 (focusKey = `k`)

| 시퀀스 | `perKey[k].ngrams` | 비고 |
| :--- | :--- | :--- |
| `s✓ → d✓ → k✓` | `s→d`: total +1 | |
| `s✓ → d✓ → k✗ (expected k)` | `s→d`: total +1, error +1 | 오타도 `targetKey=k`로 귀속 |
| `s✗ → d✓ → k✗` | — | K₁ 오타 → 윈도우에 isCorrect=false, 집계 스킵 |
| `s✓ → d✗ → k✗` | — | K₂ 오타 → 동일 |
| `s✓ → d✓ → space → k✗` | — | space가 윈도우 초기화 |
| `s✓ → d✓ → f✓ → backspace → s✓ → d✓ → k✗` | `s→d`: total +1, error +1 | backspace 이후 맥락은 새 3-gram |

### focusKey 집계 (`finalizeKeystrokeDiagnostics`)

`KeystrokeDiagnostics.fatalNgrams` ← `perKey.get(focusKey).contextualTypos.ngrams`.

Map 키: `K₁→K₂` (문자열). 값: `{ total, error }`.

`selectFatalNgrams(ngrams, focusKey)` (export, 단위 테스트 가능):

1. `total >= FATAL_NGRAM_MIN_SAMPLES` (10)
2. `errorRate > FATAL_NGRAM_ERROR_RATE_THRESHOLD` (20%) — **초과**, 20.0% 정확히는 제외
3. 오타율 내림차순 → 동률이면 `total` 내림차순
4. `{ sequence: [K₁, K₂, focusKey], errorRate, totalCount }[]` — **조건 통과 패턴 전부** (상위 1개만 아님)

### UI (`CylindricalDiagnosticsPanel`)

- `diagnostics.fatalNgrams.length > 0`일 때만 카드 렌더 (미달 시 Pro 열에서 숨김)
- 각 패턴: `FatalNgramViz` — K₁→K₂→focusKey 키캡, 오타율, 총 진입 횟수
- 카드 하단 설명에 `FATAL_NGRAM_ERROR_RATE_THRESHOLD`, `FATAL_NGRAM_MIN_SAMPLES` 상수 표기

SSOT: `cylindricalStats/` (`FatalNgramEntry` in `types.ts`, `buildDiagnosticsAccumulator` §10 in `accumulator.ts`, `selectFatalNgrams` in `finalize.ts`). 테스트: `fatalNgram.test.ts`.

---

## 5. Burst N-gram — 고속 연타 조합

Pro 열 **「초고속 구간」**. `finalizeKeystrokeDiagnostics`가 전역 `bursts` Map에서 **focusKey가 포함된** 2·3-gram 패턴 중 달성 횟수 상위 3개를 반환합니다.

### 한 줄 정의

> **연속 정타 알파 스트림**에서 두 번째 키부터 `latencyMs ≤ 30`인 구간마다 2-gram·3-gram을 누산하고, focusKey가 끼어 있는 패턴 중 10회 이상 달성한 것을 횟수 순 상위 3개로 노출합니다.

오타·비알파·제외키가 끼면 연속 맥락이 끊깁니다 (`fatalNgrams` §4와 동일한 `window3Gram` 분기).

### 용어

| 용어 | 정의 |
| :--- | :--- |
| **버스트 구간** | `windowFast`에 쌓인 연속 정타 알파 `toKey` 시퀀스. **첫 키** latency는 제한 없음, **2번째 키부터** `latencyMs ≤ BURST_LATENCY_MAX_MS` 여야 연장 |
| **2-gram 패턴** | `K₁→K₂` — `windowFast` 길이 ≥ 2일 때 마지막 두 키 |
| **3-gram 패턴** | `K₁→K₂→K₃` — `windowFast` 길이 ≥ 3일 때 마지막 세 키 |
| **달성 횟수** | 해당 패턴이 버스트 구간에서 한 번 더 완성될 때마다 `count` +1 |
| **평균 지연** | 2-gram: 마지막 키 `latencyMs` 평균. 3-gram: 마지막 두 키 latency 산술평균의 평균 |
| **focusKey 필터** | `sequence`에 focusKey가 포함된 패턴만 `burstNgrams` 후보 |
| **노출 조건** | `count ≥ BURST_MIN_SAMPLES` (10). 정렬: `count` 내림차순 → 동률이면 `avgLatencyMs` 오름차순. 상위 `BURST_TOP_N` (3)개 |

### 복잡도

| 단계 | 시간 | 설명 |
| :--- | :--- | :--- |
| `buildDiagnosticsAccumulator` (§10 윈도우 갱신 분기) | **O(N)** | events 1회 순회. `windowFast` 길이 ≤ 3, 이벤트당 Map get/set 최대 2회 (2·3-gram) |
| `selectBurstNgrams` | **O(b log b)** | b = `bursts` Map 크기 (distinct 2·3-gram 상한 ≪ N) |
| 전체 | **O(N + b log b) ≈ O(N)** | focusKey 변경 시 events 재순회 없음 |

`bursts`는 **전역** Map — focusKey별로 분리 저장하지 않습니다. `finalize` 단계에서 `sequence.includes(focusKey)`로 필터합니다.

### 수집 알고리즘 (`buildDiagnosticsAccumulator` §10 윈도우 갱신 분기)

3-Gram `window3Gram` 갱신과 **동일 이벤트·동일 분기**에서 `windowFast: { key, latencyMs }[]`를 유지합니다. (코드상 별도 §11 없음 — 연속 알파 `toKey` 분기 내 연속 처리.)

**이벤트당 처리** (`toKey`가 연속 알파일 때):

1. `isCorrect === true`:
   - `latencyMs ≤ 30` **그리고** `windowFast.length > 0` → 현재 키 push (버스트 연장)
   - 그 외 → `windowFast` 초기화 후 현재 키만 push (새 구간 시작)
   - `length ≥ 2` → 마지막 2키로 2-gram `count`/`totalLatencyMs` 누산
   - `length ≥ 3` → 마지막 3키로 3-gram 누산 (`totalLatencyMs`에 마지막 두 latency 평균 가산)
2. `isCorrect === false` → `windowFast.length = 0`
3. 비알파·제외 `toKey` → `window3Gram`·`windowFast` 모두 초기화

```mermaid
flowchart TD
    E["event (정타 알파 toKey)"]
    E --> L{"latency ≤ 30ms\n& windowFast 비어있지 않음?"}
    L -->|yes| Ext["windowFast push"]
    L -->|no| New["windowFast clear + push"]
    Ext --> G2{"length ≥ 2?"}
    New --> G2
    G2 -->|yes| B2["bursts[K₁→K₂]: count++\ntotal += K₂.latency"]
    G2 -->|no| G3
    B2 --> G3{"length ≥ 3?"}
    G3 -->|yes| B3["bursts[K₁→K₂→K₃]: count++\ntotal += avg(K₂,K₃).latency"]
```

### 예시 (focusKey = `k`)

| 시퀀스 (latency) | `bursts` | 비고 |
| :--- | :--- | :--- |
| `s(50)✓ → d(25)✓ → k(20)✓` | `d→k` +1, `s→d→k` +1 | 첫 키 50ms — 구간 시작만, 연장은 d·k가 ≤30 |
| `s(20)✓ → d(25)✓ → k(20)✓ → j(28)✓` | `d→k`, `k→j`, `s→d→k`, `d→k→j` 각 +1 | 4연속 버스트 |
| `s(20)✓ → d(40)✓` | — | d latency >30 → 구간 리셋, 2-gram 미형성 |
| `s(20)✓ → d(25)✗` | — | 오타 → `windowFast` clear |
| `s(20)✓ → space` | — | 비알파 → 윈도우 clear |

### focusKey 집계 (`finalizeKeystrokeDiagnostics`)

`KeystrokeDiagnostics.burstNgrams` ← `selectBurstNgrams(acc.bursts, focusKey)` — `count ≥ BURST_MIN_SAMPLES` 이고 `sequence`에 focusKey 포함 → 정렬 → 상위 `BURST_TOP_N`.

`BurstNgram`: `{ sequence: string[], avgLatencyMs, count }`. (`types.ts`)

### UI (`CylindricalDiagnosticsPanel`)

- `diagnostics.burstNgrams.length > 0`일 때만 카드 렌더
- 각 패턴: `BurstNgramViz` — 순위, 키 시퀀스(초록 키캡), 평균 ms, 달성 횟수
- 카드 설명: focusKey 포함·연속 30ms 이하·상위 3개

SSOT: `cylindricalStats/` (`BurstNgram` in `types.ts`, burst 누산 in `accumulator.ts` §10 분기, `selectBurstNgrams` in `finalize.ts`). 테스트: `burstNgram.test.ts`.

---

## 6. Late Keystroke — 타자 순서 반대

Flow 열 **「타자 순서 반대」**. 인접 두 타에서 **연속 오타**이면서, **의도한 글자(expectedChar)** 가 `focusKey`와 `flowFromKey`를 서로 바꿔 친 경우를 집계합니다. 물리 키 `toKey`가 아니라 `expectedChar → layout 키`로 판별합니다.

### 한 줄 정의

> reference 전이 `flowFromKey → focusKey`에서 **물리 오타**가 난 뒤, **직전·현재 연속 오타** 중 직전 의도 = `focusKey`, 현재 의도 = `flowFromKey`이면 **순서 뒤바뀜** 1건.

전형적 사례: `"abc"`를 치려다 `"acb"`를 입력 — `b`와 `c` 위치가 바뀐 연속 오타.

### 용어

| 용어 | 정의 |
| :--- | :--- |
| **focusKey** | UI pivot. 현재 이벤트 `toKey` (집계 키) |
| **flowFromKey** | `resolveEffectiveFlowFromKey`로 정한 reference `fromKey`. finalize 시 분자·분모 필터 |
| **prevExpected** | 직전 이벤트 `expectedChar` → `charToLayoutKey` (소문자 알파) |
| **currExpected** | 현재 이벤트 `expectedChar` → `charToLayoutKey` |
| **fromNorm** | `normalizeReferenceFromKey(event.fromKey, event.toKey)` — 현재 행의 reference fromKey |
| **count** | `perKey[focusKey].lateKeystrokeByFrom.get(flowFromKey)` |
| **totalErrorsCount** | `perKey[focusKey].incorrectReferenceByFrom.get(flowFromKey)` — 해당 전이에서 `toKey===focusKey`인 **물리 오타** 횟수 |
| **rate** | `totalErrorsCount > 0` 이면 `count / totalErrorsCount × 100`, 아니면 0 |

### 판별 조건 (`buildDiagnosticsAccumulator` §6)

현재 이벤트 `event`, 직전 `prevEvent`에 대해 **모두** 만족:

1. `prevEvent.isCorrect === false` **그리고** `event.isCorrect === false` (연속 오타)
2. `event.toKey`가 알파이고 `ACCUMULATOR_EXCLUDE_KEYS` 아님
3. `event.fromKey` 존재
4. `fromNorm = normalizeReferenceFromKey(event.fromKey, event.toKey)` 유효
5. `prevExpected === focusKey` (소문자)
6. `currExpected === fromNorm`

조건 5·6이 핵심: 직전 타에서는 **focusKey를 쳐야 했는데** 다른 키를 눌렀고, 이번 타에서는 **fromKey를 쳐야 했는데** focusKey 자리에서 다른 키를 눌렀다는 뜻입니다. 두 오타의 **의도 글자**가 focusKey↔fromKey로 맞바뀐 패턴입니다.

```mermaid
flowchart TD
    E["event: toKey=focusKey, isCorrect=false"]
    P["prevEvent: isCorrect=false"]
    E --> C1{"연속 오타?"}
    P --> C1
    C1 -->|yes| C2{"prevExpected = focusKey?"}
    C2 -->|yes| C3{"currExpected = fromNorm?"}
    C3 -->|yes| Inc["lateKeystrokeByFrom[fromNorm]++\nincorrectReferenceByFrom는 §2 keyStats에서 별도 누산"]
```

### 예시 (focusKey = `b`, flowFromKey = `c`)

목표 문자열 `abc`, 실제 입력 `a`✓ → `c`✗(expected `b`) → `b`✗(expected `c`):

| 행 | fromKey | toKey | expectedChar | 판정 |
| :--- | :--- | :--- | :--- | :--- |
| 0 | — | `a` | `a` | 정타 |
| 1 | `a` | `c` | `b` | 오타 (b 자리에 c) |
| 2 | `c` | `b` | `c` | 오타 + **순서 뒤바뀜** (`prevExpected=b`, `currExpected=c`, `fromNorm=c`) |

- `incorrectReferenceByFrom["c"]` = 1 (`c→b` 물리 오타)
- `lateKeystrokeByFrom["c"]` = 1 → **rate 100%**

동일 focusKey `b`에 대해 flowFromKey = `a`만 보면 분자 0 → **rate 0%** (다른 진입 경로 오타는 제외).

### focusKey 집계 (`finalizeKeystrokeDiagnostics`)

`resolveLateKeystroke(keyEntry, focusKey, flowFromKey)` — `flowFromKey`가 없으면 `{ rate: 0, count: 0, totalErrorsCount: 0 }`.

SSOT: `accumulator.ts` §6·§2(`incorrectReferenceByFrom`), `finalize.ts` `resolveLateKeystroke`. 테스트: `useCylindricalDiagnostics.test.ts` (`lateKeystroke`, `should scope late keystroke rate to the selected reference fromKey`).

---

## 부록 · 상수

| 상수 | 값 |
| :--- | :--- |
| `CLOUD_TYPING_MIN_DENOM` | 300 |
| `CLOUD_TYPING_ND_MAX` | 0.25 |
| `CLOUD_TYPING_MIN_SAMPLES` | 10 |
| `CLOUD_TYPING_LEVEL_WEAK` / `MODERATE` / `STRONG` | 0.7 / 0.8 / 0.9 |
| `FATAL_NGRAM_MIN_SAMPLES` | 10 |
| `FATAL_NGRAM_ERROR_RATE_THRESHOLD` | 20 (%) |
| `BURST_LATENCY_MAX_MS` | 30 |
| `BURST_MIN_SAMPLES` | 10 |
| `BURST_TOP_N` | 3 |
| `CLOUD_TYPING_CORRELATION_R_THRESHOLD` | 0.3 |
| `CLOUD_TYPING_CORRELATION_P_THRESHOLD` | 0.05 |
| `CLOUD_TYPING_CORRELATION_MIN_SAMPLES` | 5 |
| `LATENCY_CONSISTENCY_MIN_SAMPLES` | 5 |
| `LATENCY_HISTOGRAM_BINS` | 12 |
| Latency 히스토그램 X축 | `0` ~ SKDM `final_upper_bound_ms` (미산출 시 `OUTLIER_HARD_CUTOFF_MS` = 2000). 키 간 동일 구간 |
| rMAD 등급 (`steady` / `moderate` / `erratic`) | &lt; 0.2 / &lt; 0.35 / 그 이상 |
