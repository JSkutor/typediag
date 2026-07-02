# ⌨️ TypeDiag

> **"단순한 타수(WPM) 측정을 넘어, 당신의 키보드 위 3D 지연 지형을 진단합니다."**

TypeDiag는 단순한 타자 연습기를 넘어선 **차세대 타자 진단 및 연습 플랫폼**입니다. 사용자의 키 입력 데이터를 수집하여 **3D 공간 키 입력 역학 모델(SKDM — Spatial Keystroke Dynamics Model)**을 구축하고, 이를 통해 오타 및 입력 지연 병목 구간을 입체적이고 과학적으로 분석합니다.

---

## ✨ 핵심 기능 (Core Features)

*   **실시간 한글 정렬 엔진 (MVSA)**
    *   초성/중성/종성 자소 단위 매핑과 한글 IME의 중간 조합 상태(Composition State), 그리고 종성-초성 캐리오버(Carry-over)를 완벽하게 감지합니다.
    *   오타 발생 시 즉각적인 패닉 복구 모드(Panic Recovery Mode)를 통해 타자 흐름의 끊김 없이 정확한 실시간 오타 판별을 제공합니다.
*   **3D 지연 지형도 진단 (Spatial Keystroke Dynamics)**
    *   단순한 통계를 넘어, 키 입력 간의 지연 데이터를 물리 키보드 좌표에 매핑하여 3D 공간 상에 시각화합니다.
    *   **전체 지연 표면 (Global Latency Surface)**: 들로네 삼각분할(Delaunay Triangulation)과 라플라시안 스무딩을 적용하여 키보드 전반의 매크로 지연 지형을 입체적으로 렌더링합니다.
    *   **원통형 벡터 뷰 (Cylindrical Vector View)**: 특정 키(Focus Key)를 중심으로 진입/진출 지연 패턴과 병목을 원통형 3D 플롯으로 정밀 진단합니다.
*   **클라우드 타이핑 및 N-Gram 분석 (Cloud Typing & Pro Metrics)**
    *   키 누름과 다음 키 누름 사이의 겹침(Rollover Overlap)을 분석하는 **클라우드 타이핑 지표(ND)**를 제공합니다.
    *   단순 오타가 아닌 특정 문자열 조합(3-Gram)에서 반복적으로 발생하는 치명적인 오타 패턴과 초고속 연타(Burst) 구간을 식별합니다.
*   **지능형 세션 수명 주기 관리 (Smart Session Lifecycle)**
    *   사용자의 입력 유휴 시간(3분)과 페이지 간 전환 지연(5분)을 자동으로 감지하여 세션을 지능적으로 분할하고 영속화합니다.
*   **AI 기반 토픽 연습 모드 (AI Topic Mode)**
    *   사용자가 원하는 주제를 입력하면 `pgvector` 기반 시맨틱 검색과 OpenAI LLM을 통해 즉각적으로 맞춤형 타자 연습 문장을 동적으로 생성하고 제공합니다.
*   **보안 게스트 & Clerk 인증 (Frictionless Authentication)**
    *   Clerk을 통한 소셜 로그인뿐만 아니라, 비로그인 사용자를 위해 HMAC 서명 기반의 안전한 임시 게스트 세션을 발급하며, 추후 로그인 시 기존 기록을 완벽하게 병합(Merge)합니다.

---

## 🛠 기술 스택 (Tech Stack)

*   **Frontend**: Next.js 16 (App Router), React 19, Zustand (Slice Pattern), Three.js / React Three Fiber (R3F), Vanilla CSS
*   **Backend & DB**: PostgreSQL (TimescaleDB), Drizzle ORM, `pgvector` (벡터 유사도 검색)
*   **AI & APIs**: Upstage Embedding API (문장 임베딩), OpenAI GPT-4.1-nano (문장 생성)
*   **Authentication**: Clerk + Guest HMAC 인증
*   **Testing**: Vitest (단위 테스트 및 수학 모델 패리티 검증)

---

## 🚀 시작하기 (Quick Start)

### 1. 프로젝트 복제 및 의존성 설치
```bash
git clone https://github.com/JSkutor/typediag.git
cd typediag
npm install
```

### 2. 환경 변수 설정
```bash
cp .env.example .env.local
```
`.env.local` 파일에 다음 필수 변수들을 설정합니다.

