# 🚀 SKDM Cylindrical Vector Visualizer Porting Guide

본 문서는 `three_test.html`, `three_test.css`, `three_test.js` 파일을 다른 프로젝트로 이식(Porting)할 때 빠르고 정확하게 연동할 수 있도록 돕는 **바이브코딩(Vibe Coding) 최적화 가이드**입니다.

이 시각화 도구는 **원통형 좌표계(Cylindrical Coordinates)**를 사용하여 키 입력 전이 특성(Spatial Keystroke Dynamics Model)을 3D 공간에 표현합니다.

---

## 📂 1. 이식 대상 파일 및 역할

새 프로젝트로 복사해야 할 파일은 아래의 3개 파일입니다.

| 파일명 | 권장 위치 (예시) | 주요 역할 |
| :--- | :--- | :--- |
| **`three_test.html`** | `/views/visualizer.html` 또는 `/public/index.html` | UI 레이아웃 정의, Three.js 및 OrbitControls CDN 라이브러리 로드, 2D 오버레이 돔 요소 구성 |
| **`three_test.css`** | `/public/css/three_test.css` | 글래스모피즘(Glassmorphism) 대시보드 스타일, 3D 좌표 위에 뜨는 동적 2D 라벨(`three-label`) 및 스위치 토글 디자인 |
| **`three_test.js`** | `/public/js/three_test.js` | Three.js Scene/Camera/Renderer 설정, 마우스 회전 제어, 원통 좌표 ➔ 데카르트 좌표 변환 수학 연산, 꽃잎형 곡면(Petal Surface) 생성, API 데이터 페칭 및 폴백 데이터 처리 |

---

## 🏗️ 2. 다른 프로젝트 이식 단계 (Quick Setup)

바이브코딩 시 흐름이 끊기지 않도록 순서대로 적용하세요.

### Step 1. 외부 라이브러리 (CDN) 로드 순서 지키기
HTML의 `<head>` 태그 내부에 반드시 아래 순서대로 스크립트를 로드해야 합니다. `OrbitControls.js`는 `three.min.js`에 의존하므로 순서가 바뀌면 오류가 발생합니다.

```html
<!-- 1. Google Fonts 로드 (Dashboard UI 디자인 완성도 향상) -->
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Outfit:wght@400;600;700&display=swap" rel="stylesheet">

<!-- 2. Three.js 코어 로드 -->
<script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>

<!-- 3. Three.js OrbitControls (카메라 조작) 로드 -->
<script src="https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/controls/OrbitControls.js"></script>
```

### Step 2. 필수 DOM 구조 생성
HTML `<body>` 태그 바로 아래에 다음 컨테이너들이 존재해야 합니다.

```html
<!-- 3D 그래픽이 그려지는 뷰포트 -->
<div id="canvas-container"></div>

<!-- 3D 좌표 위에 둥둥 떠다닐 HTML 2D 라벨 (원점 / 타겟 벡터 끝단) -->
<div id="label-origin" class="three-label">원점(To): -</div>
<div id="label-target" class="three-label">벡터(From): -</div>

<!-- 대시보드 컨트롤 UI 패널 -->
<div class="dashboard">
  ... (three_test.html 내의 <div class="dashboard"> 전체 코드 복사) ...
</div>
```

### Step 3. CSS 및 JS 파일 경로 수정
HTML 파일 하단에서 CSS와 JS를 불러올 때, 새 프로젝트의 에셋 폴더 구조에 맞게 경로를 수정해 줍니다.
```html
<!-- head 내 CSS 경로 -->
<link rel="stylesheet" href="./css/three_test.css">

<!-- body 최하단 JS 경로 -->
<script src="./js/three_test.js"></script>
```

---

## 📊 3. API 데이터 포맷 명세 (Data Schema)

시각화 화면이 정상 작동하려면 백엔드 API가 다음과 같은 구조의 JSON 데이터를 반환하거나, JS 내부의 `fallbackData` 상수를 알맞게 설정해 주어야 합니다.

### API 엔드포인트
- **요청 URL**: `GET /api/pair_vectors`
- **반환 데이터 포맷 (JSON)**:

```json
{
  "q": {
    "w": [0.0, 15, 169.28],
    "e": [13.33, 15, 237.07],
    "r": [26.67, 17, 273.19],
    "a": [346.67, 12, 408.94],
    "s": [293.33, 16, 219.35]
  },
  "w": {
    "e": [0.0, 10, 187.72],
    "r": [13.33, 20, 235.90],
    "s": [306.67, 12, 439.03]
  }
}
```

### 데이터 값 배열 구조 설명 `[theta, r, z]`
각 키 쌍의 세 가지 실수 값은 다음을 의미합니다:
1. **각도 ($\theta$, degree)**: `index 0`
   - 두 키 사이의 물리적/기하학적 각도 방향 (0도 ~ 360도)
2. **반지름 ($r$, frequency)**: `index 1`
   - 타건 빈도수 (자주 누르는 키 쌍일수록 중심 원점으로부터 멀어짐)
3. **높이 ($z$, latency ms)**: `index 2`
   - 타건 지연 시간 (지연 시간이 길수록 위쪽 Y축 방향으로 높이 솟아오름)

---

## ⚡ 4. 바이브코딩 맞춤 커스텀 가이드 (Tuning Point)

이식 후 디자인이나 크기를 다듬을 때 AI(Cursor/Gemini/Claude)에게 다음과 같은 프롬프트를 줘서 쉽게 커스텀할 수 있습니다.

