# TypeDiag: 지연 진단 통계 & Piecewise Regression 명세서

이 문서는 **TypeDiag**에서 사용자의 타건 개선 추이를 파악하기 위해 사용하는 핵심 통계 알고리즘인 **분절 선형 회귀 (Piecewise Linear Regression)**의 동작 방식과 수학적/기술적 로직을 정리한 명세서입니다.

---

## 1. 2D Piecewise Linear Regression (분절 선형 회귀)

사용자가 특정 키를 반복 연습함에 따라 지연 시간(latencyMs)이 개선되는 양상을 두 개의 연결된 직선으로 피팅하는 수학적 회귀 모델입니다. 

기존의 단순 선형 회귀와 달리, **"사용자가 연습을 통해 정체기를 극복하거나 급격히 속도가 개선되는 특정 변곡점(Breakpoint)"**을 수학적으로 탐지하는 데 목적이 있습니다.

```
지연 시간 (latencyMs)
  ▲
  │   \ (기울기: β1)
  │    \
  │     \
  │──────*────────────── (변곡점 c)
  │       \ (기울기: β1 + β2)
  │        \────────────────
  └──────────────────────────► 시간 순서 (Index)
```

### 1.1. 수학적 모델 방정식
$$y = \beta_0 + \beta_1 x + \beta_2 \max(0, \, x - c)$$
*   **$x \le c$ (분절점 이전)**: $y = \beta_0 + \beta_1 x$
*   **$x > c$ (분절점 이후)**: $y = (\beta_0 - \beta_2 c) + (\beta_1 + \beta_2) x$
    *   $\beta_0$: 절편 (Intercept)
    *   $\beta_1$: 분절 이전의 기울기 (Slope Before)
    *   $\beta_2$: 분절 전후의 기울기 변화량 (Slope Difference)
    *   $\beta_1 + \beta_2$: 분절 이후의 최종 기울기 (Slope After)
    *   $c$: 분절점 (Breakpoint, 개선 변곡점)

---

### 1.2. 단계별 알고리즘 및 코드 로직

전체 연산 흐름은 `src/utils/piecewiseRegression.ts` 의 `fitPiecewiseLinearWithDiagnostics` 함수를 통해 가동됩니다.

```mermaid
flowchart TD
    Init[KeyEvent 스트림 수집]
    --> Filter["이상치 제거 (upperBoundMs 초과 제외)"]
    --> Window["20개 균등 구간으로 분할 (aggregateToWindows)"]
    --> Grid["Grid Search로 초기 c0 추정"]
    --> Muggeo["Muggeo's Method로 c 정밀 수렴"]
    --> OLS["최소제곱법 (OLS)으로 계수 beta 계산"]
    --> Result([최종 PiecewiseResult 반환])
```

#### 1.1단계. 데이터 필터링 및 윈도잉 (`aggregateToWindows`)
1.  **이상치 차단**: 분석 대상 키(`targetToKey`)의 정타 이벤트 중 `latencyMs`가 0보다 크고 이상치 상한 임계값(`upperBoundMs`) 이하인 유효 데이터만 추립니다. (유효 데이터가 20개 미만일 시 연산 중단)
2.  **구간별 중앙값 집계**: 노이즈를 제어하기 위해 유효 데이터를 시간순으로 정렬한 후 **20개의 균등 윈도우**로 분할합니다.
3.  **대표 점 도출**:
    *   **$X$ 좌표**: 각 윈도우 구간의 중간 인덱스 (인덱스 스케일 보존)
    *   **$Y$ 좌표**: 각 윈도우 구간 내의 `latencyMs` 중앙값 (Median)
    *   이를 통해 최종 20개의 가공된 대표 데이터 포인트 $(x_i, y_i)$ 가 준비됩니다.

#### 1.2단계. 그리드 서치 (`gridSearchC0`)
변곡점 $c$가 위치할 수 있는 최적의 초기 후보값 $c_0$를 선정합니다.
*   데이터 양 끝단 10% 영역을 제외한 나머지 범위 내에서, 후보 $c$를 대입하여 OLS(최소제곱법)로 직선을 피팅하고 **오차제곱합(RSS, Residual Sum of Squares)**을 전수 조사합니다.
*   RSS가 가장 작게 나타나는 지점의 $X$ 값을 초기 분절점 $c_0$로 확정합니다.

