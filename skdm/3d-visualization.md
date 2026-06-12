# TypeDiag 3D 시각화

## SKDM (Spatial Keystroke Dynamics Model) 개요

사용자의 타건 습관과 지연 시간(Latency)을 3차원 공간에 시각화하여 분석하는 시스템이다.

모델은 두 가지로 나뉜다.

1. **개별 키 중심의 원통형 좌표계** (Key-Centric Vector Model) — 꽃 모양 형상
2. **키보드 전체의 지연 시간 지형도** (Global Latency Surface)

개별 키마다 방향·빈도·지연이 담긴 벡터 데이터가 먼저 존재하고, 이를 압축·연결해 전체 지형도로 만든다.

---

## 공통 전제

- 타건할 때마다 `{이전 키(From), 현재 키(To), 지연시간}` 이벤트가 쌓인다.
- Tab으로 진단 모드에 들어가면 이 데이터를 가공해 3D에 반영한다.
- 3D 씬의 바닥은 가상 키보드 키캡 위치와 맞춘다.

---

## 1. 개별 키 중심의 원통형 좌표계 (Key-Centric Vector Model)

### 무엇을 보여 주는가

특정 키(**To Key**)를 누르기 직전에 어떤 키(**From Key**)를 눌렀는지, 그 둘 사이의 관계를 시각화한다.

각 키는 자기 자신을 제외한 주변 키들(25개 이상)을 향해 **독립적인 3차원 원통형 좌표계**를 가진다.

- **원점 (Origin):** 현재 타건의 목표 키 (To Key)
- **벡터:** 원점에서 다른 모든 From Key를 향해 뻗어 나감

각 벡터 \(\vec{V}_{k} = (r, \theta, z)\)의 의미:

| 성분 | 의미 |
|---|---|
| **θ (방향)** | From Key의 고유 식별. 360°에 균일하게 배치되어 키마다 고유한 각도를 가짐 |
| **z (높이)** | From → To 전이 시 지연 시간. 이상치 보정을 위해 시그모이드 처리된 값 |
| **r (길이)** | 해당 키 조합의 입력 빈도수 |

### 시각적 형태

z축 위에서 내려다보면, 원점을 중심으로 여러 벡터가 사방으로 뻗어 나간다.  
벡터 끝점들을 면으로 이으면 **꽃 모양(Flower Shape)** 과 같은 3D 입체 도형이 된다.

- **방향** → 어느 키에서 왔는지
- **높이** → 그 전이가 얼마나 느린지
- **길이** → 그 전이를 얼마나 자주 쓰는지

### 언제 쓰는가 (UI)

- 진단 모드에서 **문자 키를 클릭**했을 때
- “이 키가 왜 느린가?” → **어느 From Key 조합**에서 병목인지 볼 때
- Latency Surface에서 봉우리를 찍은 뒤 **원인을 좁힐** 때

### 화면 동작

- 클릭한 To Key가 원점(바닥 중심)
- From Key들이 θ 각도에 배치되고, z·r이 높이·벡터 길이로 표현됨
- 중심에서 각 From Key까지 선이 뻗고, 끝점을 이은 **부채꼴 면(fan)** 이 꽃잎처럼 형성됨
- Latency Surface 지형에서 이 뷰로 morph 전환 (약 1.2초)

### 관련 코드

- 쌍별 통계: `src/lib/skdm/model.ts` (`calculateIncomingStats`, `aggregatePairs`)
- 방향(θ): `src/lib/skdm/theta.ts`, `theta_order.json`
- 렌더링·전환: `Surface3DManager.setDiagnosticMode`, `updateCylindricalIndices`
- 진입: `page.tsx` — 키 클릭 → `diagnosticMode: "cylindrical"`, `focusedKey` 설정

---

## 2. 키보드 전체 지연 시간 지형도 (Global Latency Surface)

### 무엇을 보여 주는가

