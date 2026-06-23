# TypeDiag Design System

본 문서는 TypeDiag 프로젝트의 핵심 비주얼 테마인 **"Space Grey & Ocean Cyan"**의 구체적인 디자인 사양(Design Specifications)을 정의합니다. 실제 런타임 CSS 변수의 SSOT는 `src/app/styles/tokens.css`이며, 본 문서는 의도와 팔레트의 기준점으로 사용됩니다.

## 1. Theme Concept: Space Grey & Ocean Cyan

애플 기기의 스페이스 그레이처럼 살짝 어두우면서도 정밀한 메탈 질감 베이스 위에, 맑고 선명한 오션 사이언(Ocean Cyan)을 하이라이트 컬러로 사용하여 높은 집중도를 유도하는 도회적이고 정교한 소프트웨어 감성입니다.

## 2. Color Palette (CSS Variables)

### 2.1. Backgrounds & Surfaces

- `--bg-base` / `--bg-color`: **`#1e2024`** (메인 배경 - 묵직하고 차분한 다크 차콜 회색)
- `--bg-raised` / `--panel-bg`: **`#262930`** (컨테이너 및 패널 배경 - 대시보드, 네비게이션)

### 2.2. Typography

- `--text-primary`: **`#8ca6b5`** (기본 텍스트 - 눈이 편안한 실버 블루 그레이 톤)
- `--text-secondary`: **`#5e697a`** (보조 텍스트 - 부연 설명, 메타 정보 등)
- `--text-muted`: **`#4a5360`** (더 낮은 대비의 보조 텍스트)

### 2.3. Keycap (Virtual Keyboard)

- `--keycap-face` / `--key-alpha-bg`: **`#323640`** (입력창 및 버튼/일반 문자 키 배경)
- `--key-alpha-text`: **`#8ca6b5`** (일반 문자 키 텍스트)
- `--key-mod-bg`: **`#262930`** (특수/기능 키 배경)
- `--key-mod-text`: **`#5e697a`** (특수/기능 키 텍스트)

### 2.4. Accents & Highlights

- `--accent` / `--key-accent-bg`: **`#4dc6e8`** (메인 하이라이트 - 망설임 구간 하이라이트 및 강조 요소)
- `--key-accent-text`: **`#1e2024`** (메인 하이라이트 위 텍스트)
- `--accent-secondary`: **`#a194b8`** (보조 하이라이트/배지 - 라벤더 퍼플)
- `--accent-glow` / `--accent-dim`: **`rgba(77, 198, 232, 0.12)`** (Delaunay 메쉬 등 엷은 워터마크)

### 2.5. Borders & Shadows

- `--border-subtle` / `--border-color`: **`rgba(140, 166, 181, 0.08)`** (아주 미세한 실버 경계선)
- `--keycap-shadow` / `--shadow-color`: **`rgba(12, 14, 16, 0.35)`** (묵직한 금속 느낌을 살려주는 다크 섀도우)

## 3. Typography Rules

- **Primary Font (Sans-serif)**: `Outfit`, sans-serif
  - _용도_: 헤더, 일반 UI 텍스트, 설명글. 기하학적이고 현대적인 느낌.
- **Monospace Font**: `Fira Code`, monospace
  - _용도_: 키보드 자판 각인, 수치 데이터, 타이핑 연습 문장. 정밀하고 개발자 친화적인 감성.

## 4. UI Elements & Micro-interactions

### 4.1. Keycap Rendering (기계식 키캡 디테일)

- **Border Radius**: `8px`
- **Depth (Box Shadow)**: 일반 상태에서는 `0 4px 6px var(--shadow-color)`와 상단 빛 반사를 표현하는 `inset 0 1px 0 rgba(255,255,255,0.05)`를 조합하여 실제 PBT 키캡 같은 입체감을 줍니다.
- **Active State (타건 시)**:
  - 물리적으로 눌리는 느낌을 주기 위해 `transform: translateY(3px)` 적용.
  - 그림자가 줄어들도록 `box-shadow: 0 1px 2px var(--shadow-color)`로 변경.

### 4.2. Delaunay Triangulation Visual

- 수학적 메쉬 선은 오션 사이언의 엷은 톤(`--accent-glow`)과 선 두께 `1px`을 사용하여, 데이터가 화면을 가리지 않는 은은한 **홀로그램 워터마크** 형태로 렌더링합니다.

### 4.3. Hesitation (망설임 시각화)

- 망설임이 극대화된 타건(Outlier)은 강렬한 오션 사이언 배경(`--key-accent-bg`)으로 변화시켜 시각적 경각심을 주되, 기존 테마들의 붉은색보다 눈의 피로를 덜어줍니다.
