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
- **DB**: Local JSON DB (`src/data/local_db.json`, dev-only API) + localStorage (Production)
- **에이전트 행동 제약**:
  - 새로운 외부 패키지를 임의로 추가하지 말 것. 설치가 꼭 필요한 경우 먼저 유저에게 질문할 것.
  - 스타일링은 Vanilla CSS를 사용하며, 기존 디자인 시스템 (`docs/DESIGN_SYSTEM.md`) 팔레트를 엄격히 준수할 것.

---

## 3. 디렉터리 구조 및 컴포넌트 맵 (Directory Map)

에이전트는 코드 탐색 범위를 최소화하고 파일 생성 위치를 규격화하기 위해 아래 구조를 준수해야 합니다.

```
src/
├── app/                    # Next.js App Router 페이지 및 API 라우트
│   ├── [lang]/             # 다국어 지원 루트 (연습 및 진단 메인 페이지)
│   └── api/db/             # 개발용 로컬 JSON DB 싱크 API
├── components/             # React 공통 및 개별 컴포넌트
│   ├── workspace/          # 연습/진단 워크스페이스 3D 시각화 및 주요 레이어
│   ├── practice/           # 타자 연습 UI 및 통계 결과 패널
│   └── layout/             # Header, Footer 등 레이아웃 요소
├── hooks/                  # 전역 키바인딩, UI 트랜지션, 3D 매니징용 커스텀 훅
├── lib/                    # 핵심 비즈니스 로직 및 계산 모델
│   ├── skdm/               # ★ SKDM 3D 수학 모델 및 분석 파이프라인
│   ├── practice/           # WPM, CPM, 정확도 등 기본 타자 메트릭 계산
│   └── keyboard/           # 물리 키보드 레이아웃 및 키 입력 정규화
├── services/               # 외부 연동 및 타이핑 세션 관리 싱글톤 서비스
├── store/                  # Zustand 상태 저장소
│   └── typingSlices/       # 세션, 키입력 상태별 슬라이스 분할 디렉터리
└── utils/                  # DB 입출력, 스토리지 파싱, 계산 보조 유틸리티
```

---

## 4. Single Source of Truth (SSOT)

에이전트는 중복 코드를 작성하는 경향이 있습니다. 아래 지정된 정본(SSOT)을 반드시 먼저 확인하고 재사용하십시오.

| 도메인                  | 정본 파일 / 디렉터리             | 비고                                                                          |
| :---------------------- | :------------------------------- | :---------------------------------------------------------------------------- |
| **SKDM 수학 모델**      | `src/lib/skdm/model.ts`          | Python 레거시(`skdm/model.py`)와 매치 필요. 변경 시 패리티 테스트 필수.       |
| **SKDM 설정 상수**      | `src/lib/skdm/config.ts`         | 계산 임계값, 가중치 등은 이 파일에서 집중 관리.                               |
| **키보드 레이아웃**     | `src/lib/skdm/layout.ts`         | 물리 키보드 좌표 매핑 정보.                                                   |
| **데이터베이스 스키마** | `docs/DB_SCHEMA.md`              | API와 DB 저장 객체는 **snake_case** 사용 (TypeScript 런타임은 **camelCase**). |
| **세션 생명주기**       | `src/services/sessionService.ts` | 타자 연습 세션 저장 및 저장 주기(idle 3분, gap 5분) 비즈니스 로직.            |

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
4. **빌드 검증**: 대규모 UI 또는 Next.js App Router 구조 변경 시 `npm run build`를 수행하여 빌드 오류가 없는지 사전 검증.
5. **문서 동기화**: 코드 변경으로 인해 아키텍처, 상태 관리 방식, DB 스키마 등이 수정되었다면 `docs/` 하위의 관련 마크다운 문서 및 `README.md`를 함께 최신화할 것.
6. **완료 보고(Walkthrough)**: 복잡하거나 많은 수정 사항이 발생했을 때 에이전트는 `walkthrough.md` 또는 최종 메시지로 작업한 세부 결과(영향받은 파일 목록, 수행한 테스트 결과)를 일목요연하게 보고할 것.

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
- TODO.md 는 사용자의 메모장이므로 사용자의 직접적인 명령이 없을 때 임의로 수정하지 마라.

---

## 8. Learn by yourself.

작업 도중에 잘못된 행동으로 발생한 이슈나 해프닝이 있었으면 재발하지 않게 AGENTS.md의 DON'T 리스트에 명시하라.
AGENTS.md 파일이 코드베이스 기반으로 최신화가 안되어있으면 업데이트 하라.
