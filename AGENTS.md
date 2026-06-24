# AGENTS.md — AI Agent & Vibe Coding 작업 가이드

이 문서는 AI 에이전트(Cursor, Antigravity 등)가 이 레포지토리에서 100% 바이브 코딩 및 자율 작업을 수행할 때 반드시 준수해야 하는 **최우선 가이드라인**입니다. 모든 에이전트는 세션 시작 전 이 규칙을 시스템 프롬프트로 로드하여 인지해야 합니다.

---

## 1. 프로젝트 정체성 및 핵심 철학

- **프로젝트명**: TypeDiag (타자 진단 및 연습 플랫폼)
- **핵심 컨셉**: 일반 타자 연습기처럼 단순히 WPM/CPM 같은 1차원 메트릭만 측정하지 않음. **키보드 3D 공간 상의 지연 지형(SKDM - Spatial Keystroke Dynamics Model)** 을 생성하여 오타 및 지연 병목 구간을 진단하는 것이 핵심 차별점.
- **에이전트 주의사항**: 단순화라는 명목으로 이 앱 고유의 **3D 지연 진단(Spatial Dynamics) 수학 모델**이나 시각화 레이어를 일반 2D 통계로 축소하거나 대체하지 말 것.

---

## 2. 개발 스택 및 아키텍처 제약

- **프레임워크**: Next.js 16 (App Router), React 19
- **상태 관리**: Zustand (Slice 패턴 활용 - `src/store/typingSlices/`)
- **3D 시각화**: Three.js / React Three Fiber (R3F)
- **테스트**: Vitest (단위 및 패리티 검증)
- **DB**: PostgreSQL (TimescaleDB) + Drizzle ORM (`src/utils/db.ts`, `src/db/`)
- **인증**: Clerk (`@clerk/nextjs`) — 로그인 사용자는 Clerk `userId`가 DB `users.id`와 동일
- **게스트 사용자**: 비로그인 시 `src/utils/guestUser.ts`가 `localStorage`에 `guest_<uuid>`와 HMAC 토큰을 발급·유지하고, 클라이언트 API 호출 시 `X-Guest-User-Id` + `X-Guest-Token` 헤더로 전달. 서버는 `src/utils/guestAuth.ts`로 토큰을 검증하며, 최초 세션 API 응답의 `guestToken`으로 클라이언트가 토큰을 bootstrap. 로그인 머지(`/api/user/sync`)는 유효한 게스트 토큰이 있을 때만 수행. Clerk ID와 동일 경로로 `db.getOrCreateUserByClerkId()` 처리
- **세션 저장 경로**: 클라이언트 `sessionServiceClient` → `POST /api/session` → 서버 `sessionService` → `db` (localStorage/JSON DB에 세션을 직접 쓰지 않음)
- **DB 스크립트**: `npm run db:generate`, `db:push`, `db:seed`, `db:studio`
- **에이전트 행동 제약**:
  - 새로운 외부 패키지를 임의로 추가하지 말 것. 설치가 꼭 필요한 경우 먼저 유저에게 질문할 것.
  - 스타일링은 Vanilla CSS를 사용하며, 기존 디자인 시스템 (`docs/DESIGN_SYSTEM.md`) 팔레트를 엄격히 준수할 것.
  - 사용자·기여자용 문서는 `README.md`, `docs/` 하위. 본 `AGENTS.md`는 AI 에이전트 전용이며 README Docs 목록에 넣지 말 것.

---

## 3. 디렉터리 구조 및 컴포넌트 맵 (Directory Map)

에이전트는 코드 탐색 범위를 최소화하고 파일 생성 위치를 규격화하기 위해 프로젝트 구조를 파악하고 작업 혹은 답변을 하라.
graphify-ts mcp 명령을 사용해 구조를 파악하라.

---

## 4. Single Source of Truth (SSOT)

에이전트는 중복 코드를 작성하는 경향이 있습니다. 아래 지정된 정본(SSOT)을 반드시 먼저 확인하고 재사용하십시오.