| 환경 변수 | 용도 및 설명 |
| :--- | :--- |
| `DATABASE_URL` | 세션 저장 및 토픽 벡터 캐싱을 위한 PostgreSQL(TimescaleDB) 연결 URI |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` <br> `CLERK_SECRET_KEY` | Clerk 회원가입/로그인 (게스트 모드 단독 사용 시 생략 가능) |
| `GUEST_TOKEN_SECRET` | 게스트 API 요청 검증을 위한 HMAC 비밀키 |
| `UPSTAGE_API_KEY` | 토픽 모드 시맨틱 벡터 검색을 위한 임베딩 API 키 |
| `OPENAI_API_KEY` | 토픽 모드 문장 동적 생성을 위한 OpenAI API 키 |

### 3. 데이터베이스 초기화 (Docker 환경 권장)
```bash
npm run db:up      # Docker를 통한 TimescaleDB 컨테이너 실행
npm run db:push    # Drizzle ORM 스키마 동기화
npm run db:seed    # 초기 필수 데이터 및 pgvector 익스텐션 시딩
```

### 4. 개발 서버 실행
```bash
npm run dev
```
접속: `http://localhost:3000` (브라우저 환경에 따라 `ko` 또는 `en` 경로로 자동 라우팅됩니다.)

---

## 💻 주요 스크립트 (Scripts)

*   `npm run validate` - TypeScript 타입 체크, ESLint, Vitest 테스트를 병렬로 실행하여 코드 무결성을 검증합니다.
*   `npm run build` - Next.js 프로덕션 빌드를 수행합니다.
*   `npm run db:studio` - Drizzle Studio를 통해 브라우저에서 데이터베이스를 편리하게 관리합니다.
*   `npm run db:embed` - 토픽 연습용 문장 배치 데이터를 임베딩하여 DB에 적재합니다.

---

## 📄 시스템 상세 문서 (Documentation)

TypeDiag의 코어 아키텍처와 상세 스펙은 `docs/` 디렉터리의 개별 문서에서 깊이 있게 확인할 수 있습니다.

*   [**SKDM & 3D 시각화 (SKDM_ARCHITECTURE.md)**](docs/SKDM_ARCHITECTURE.md) — 3D 지연 지형 생성 수학 모델 및 렌더링 파이프라인
*   [**원통형 진단 모델 (DIAGNOSTICS.md)**](docs/DIAGNOSTICS.md) — 원통형 3D 시각화 (focusKey, Cloud Typing, 조각선형 회귀) 통계 스펙
*   [**한글 오타 판별 알고리즘 (MVSA_ALGORITHM.md)**](docs/MVSA_ALGORITHM.md) — 실시간 자소 단위 분석 및 패닉 복구 모드 상세
*   [**인증 아키텍처 (AUTH.md)**](docs/AUTH.md) — Clerk 통합, 게스트 HMAC 발급 및 세션 병합 프로세스
*   [**API 명세서 (API.md)**](docs/API.md) — 타자 세션 저장 및 토픽 관련 REST API 스펙
*   [**DB 스키마 & 수명 주기 (DB_SCHEMA.md)**](docs/DB_SCHEMA.md) — TimescaleDB 하이퍼테이블 스키마 및 세션 관리 전략
*   [**Zustand 상태 관리 (STATE_MANAGEMENT.md)**](docs/STATE_MANAGEMENT.md) — 프론트엔드 상태 슬라이스 패턴 및 최적화
*   [**디자인 시스템 (DESIGN_SYSTEM.md)**](docs/DESIGN_SYSTEM.md) — Space Grey & Ocean Cyan 색상 팔레트, 타이포그래피, 마이크로 인터랙션
*   [**토픽 모드 스펙 (TOPIC_MODE.md)**](docs/TOPIC_MODE.md) — pgvector 기반 벡터 검색 캐싱 및 LLM fallback 문장 생성
*   [**하드코어 연습 모드 (HARDCORE_MODE.md)**](docs/HARDCORE_MODE.md) — 한글 MLP 언어 모델 기반 고난이도 문장 생성

---

### 🛡 For AI Agents & Contributors

저장소 루트에 위치한 [`AGENTS.md`](AGENTS.md)는 **AI 에이전트(Cursor, Antigravity 등)의 자율 작업을 위한 최우선 시스템 프롬프트 가이드**입니다. 에이전트는 코드 수정 전 반드시 해당 문서를 숙지해야 합니다. (일반 사용자를 위한 문서가 아닙니다.)

## 📜 License

이 프로젝트는 GNU Affero General Public License version 3 (AGPLv3)에 따라 배포됩니다. 자세한 내용은 [LICENSE](LICENSE) 파일을 참조하세요.
