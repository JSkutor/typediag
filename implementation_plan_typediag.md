# Next-Generation Typing Practice Platform (TypeDiag)

본 프로젝트는 기존 Python으로 작성된 공간 타건 동역학 모델(SKDM)을 핵심 엔진으로 삼아, 사용자에게 매우 상세하고 유용한 통계를 제공하는 차세대 타자연습 웹 서비스를 구축하는 것을 목표로 합니다.

## Final Architecture & Design Decisions

지금까지 논의하여 확정된 기술 스택 및 아키텍처는 다음과 같습니다.

### 1. 기술 스택 (Tech Stack) - MVP 기준
- **프레임워크**: **Next.js (App Router)** - 현재는 클라이언트(프론트엔드) 위주로 사용하며, 추후 로그인/DB 도입 시 API 라우트를 활용할 수 있도록 확장성을 고려해 선택.
- **인증 및 DB**: **초기 MVP 단계에서는 제외**. 사용자 로그인 없이 로컬 환경(브라우저 메모리 및 LocalStorage)에서 100% 클라이언트 사이드 연산으로 작동. 추후 Supabase 등을 쉽게 연동할 수 있도록 모듈 구조만 분리.
- **상태 관리**: **Zustand** - 밀리초 단위로 쏟아지는 키보드 입력 이벤트를 성능 저하 없이 가볍고 직관적으로 관리.
- **3D 렌더링**: **React Three Fiber (Three.js)** - 타건 히트맵 및 라플라시안 평활화 결과 등을 3D로 시각화하여 강력한 시각적 피드백 제공.
- **스타일링**: **Vanilla CSS (CSS Modules)** - 기계식 키보드 매니아 감성의 묵직하고 세련된 다크 테마 적용. 커스텀 디자인과 애니메이션을 세밀하게 제어 (Glassmorphism 배제).

### 2. 핵심 로직 및 데이터 수집 (Core Logic & Data)
- **SKDM 수학 모델 포팅**: 기존 Python `model.py`의 딜로니 삼각분할 및 라플라시안 평활화 로직을 `d3-delaunay` 등의 라이브러리를 활용해 **TypeScript로 완벽히 재작성**.
- **한국어 IME 처리**: 한글 조합(`onChange`, `composition`)에 의존하지 않고 **물리적 키보드 이벤트(`keydown`, `keyup`)를 직접 캡처**하여 원시 타건(Raw Keystroke) 간의 거리와 지연시간을 정확히 계산.
- **훈련 콘텐츠 제공**: MVP 단계에서는 로컬 JSON(또는 더미 데이터)에 저장된 양질의 텍스트를 제공합니다. 추후 백엔드 확장 시 DB 연동 및 On-Demand LLM API(OpenAI/Gemini) 맞춤형 문장 생성 기능을 추가합니다.

## Proposed Execution Plan

### Phase 1: MVP Project Setup & UI Foundation
- `npx create-next-app`으로 Next.js 기반 뼈대 구축.
- 바닐라 CSS 기반 다크 테마 디자인 시스템 (기계식 키보드 감성) 초기화.
- 상태 관리(Zustand) 설정 및 기본 레이아웃 구성.
### Phase 2: Core Logic Porting & Client-Side Event Capture
- Python 수학 로직을 TypeScript(JS)로 포팅 (`d3-delaunay` 활용) 및 브라우저에서 실행 가능한 구조로 모듈화.
- Zustand를 활용한 물리적 키보드 이벤트(`keydown`, `keyup`) 캡처 및 상태 관리 훅(Hook) 작성.
- 프론트엔드 `/ko` 연습 페이지 구축 및 로컬 타건 데이터 수집.

### Phase 3: 3D Visualization & Local Analytics
- React Three Fiber를 도입하여 클라이언트에서 연산된 수학 모델 결과를 3D 시각화 (Dashboard 구성).
- 로컬 데이터를 기반으로 한 즉각적인 통계 피드백 UI 연동.

## Verification Plan

### Automated Tests
- TypeScript로 포팅된 핵심 로직(SKDM)이 기존 Python 모델과 동일한 계산 결과를 내는지 검증하는 단위 테스트 작성.

### Manual Verification
- 프론트엔드 `/ko` 페이지에서 타자를 칠 때 이벤트가 올바르게 수집되고, JS로 포팅된 모델이 실시간으로 결과를 도출하는지 확인.
- 수집된 데이터가 백엔드로 전송되고, 분석된 통계가 화면에 화려하게 렌더링되는지 확인.
- 로그인/로그아웃 흐름 정상 작동 여부 확인.