| 도메인                  | 정본 파일 / 디렉터리             | 비고                                                                          |
| :---------------------- | :------------------------------- | :---------------------------------------------------------------------------- |
| **SKDM 수학 모델**      | `src/lib/skdm/model.ts`          | Python 레거시(`skdm/model.py`)와 매치 필요. 변경 시 패리티 테스트 필수.       |
| **SKDM 설정 상수**      | `src/lib/skdm/config.ts`         | 계산 임계값, 가중치 등은 이 파일에서 집중 관리.                               |
| **키보드 레이아웃**     | `src/lib/skdm/layout.ts`         | 물리 키보드 좌표 매핑 정보.                                                   |
| **데이터베이스 스키마** | `docs/DB_SCHEMA.md`              | API와 DB 저장 객체는 **snake_case** 사용 (TypeScript 런타임은 **camelCase**). |
| **DB 접근 레이어**      | `src/utils/db.ts`, `src/db/`     | Drizzle ORM 쿼리 SSOT. 세션·키 이벤트 영속화는 여기서만 수행.                 |
| **세션 생명주기 (서버)** | `src/services/sessionService.ts` | 타자 연습 세션 저장 및 저장 주기(idle 3분, gap 5분) 비즈니스 로직.          |
| **세션 API (클라이언트)** | `src/services/sessionServiceClient.ts` | 브라우저에서 `/api/session` 호출 래퍼. Zustand `createSessionSlice`가 사용. |
| **세션 API (라우트)**   | `src/app/api/session/route.ts`   | Clerk 또는 `X-Guest-User-Id`로 사용자 식별 후 `sessionService` 위임.          |
| **게스트 사용자 ID**    | `src/utils/guestUser.ts`         | 비로그인 `guest_<uuid>` 발급·`localStorage` 유지, API 헤더 헬퍼.              |
| **게스트 인증 (HMAC)**  | `src/utils/guestAuth.ts`, `src/lib/api/resolveApiUser.ts` | 서버 토큰 서명·검증, API 사용자 식별 SSOT. 명세: `docs/AUTH.md`. |
| **HTTP API 명세**       | `docs/API.md`                    | 라우트 계약·상태 코드. 코드 SSOT는 `src/app/api/`.                           |
| **MVSA 알고리즘**       | `src/utils/mvsa.ts`              | 실시간 한글 자소 대조 및 오타 판별 정렬 엔진. `docs/MVSA_ALGORITHM.md` 명세와 싱크 필요. |
| **Topic API**           | `src/app/api/practice/topic/`    | 토픽 모드 벡터 검색(`route.ts`) 및 LLM 생성(`generate/route.ts`) 라우트 SSOT. Gemini 호출·재시도·응답 파싱은 `src/lib/api/topicGenerateGemini.ts`. |
| **Topic 클라이언트 상태** | `src/store/typingSlices/createTopicSlice.ts` | Topic 모드 Zustand slice. `docs/TOPIC_MODE.md`와 싱크 필요. |
| **BM·단위경제** | `docs/BUSINESS_MODEL.md` | 비용·수익 발생 지점, 단가, 월간 산식 SSOT. 수치 구현: `src/lib/dev/costSimulation.ts`, `revenueSimulation.ts`, `platformScaling.ts`. |

---

## 5. Git 협업 규칙 (Commit & Branch Conventions)

100% 바이브 코딩 환경에서 에이전트가 생성하는 브랜치명과 커밋 메세지는 아래 규칙을 엄격히 따라야 합니다.

### 5.1 브랜치 명명 규칙 (Branch Naming)

브랜치는 작업의 목적을 명확히 하는 접두사를 사용하며, 단어는 대시(`-`)로 연결합니다.

- **새로운 기능 추가**: `feat/<기능명>` (예: `feat/cylindrical-view`)
- **버그 수정**: `fix/<버그명>` (예: `fix/backspace-jaso`)
- **코드 리팩토링**: `refactor/<대상>` (예: `refactor/zod-validation`)
- **문서 작성**: `docs/<문서명>` (예: `docs/git-convention`)
- **테스트 추가/수정**: `test/<테스트명>` (예: `test/session-service`)

### 5.2 커밋 메시지 규칙 (Conventional Commits)

에이전트는 코드 수정 후 커밋을 제안할 때 **Conventional Commits 1.0.0** 형식을 준수해야 합니다.

```
<type>(<scope>): <description>

[body] (선택사항: 변경한 작업의 상세 이유나 디자인 디시전)
```

- **종류(type)**:
  - `feat`: 새로운 기능 추가
  - `fix`: 버그 수정
  - `refactor`: 성능 향상이나 구조 개선을 위한 코드 수정 (동작 변경 없음)
  - `test`: 테스트 코드 추가 및 수정
  - `docs`: 문서 작성 및 수정 (`AGENTS.md`, `README.md` 등)
  - `style`: 코드 포맷팅, 세미콜론 누락 수정 등 (로직 변경 없음)
  - `chore`: 빌드 업무, 패키지 매니저 설정, 환경 설정 변경
- **범위(scope)**: 수정된 컴포넌트나 모듈명을 기재 (예: `ui`, `skdm`, `db`, `session`)
- **메시지(description)**: 영문 명령형(Imperative) 혹은 명확한 한글 요약본을 사용하고, 끝에 마침표(`.`)를 찍지 않습니다.
- **예시**:
  - `feat(ui): add cylindrical coordinates plot for 3D diagnostics`
  - `fix(skdm): resolve backspace syllable deletion bug in Korean input`

---

## 6. 에이전트 전용 작업 체크리스트 (Quality Gate)

모든 자율 작업(작성, 수정, 디버깅)이 끝난 후 에이전트는 완료를 선언하기 전에 아래 프로세스를 강제로 수행해야 합니다.

1. **타입 체크 & 린트 체크 & 단위 테스트 (병렬 실행)**: `npm run validate` (또는 포맷 체크 포함 시 `npm run check`) 실행 후 에러가 없어야 함. (단 개별 실행도 가능: `npm run typecheck`, `npm run lint`, `npm run test`)
   * 수학 모델 변경 시 parity test가 필수적으로 통과해야 함.
