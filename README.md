# ⌨️ TypeDiag

> **"단순한 타수(WPM) 측정을 넘어, 당신의 키보드 위 3D 지연 지형을 진단합니다."**

<!-- 여기에 GitHub Issue에 업로드하고 발급받은 GIF 링크를 붙여넣으세요 -->
![TypeDiag 3D 지연 진단 시연 화면](https://github.com/user-attachments/assets/...) <!-- TODO: GIF 추가 -->

TypeDiag는 단순한 타자 연습기를 넘어선 **차세대 타자 진단 및 연습 플랫폼**입니다. 사용자의 키 입력 데이터를 수집하여 **3D 공간 키 입력 역학 모델(SKDM — Spatial Keystroke Dynamics Model)**을 구축하고, 이를 통해 오타 및 입력 지연 병목 구간을 입체적이고 과학적으로 분석합니다.

---

## 🚀 Live Demo & Blog

번거로운 로컬 설치 없이 바로 웹에서 풀스펙 기능을 체험해 보세요.

- **Live Demo**: [TypeDiag 웹사이트 (링크 추가 필요)](http://localhost:3000/practice)
- **개발 블로그 시리즈**: [Velog 링크 (링크 추가 필요)](#)
  - 이 프로젝트의 핵심 알고리즘(MVSA)과 3D 지연 진단(SKDM) 모델을 개발하며 겪은 고민과 기술적 디테일을 연재하고 있습니다.

---

## ✨ 핵심 기능 (Core Features)

*   **실시간 한글 정렬 엔진 (MVSA)**
    *   초성/중성/종성 자소 단위 매핑과 한글 IME의 중간 조합 상태(Composition State)를 완벽하게 감지합니다.
    *   오타 발생 시 즉각적인 패닉 복구 모드(Panic Recovery Mode)를 통해 타자 흐름의 끊김 없이 실시간 오타 판별을 제공합니다.
*   **3D 지연 지형도 진단 (Spatial Keystroke Dynamics)**
    *   단순한 통계를 넘어, 키 입력 간의 지연 데이터를 물리 키보드 좌표에 매핑하여 3D 공간 상에 시각화합니다.
    *   **전체 지연 표면 (Global Latency Surface)**: 들로네 삼각분할(Delaunay Triangulation)과 라플라시안 스무딩을 적용하여 키보드 전반의 매크로 지연 지형을 입체적으로 렌더링합니다.
    *   **원통형 벡터 뷰 (Cylindrical Vector View)**: 특정 키(Focus Key)를 중심으로 진입/진출 지연 패턴과 병목을 원통형 3D 플롯으로 정밀 진단합니다.
*   **클라우드 타이핑 및 N-Gram 분석 (Cloud Typing & Pro Metrics)**
    *   키 누름과 다음 키 누름 사이의 겹침(Rollover Overlap)을 분석하는 **클라우드 타이핑 지표(ND)**를 제공합니다.
    *   특정 문자열 조합(3-Gram)에서 반복적으로 발생하는 치명적인 오타 패턴과 초고속 연타(Burst) 구간을 식별합니다.
*   **지능형 세션 수명 주기 관리 (Smart Session Lifecycle)**
    *   사용자의 입력 유휴 시간(3분)과 페이지 간 전환 지연(5분)을 자동으로 감지하여 세션을 지능적으로 분할하고 영속화합니다.
*   **AI 기반 토픽 연습 모드 (AI Topic Mode)**
    *   `pgvector` 기반 시맨틱 검색과 OpenAI LLM을 통해 사용자가 원하는 주제의 맞춤형 타자 연습 문장을 동적으로 생성합니다.
*   **보안 게스트 & Clerk 인증 (Frictionless Authentication)**
    *   Clerk 소셜 로그인 및 비로그인 사용자를 위한 HMAC 서명 기반 임시 세션을 제공하며, 추후 로그인 시 기존 기록을 완벽하게 병합합니다.

---

## 🛠 기술 스택 (Tech Stack)

*   **Frontend**: Next.js 16 (App Router), React 19, Zustand (Slice Pattern), Three.js / React Three Fiber (R3F), Vanilla CSS
*   **Backend & DB**: PostgreSQL, Drizzle ORM, `pgvector` (벡터 유사도 검색)
*   **AI & APIs**: Upstage Embedding API (문장 임베딩), OpenAI GPT-4.1-nano (문장 생성)
*   **Authentication**: Clerk + Guest HMAC 인증
*   **Testing**: Vitest (단위 테스트 및 수학 모델 패리티 검증)

---

## 🤝 기여하기 (Contributing)

이 프로젝트는 오픈소스 기여를 환영합니다! 
다만 Clerk(인증), PostgreSQL(DB), OpenAI 등 연동해야 할 외부 API 의존성이 높아 로컬 환경 구동 세팅이 다소 복잡할 수 있습니다. 

로컬 구동 없이도 문서 개선, 버그 리포트(Issue) 등은 언제나 환영합니다. 코드 기여를 위해 로컬 개발 환경 설정이 필요하신 분은 Issue 탭을 통해 남겨주시면 가이드를 도와드리겠습니다.

---

## 🤖 100% Agentic "Vibe Coding"

이 프로젝트는 처음부터 끝까지 **AI 에이전트(Antigravity 2.0, Cursor 등)와의 협업**으로 만들어진 1인 개발 프로젝트입니다. 
단순히 코드를 자동 생성하는 것을 넘어, 복잡한 아키텍처와 수학적 모델(SKDM, MVSA)을 에이전트에게 이해시키고, Single Source of Truth (SSOT)를 강제하여 환각(Hallucination) 없이 대규모 코드베이스를 통제하는 **'에이전트 오케스트레이션(Agent Orchestration)'**의 결과물입니다.

---

## 📄 시스템 상세 문서 (Documentation)

TypeDiag의 코어 아키텍처와 상세 스펙은 `docs/` 디렉터리의 개별 문서에서 깊이 있게 확인할 수 있습니다.

*   [**SKDM & 3D 시각화 (SKDM_ARCHITECTURE.md)**](docs/SKDM_ARCHITECTURE.md)
*   [**원통형 진단 모델 (DIAGNOSTICS.md)**](docs/DIAGNOSTICS.md)
*   [**한글 오타 판별 알고리즘 (MVSA_ALGORITHM.md)**](docs/MVSA_ALGORITHM.md)
*   [**인증 아키텍처 (AUTH.md)**](docs/AUTH.md)
*   [**API 명세서 (API.md)**](docs/API.md)
*   [**DB 스키마 & 수명 주기 (DB_SCHEMA.md)**](docs/DB_SCHEMA.md)
*   [**Zustand 상태 관리 (STATE_MANAGEMENT.md)**](docs/STATE_MANAGEMENT.md)
*   [**디자인 시스템 (DESIGN_SYSTEM.md)**](docs/DESIGN_SYSTEM.md)
*   [**토픽 모드 스펙 (TOPIC_MODE.md)**](docs/TOPIC_MODE.md)
*   [**하드코어 연습 모드 (HARDCORE_MODE.md)**](docs/HARDCORE_MODE.md)

### 🛡 For AI Agents & Contributors

저장소 루트에 위치한 [`AGENTS.md`](AGENTS.md)는 **AI 에이전트 자율 작업을 위한 최우선 프롬프트 가이드**입니다. 에이전트는 코드 수정 전 반드시 해당 문서를 숙지해야 합니다. (일반 사용자를 위한 문서가 아닙니다.)

---

## 📜 License

이 프로젝트는 GNU Affero General Public License version 3 (AGPLv3)에 따라 배포됩니다. 자세한 내용은 [LICENSE](LICENSE) 파일을 참조하세요.