위에서 만든 **개별 키별 벡터 데이터를 압축**하여, 실제 키보드 레이아웃 위에 **3차원 지형**으로 나타낸다.

각 키가 가진 여러 방향의 벡터(빈도·지연)를 **가중 평균**으로 하나의 대푯값으로 줄인 뒤, 키보드 위 한 점의 높이가 된다.

### 처리 과정

1. **데이터 압축** — 키마다 다수의 From 방향 벡터를 빈도 가중 평균으로 하나의 대표 지연 값으로 압축
2. **메시화 (Surfacing)** — 압축된 값을 키보드 위치의 3D 점에 매핑한 뒤, **들로네 삼각분할(Delaunay Triangulation)** 로 점들을 연결
3. **평활화** — 데이터가 적은 키는 이웃 키 값으로 보간해 지형을 매끄럽게

### 시각적 형태

전체 키보드 위에 타건 속도(지연 시간)가 **산맥·골짜기**처럼 표현된 연속적인 3D 지형(Surface).

| 보이는 것 | 의미 |
|---|---|
| 평평한 구간 | 전반적으로 빠르게 치는 키 |
| 솟은 봉우리 | 그 키로의 입력이 전체적으로 느리거나 망설이는 키 |
| 울퉁불퉁한 지형 | 키보드 전체에 강약·병목이 고르지 않음 |

### 언제 쓰는가 (UI)

- 진단 모드에 처음 들어왔을 때 **기본 뷰**
- “어디가 전체적으로 느린지”를 **한눈에** 볼 때
- 특정 키를 고르기 전 **전체 맥락**을 파악할 때

### 화면 동작

- 진입 시 지형이 바닥에서 서서히 솟아오름 (높이·투명도·카메라 애니메이션)
- 드래그로 회전·줌 가능
- 2D 키보드 UI는 숨기고 3D 지형만 강조

### 관련 코드

- 데이터 가공: `src/lib/skdm/model.ts` (`runPipeline` — `summarizeKeys`, `smooth`)
- 렌더링: `Surface3DManager.ts`, `LatencySurface3D.tsx`
- 진입: `page.tsx` — Tab → `diagnosticMode: "surface"`

---

## 두 모델의 관계

```
[타건 이벤트]
      ↓
[키마다 From→To 벡터 (r, θ, z)]  ← ① Key-Centric Vector Model (꽃 모양)
      ↓ 가중 평균 압축
[키마다 대표 지연 값]
      ↓ Delaunay + 평활화
[키보드 위 3D 지형]               ← ② Global Latency Surface
```

- **원통형 좌표계** = 키 하나를 깊게 파고드는 **상세 모델** (방향·빈도·지연 분해)
- **Latency Surface** = 모든 키의 벡터를 압축한 **전체 요약 지형**

UI 흐름: Surface로 전체를 본 뒤 → 키 클릭으로 해당 키의 꽃 모양(원통형 좌표계) 뷰로 드릴다운.

---

## 진단 모드 흐름 (요약)

1. Practice에서 텍스트 입력
2. Tab → 데이터 계산 + 키캡 비행 연출
3. **Latency Surface** 자동 표시
4. 키 클릭 → **Key-Centric Cylindrical** (꽃 모양) 전환
5. Tab → Practice 복귀

---

## 아직 3D가 아닌 진단 모드

`backspace`, `shift`, `space`, `finger` 등은 대시보드 설명만 있고, 3D 레이어는 **surface / cylindrical** 만 연동되어 있다.

---

## 핵심 파일

| 파일 | 역할 |
|---|---|
| `src/app/page.tsx` | 모드 전환, 파이프라인 트리거 |
| `src/components/workspace/Surface3DManager.ts` | 3D 씬, 두 뷰 렌더링·전환 |
| `src/components/workspace/LatencySurface3D.tsx` | React 래퍼, HUD 라벨 |
| `src/lib/skdm/model.ts` | 벡터 집계·압축·평활화 |
| `src/lib/skdm/theta.ts` | From Key 방향(θ) 배치 |