2. **DB 스키마 변경 검증**: `src/db/schema.ts` 수정 시 `npm run db:generate` 후 마이그레이션·시드·관련 테스트를 함께 확인할 것.
3. **빌드 검증**: 대규모 UI 또는 Next.js App Router 구조 변경 시 `npm run build`를 수행하여 빌드 오류가 없는지 사전 검증.
4. **문서 동기화**: 코드 변경으로 인해 아키텍처, 상태 관리 방식, DB 스키마 등이 수정되었다면 `docs/` 하위의 관련 마크다운 문서, `AGENTS.md`, `README.md`를 함께 최신화할 것.
5. **완료 보고(Walkthrough)**: 복잡하거나 많은 수정 사항이 발생했을 때 에이전트는 `walkthrough.md` 또는 최종 메시지로 작업한 세부 결과(영향받은 파일 목록, 수행한 테스트 결과)를 일목요연하게 보고할 것.

---

## 7. AI Agent DO / DON'T

### DO (반드시 해야 할 행동)

- 코드 작성 전 **정본(SSOT)** 파일의 구조를 미리 검색하고 기존 코드를 재사용하십시오.
- 아키텍처나 기능 설계, DB 스키마가 바뀐 경우 반드시 코드 작업과 함께 `docs/` 하위 문서를 갱신해 주십시오. (문서와 코드의 싱크 유지)
- 타입 에러를 숨기기 위해 `@ts-ignore`나 `any`를 임의로 정의하지 마십시오. 필요한 경우 타입 추론을 정교하게 하거나 유니온 타입을 활용하십시오.
- 로직을 대대적으로 변경하기 전, 의도하지 않은 사이드 이펙트(동작 무력화 등)를 예방하기 위한 유닛 테스트 코드를 함께 보강하십시오.
- 사용자한테 말할때는 한국어 사용해.

### DON'T (절대 하지 말아야 할 행동)

- 임의의 디버그용 `console.log`를 프로덕션 코드에 남겨둔 채 작업을 끝내지 마십시오.
- 기존에 정상 동작하던 UX 요소(예: 키바인딩 단축키 UX 계약)를 유저 동의 없이 수정하거나 무력화하지 마십시오.
- 검증되지 않은 코드나 플레이스홀더(`// TODO: 구현 예정`) 상태로 커밋을 제안하거나 방치하지 마십시오.
- 사용자가 설명하라고만 했는데, 바로 코드 수정을 하지 마라. 설명을 하고 허락을 구해라.
- TODO.md 는 사용자의 메모장이므로 사용자의 직접적인 명령이 없을 때 임의로 수정하지 마라. 사용자가 커밋을 요청했을 때 `TODO.md`에 변경분이 있으면 함께 스테이징·커밋에 포함할 것.
- 사용자가 커밋을 요청하지 않았는데 임의로 `git commit`을 만들지 마라.
- 세션·키 이벤트 영속화를 localStorage나 JSON 파일 DB로 되돌리지 마라. 정본은 PostgreSQL + `src/utils/db.ts`이다.
- React 컴포넌트 렌더 함수 내에서 `useXxxStore.getState()`를 직접 호출하지 마라. 구독이 없어 상태 변화 시 리렌더가 트리거되지 않는다. 반드시 훅(selector) 방식으로 사용할 것.
- DB 쿼리에서 `.limit()`을 빠뜨리지 마라. 특히 벡터 유사도 검색처럼 임계값 필터만으로는 행 수를 제어할 수 없는 경우, 응답 페이로드가 무한정 커질 수 있다.
- 테스트에서 DB의 UUID 타입 컬럼에 `"old_run"`, `"pending_run"` 같은 임의 문자열 ID를 사용하지 마라. 유효한 UUID 형식(`"00000000-0000-0000-0000-000000000001"` 또는 `crypto.randomUUID()`)을 사용할 것.
- `createPage`처럼 상위 row와 하위 row를 동시에 insert할 때 트랜잭션으로 묶지 않으면 중간 실패 시 고아(orphan) 데이터가 발생한다. 반드시 `drizzleDb.transaction()`으로 묶을 것.
- `cleanSentence`처럼 개행문자(`\r\n`)를 공백으로 치환하는 함수를 거치기 전에 multiline 체크를 수행해야 한다. 정제 후에는 개행 감지가 불가능하다.
- Topic Mode 연동 시, pgvector의 코사인 유사도 연산(`1 - (A <=> B)`)이 0.5를 초과하는지 반드시 확인하고, 결과가 없거나 부족할 때 즉각적으로 Gemini LLM Fallback을 호출하는 흐름을 무시하지 마라.
- LLM 프롬프트로 문장 생성 시(Gemini Flash-Lite), 반환 포맷 검증을 거치지 않은 raw text를 그대로 클라이언트에 전달하지 마라. Max Tokens 등에 의해 JSON이 잘릴 수 있음을 항상 예외 처리해라.


---

## 8. Learn by yourself.

작업 도중에 잘못된 행동으로 발생한 이슈나 해프닝이 있었으면 재발하지 않게 AGENTS.md의 DON'T 리스트에 명시하라.
AGENTS.md 파일이 코드베이스 기반으로 최신화가 안되어있으면 업데이트 하라.