### ① 3D 공간 상의 크기 스케일 조정 (JS 상단)
데이터 값 단위가 너무 크거나 작아 화면 밖으로 튀어나갈 경우 스케일 인자를 조정합니다.
```javascript
// three_test.js 상단
const SCALE_R = 0.3;     // 빈도수(R) 스케일 (가로 XZ 반지름 크기 조절)
const SCALE_Z = 0.015;   // 지연시간(Z) 스케일 (세로 Y 높이 크기 조절)
```
> **AI 프롬프트 예시:**
> *"3D 뷰포트에서 높이가 너무 낮게 나와. 세로 스케일인 SCALE_Z 값을 좀 더 키워서 위아래로 더 역동적으로 솟아오르게 수정해줘."*

### ② 테마 컬러 변경 (CSS 및 JS)
글래스모피즘 어두운 분위기에서 다른 톤으로 바꿀 때 CSS의 `:root` 변수와 JS의 Light/Mesh 컬러를 수정합니다.
```css
/* three_test.css */
:root {
    --bg-color: #090d16;       /* 우주선 느낌의 딥 다크 네이비 백그라운드 */
    --accent-pink: #ec4899;    /* To Key (원점) 노드 색상 */
    --accent-cyan: #06b6d4;    /* From Key (방향) 노드 색상 */
    --accent-amber: #fbbf24;   /* 벡터 화살표/각도 가이드 라인 색상 */
}
```
> **AI 프롬프트 예시:**
> *"대시보드 메인 테마를 네온 사이언 대신 미래지향적인 네온 퍼플(#a855f7)과 에메랄드 그린(#10b981) 조합으로 싹 다 변경해줘. CSS 변수랑 JS 안에 있는 mesh 컬러들 다 맞춰줘."*

### ③ 카메라 뷰 범위 제어 (JS `initThree`)
기본 줌 아웃 한계치나 화면 각도를 수정하고 싶을 때:
```javascript
// three_test.js 내부 controls 설정 부분
controls.minDistance = 3;    // 최대 줌인 한계
controls.maxDistance = 25;   // 최대 줌아웃 한계
controls.maxPolarAngle = Math.PI / 2 + 0.05; // 카메라가 바닥 평면 밑으로 내려가지 않도록 차단
```

---

## 🛠️ 5. 자주 발생하는 트러블슈팅 (FAQ)

이식 도중 화면이 깨지거나 먹통이 되는 경우 아래 해결책을 확인하세요.

### ❓ 현상 1: 화면이 완전히 검은색(또는 빈 화면)으로 나옵니다.
* **원인 1**: CSS에서 `#canvas-container`의 크기를 잡지 못했을 확률이 높습니다.
  - **해결**: CSS에 `#canvas-container { width: 100vw; height: 100vh; position: absolute; }`이 잘 선언되어 있는지 확인하고, 부모 요소가 `display: none`이거나 크기가 0이 아닌지 체크합니다.
* **원인 2**: JS가 로드되는 시점에 HTML DOM 로드가 끝나지 않아 캔버스 바인딩이 실패했습니다.
  - **해결**: `three_test.js` 맨 밑에 `window.addEventListener('DOMContentLoaded', ...)`로 초기화 함수가 감싸져 있는지 확인합니다.

### ❓ 현상 2: "Uncaught ReferenceError: THREE is not defined" 에러 발생
* **원인**: `three.min.js` 스크립트가 로드되기 전에 `three_test.js` 또는 `OrbitControls.js`가 먼저 실행되었습니다.
  - **해결**: HTML 내 `<script>` 태그들의 로딩 순서를 맞춰줍니다. (`three.min.js` ➔ `OrbitControls.js` ➔ `three_test.js`)

### ❓ 현상 3: 3D 조작(드래그, 휠)을 할 때 화면 위에 떠 있는 글자 라벨(`Origin`, `Vector`)이 엉뚱한 곳에 매핑되거나 랙이 걸립니다.
* **원인**: 2D HTML 라벨 엘리먼트들의 CSS `position: absolute` 설정이 누락되었거나 부모 컨테이너 기준점이 어긋났습니다.
  - **해결**: `.three-label` 클래스의 스타일에서 `position: absolute; z-index: 5; transform: translate(-50%, -100%);` 속성이 정상 작동 중인지 확인합니다.

### ❓ 현상 4: 로컬에서는 되는데 다른 서버에 이식하니 데이터 로드가 안 됩니다.
* **원인**: `/api/pair_vectors` API가 구현되어 있지 않거나 CORS 에러가 발생한 것입니다.
  - **해결**: 프론트엔드 단독 테스트 시에는 API 패치 실패 시 `finally` 블록에서 `fallbackData`로 세팅되므로 상관없지만, 백엔드와 연동할 경우 백엔드 서버의 CORS 허용 세팅 혹은 올바른 API 엔드포인트 세팅을 확인해 주세요.

---

> 💡 **Tip for Vibe Coding**:
> 프로젝트에 파일을 얹어둔 후, AI 어시스턴트(Cursor, Claude 등)에게 **"이 프로젝트에 SKDM Visualizer를 붙이고 싶어. porting_guide_skdm_visualizer.md 문서 가이드 읽고, 이 세 개 파일을 프로젝트 구조에 맞게 복사 및 임포트해줘."**라고 명령하면 AI가 알아서 한 번에 깔끔하게 이식해 줄 것입니다!
