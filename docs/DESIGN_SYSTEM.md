# TypeDiag Design System

본 문서는 TypeDiag 프로젝트의 핵심 비주얼 테마인 **"Space Grey & Cobalt"**의 구체적인 디자인 사양(Design Specifications)을 정의합니다. 향후 Next.js 컴포넌트 및 바닐라 CSS 구축 시 기준점으로 사용됩니다.

## 1. Theme Concept: Space Grey & Cobalt

애플 기기의 스페이스 그레이처럼 살짝 어두우면서도 정밀한 메탈 질감 베이스 위에, 차갑고 선명한 코발트 블루를 하이라이트 컬러로 사용하여 높은 집중도를 유도하는 도회적이고 정교한 소프트웨어 감성입니다.

## 2. Color Palette (CSS Variables)

### 2.1. Backgrounds & Surfaces

- `--bg-color`: **`#2a2b2e`** (메인 배경 - 묵직한 스페이스 그레이)
- `--panel-bg`: **`#323336`** (컨테이너 및 패널 배경 - 약간 띄워진 그레이)

### 2.2. Typography

- `--text-primary`: **`#e4e6eb`** (기본 텍스트 - 눈이 편안한 밝은 실버 화이트)
- `--text-muted`: **`#8d929b`** (보조 텍스트 - 슬레이트 그레이)

### 2.3. Keycap (Virtual Keyboard)

- `--key-alpha-bg`: **`#36383c`** (일반 문자 키 배경)
- `--key-alpha-text`: **`#e4e6eb`** (일반 문자 키 텍스트)
- `--key-mod-bg`: **`#2d2e31`** (특수/기능 키 배경 - Alpha 키보다 한 톤 어두움)
- `--key-mod-text`: **`#8d929b`** (특수/기능 키 텍스트)

### 2.4. Accents & Highlights

- `--key-accent-bg`: **`#638ccb`** (코발트 블루 - 망설임 구간 하이라이트 및 강조 요소)
- `--key-accent-text`: **`#f0f2f5`** (코발트 블루 위 텍스트)
- `--accent-glow`: **`rgba(99, 140, 203, 0.12)`** (Delaunay 메쉬 등 엷은 코발트 워터마크)

### 2.5. Borders & Shadows

- `--border-color`: **`rgba(228, 230, 235, 0.08)`** (아주 미세한 실버 경계선)
- `--shadow-color`: **`rgba(12, 14, 16, 0.35)`** (묵직한 금속 느낌을 살려주는 다크 섀도우)

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

- 수학적 메쉬 선은 코발트 블루의 엷은 톤(`--accent-glow`)과 선 두께 `1px`을 사용하여, 데이터가 화면을 가리지 않는 은은한 **홀로그램 워터마크** 형태로 렌더링합니다.

### 4.3. Hesitation (망설임 시각화)

- 망설임이 극대화된 타건(Outlier)은 강렬한 코발트 블루 배경(`--key-accent-bg`)으로 변화시켜 시각적 경각심을 주되, 기존 테마들의 붉은색보다 눈의 피로를 덜어줍니다.