#### 1.3단계. 무제오 알고리즘 (`muggeoMethod`)
그리드 서치로 얻은 $c_0$를 무제오 알고리즘(Muggeo's Method, 2003)을 통해 소수점 이하 단위까지 정밀 수렴시킵니다.
1.  **4열 설계 행렬 구성**:
    $$\mathbf{X}_{\text{design}} = \begin{bmatrix} 1 & x_i & \max(0, x_i - c) & I(x_i > c) \end{bmatrix}$$
    *   $I(x_i > c)$는 $x_i$가 $c$보다 크면 1, 아니면 0인 지시 함수(Indicator Function) 열입니다.
2.  **OLS 해 계산**:
    $$\boldsymbol{\beta} = (\mathbf{X}^T \mathbf{X})^{-1} \mathbf{X}^T \mathbf{y}$$
    *   가우스-조르당 소거법을 사용해 수치적으로 역행렬을 계산하여 $\boldsymbol{\beta} = \begin{bmatrix} \beta_0 & \beta_1 & \beta_2 & \beta_3 \end{bmatrix}^T$를 도출합니다.
3.  **분절점 업데이트**:
    $\beta_3$(지시 함수 계수) 값을 $\beta_2$(기울기 변화량)로 나누어 분절점 $c$의 수정 방향과 크기를 구합니다.
    $$c_{\text{new}} = c - \frac{\beta_3}{\beta_2}$$
4.  **수렴 루프**:
    이 과정을 업데이트 격차가 $10^{-6}$ 이하가 되거나 최대 50회 도달할 때까지 반복하여 수렴된 최종 $c$를 얻습니다.

#### 1.4단계. 최종 OLS 적합 및 방정식 산출
1.  수렴된 최종 분절점 $c$를 기준으로 3열 설계 행렬 $\mathbf{X}_{\text{design}} = \begin{bmatrix} 1 & x_i & \max(0, x_i - c) \end{bmatrix}$을 빌드합니다.
2.  최종 OLS를 수행하여 계수 $\beta_0, \beta_1, \beta_2$를 계산하고 예측 함수 `predict(x)`를 반환합니다.

---

## 2. 기타 진단 통계 지표 (요약)

| 지표명 | 측정 목적 및 로직 요약 |
| :--- | :--- |
| **Hold Correlation** | 키를 누르는 시간(`Hold Duration`)과 반응 대기시간(`Latency`) 간의 피어슨 상관계수($r$) 및 p-value 검증 ($r > 0.4, p < 0.05$ 기준 상관성 확인). 기계식 키보드 '구름타법' 교정용 지표. |
| **Hesitation Ratio** | 사분위수 기준 이상치 한계선($Q_3 + 1.5 \times \text{IQR}$)보다 현저히 늦게 입력된 타건 비율을 집계 (5% 이상 시 머뭇거림 의심). |
| **Late Keystroke** | 타이핑이 빠를 때 발생하는 오타 유형으로, 떼는 타이밍 누수로 인해 뒤의 키가 먼저 입력되는 현상을 감지. |
| **Error Inducement** | 오타 스트릭이 시작된 최초 입력 시점들 중, 현재 키를 입력하려다가 스트릭이 깨진 오타 시작 기여도를 측정. |
| **Shift Overhead** | Shift 조합 글자(ㅃ, ㅉ, ㄸ 등) 입력 시 단독 입력 대비 추가로 지연되는 평균 패널티 및 좌/우 Shift 편향 분석. |
| **Finger Transitions** | 대상 키 바로 직전에 입력된 이전 키의 손가락 위치 분포를 분석하여 특정 이동 경로상의 병목 트래킹. |

---

## 3. Cylindrical Diagnostics 패널 구성 (3-Panel)

Cylindrical Vector 진단 드로어는 동일 너비 3열 그리드로 구성합니다.  
UI SSOT: `src/components/workspace/CylindricalDiagnosticsPanel.tsx`  
스타일: `src/app/styles/cylindrical-visualizer.css`

### Panel 1 · 키 진입 Dynamics

| 지표 | 비고 |
| :--- | :--- |
| 모래시계 분절회귀 | §1 Piecewise Regression |
| Latency 분포 · 일관성 (MAD) | 오락가락 vs 일정 — `latencyConsistency` (MAD, rMAD, 히스토그램) |
| 오타 유발율 | 전체 키 중 처음 오타를 유발한 비율 |
| 동일 손 손가락별 속도 비교 | 같은 손 다른 손가락 대비 빠름/느림 |
| 어느 손가락에서 넘어오는지 | 직전 키 손가락 전환 비율 |
| 무의식적 incorrect 키 TopN | optional |
| Shift 지연 패널티 | optional — 시프트 때문에 느려지는 키 |

### Panel 2 · 타이밍 & 오타

| 지표 | 비고 |
| :--- | :--- |
| Latency 중앙값 · CPM | 해당 toKey 정타 기준 |
| IQR 기반 머뭇거림 | Q3 + 1.5×IQR 초과 비율 |
| 순서 뒤바뀜 오타율 | 오타 쌍 중 이 키를 늦게 눌러 순서가 바뀐 비율 |
| 자주 쓰는 순서쌍 TopN | optional |

### Panel 3 · 공간 & 패턴

| 지표 | 비고 |
| :--- | :--- |
| 공간적 오타 거리 | `expectedChar === selectedTo && isCorrect === false` — 정답↔실제 `toKey` 거리 Q1·Q2·Q3 궤도 시각화 |
| Dwell · Flight (구름타법) | 누름 시간 vs 이동 시간 분리 — **미구현** |
| N단계 전이 오타 패턴 | optional — **미구현** |
| 버스트 쌍 포함 여부 | optional — **미구현** |

---

## 4. 진단 통계 계산 리팩터링 (Planned)

### 4.1. 배경 · 문제

현재 `useCylindricalDiagnostics`는 `events` 배열에 대해 **독립적인 `useMemo` 블록**으로 계산합니다.

| 블록 | SSOT | 스캔 범위 |
| :--- | :--- | :--- |
| `toKeyOptions` | `countCorrectEventsByToKey` | O(N) |
| 분절회귀 | `fitPiecewiseLinearWithDiagnostics` | O(N) 필터 + 고정 20윈도우 회귀 |
| Keystroke 통계 | `calculateKeystrokeDiagnostics` | O(N) 다중 패스 + `.filter()` 할당 |

`calculateKeystrokeDiagnostics`(`src/utils/cylindricalStats.ts`)는 동일한 `events`를 **5~7회** 순회하며, `events.filter(...)`로 **중간 배열을 3개 이상** 생성합니다.  
분절회귀도 `toKey === selectedTo && isCorrect` 조건으로 **별도 필터**를 수행합니다.

Run 단위 `analysisEvents`(수천~수만 건)에서는 체감 지연이 없으나, 통계 항목이 늘거나 데이터 범위가 커지면 **O(통계수 × N)** 및 **GC 할당**이 누적됩니다.

### 4.2. 원칙 — 스캔은 합치고, 알고리즘은 분리

| 계층 | 합침 여부 | SSOT 유지 |
| :--- | :--- | :--- |
| **이벤트 1패스 수집 (Accumulator)** | ✅ 합침 | 신규 `buildDiagnosticsAccumulator` (예정) |
| **분절회귀 연산** (Grid Search, Muggeo, OLS) | ❌ 분리 | `src/utils/piecewiseRegression.ts` |
| **Keystroke 집계·비율·상관** | ❌ 분리 (입력만 공유) | `src/utils/cylindricalStats.ts` |
| **SKDM upperBound** (`ensureFinalUpperBound`) | ❌ 분리 | `src/lib/dev/piecewiseDev.ts` — 진단 진입 시 1회 |

분절회귀 **수학 모듈을 cylindricalStats에 합치지 않습니다.** 패리티 테스트(`piecewiseRegression.test.ts`)와 Muggeo/OLS SSOT를 보존합니다.

### 4.3. 목표 아키텍처

```mermaid
flowchart TD
    Events[analysisEvents N건]
    --> Acc["buildDiagnosticsAccumulator(events)\n단일 패스 O(N)"]
    Acc --> Global["전역 누적\n· toKey 옵션\n· 순서쌍 집계\n· 키별 오타율\n· 오타 유발/순서뒤바뀜"]
    Acc --> PerKey["selectedTo별 누적\n· 시간순 targetCorrect[]\n· latency / holdDuration\n· 손가락 전환"]
    PerKey --> PW["fitPiecewiseFromCollected(latencies)\npiecewiseRegression.ts"]
    Global --> KS["finalizeKeystrokeDiagnostics(acc, selectedTo)\ncylindricalStats.ts"]
    PerKey --> KS
    PW --> Hook["useCylindricalDiagnostics"]
    KS --> Hook
```

**1패스 Accumulator가 모으는 것 (예정)**

- **전역**: `toKeyOptions`, 순서쌍 빈도, 키별 correct/incorrect, 오타 유발·순서 뒤바뀜 카운트
- **selectedTo 전용** (순서 유지): 정답 이벤트, latency 시퀀스, holdDuration 쌍, 손가락 전환, 동일 손 타 키 latency

**분절회귀 입력 경로 (예정)**

```ts
// 현재: events 전체를 다시 필터
fitPiecewiseLinearWithDiagnostics(events, selectedTo)

// 리팩터 후: 수집된 시퀀스만 전달 (내부 20윈도우·회귀 동일)
fitPiecewiseFromLatencies(orderedLatencies, { targetToKey, upperBoundMs })
```

기존 `fitPiecewiseLinearWithDiagnostics(events, …)` 시그니처는 **얇은 래퍼**로 유지해 호출부 호환을 보장할 수 있습니다.

### 4.4. 합쳐도 줄지 않는 비용

단일 패스로 전환해도 아래는 그대로입니다.

- 선택 키 정답 latency에 대한 **median / IQR 정렬** — O(k log k)
- 분절회귀 **20윈도우 이후 회귀** — O(1)에 가까움
- `ensureFinalUpperBound` → SKDM `runPipeline` — 진단 진입 시 별도 1회

리팩터링의 실질 이득은 **CPU k배 가속**보다 **중복 filter·중간 배열 제거** 및 **신규 통계 추가 시 N 스캔 증가 방지**에 있습니다.

### 4.5. 미구현 통계 구현 시 가이드

§3 Panel 1~3의 **미구현** 항목은 구현 시 아래를 따릅니다.

| 지표 | 권장 방식 |
| :--- | :--- |
| Latency 분포 (MAD) | `computeLatencyConsistency` — selectedTo 정답 latency에 MAD/rMAD, 5건 미만 시 null |
| 공간적 오타 거리 | `getSpatialErrorDistance` — 오타 이벤트 스캔, `buildLayout` 좌표 lookup |
| Dwell · Flight | holdDuration + latency 분리 — accumulator의 per-key 쌍 재사용 |
| N단계 전이 패턴 | 최근 N건 또는 고정 윈도우 (예: 2,000건) |
| 버스트 쌍 | latency 임계값 기반 연속 구간 탐지 — 윈도우 스캔 |

전체 히스토리(수십만 건 이상) 기준 진단이 필요해지면 **서버 pre-aggregate**(DB 집계) 또는 **Web Worker** 분리를 별도 검토합니다. Run 단위 MVP에서는 §4.3 accumulator 리팩터만으로 충분합니다.

### 4.6. 작업 체크리스트 (예정)

- [ ] `DiagnosticsAccumulator` 타입 및 `buildDiagnosticsAccumulator(events)` 구현
- [ ] `calculateKeystrokeDiagnostics` → accumulator 소비형 `finalizeKeystrokeDiagnostics`로 전환
- [ ] `fitPiecewiseFromLatencies` (또는 collected events 입력) 추가, 기존 API 래퍼 유지
- [ ] `useCylindricalDiagnostics`에서 단일 accumulator 생성 후 분기
- [ ] 기존 `useCylindricalDiagnostics.test.ts` · `cylindricalStats` · `piecewiseRegression` 테스트 통과
- [ ] §3 미구현 통계를 accumulator 확장 포인트에 순차 추가
