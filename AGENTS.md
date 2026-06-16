# AGENTS.md — TypeDiag AI 작업 가이드

이 문서는 Cursor/AI 에이전트가 TypeDiag 레포에서 작업할 때 따라야 할 규칙이다.
사람이 읽어도 프로젝트 구조 파악에 도움이 된다.

---

## 1. 프로젝트 한 줄 요약

**TypeDiag** — 키스트로크 쌍 `(fromKey → toKey, latencyMs)` 을 분석하는 SKDM(Spatial Keystroke Dynamics Model) 기반 타자 진단·연습 앱.

- 스택: Next.js 16, React 19, Zustand, Three.js, Vitest
- 핵심 차별점: WPM이 아니라 **키보드 공간 위 지연 지형(3D)** 으로 병목 진단

---

## 2. Source of Truth (수정 전 반드시 확인)

| 영역             | 정본 (production)                | 참고/실험용             | 규칙                                                                 |
| ---------------- | -------------------------------- | ----------------------- | -------------------------------------------------------------------- |
| SKDM 수학 모델   | `src/lib/skdm/model.ts`          | `skdm/model.py`         | **TS만 프로덕션.** Python 수정 시 `model.parity.test.ts` 반드시 통과 |
| SKDM 설정 상수   | `src/lib/skdm/config.ts`         | `skdm/config.py`        | 상수 변경은 양쪽 동시 또는 TS만                                      |
| 키 레이아웃 좌표 | `src/lib/skdm/layout.ts`         | `skdm/layout.py`        | parity 유지                                                          |
| θ 각도 순서      | `src/lib/skdm/theta_order.json`  | `skdm/theta_order.json` | cylindrical 뷰용. 동기화 필요                                        |
| 아키텍처 설명    | `docs/SKDM_ARCHITECTURE.md`      | —                       | 파이프라인 변경 시 문서도 갱신                                       |
| 상태 관리        | `docs/STATE_MANAGEMENT.md`       | —                       | slice 추가/변경 시 갱신                                              |
| DB 스키마        | `docs/DB_SCHEMA.md`              | `src/utils/db.ts` 타입  | snake_case는 **DB/API 저장용**                                       |
| 세션 비즈니스 룰 | `src/services/sessionService.ts` | `TODO.md` (한국어 메모) | 3분 타임아웃·run/page 분리 로직 건드릴 때 주의                       |

### 수정 금지 / 신중히 수정

- `src/lib/skdm/model.ts` 파이프라인 단계 순서: filter → aggregate → summarize → smooth
- `SessionService` 의 3분 idle / 5분 gap run split 규칙
- `useWorkspaceKeybindings.ts` 의 Tab/Space/Arrow 키 동작 (UX 계약)
- `model.parity.test.ts` — 삭제·비활성화 금지

### 레거시 — 새 코드에서 복사하지 말 것

- `public/three_test/` — 초기 Three.js 프로토타입. **참고만, 패턴 복사 금지**
- `src/utils/mockData.ts` — 개발용 더미

---

## 3. 디렉터리 맵

```
src/
├── app/                    # Next.js App Router
│   ├── [lang]/             # 워크스페이스 (practice + diagnostics)
│   └── api/db/             # dev-only JSON DB API
├── components/
│   ├── workspace/          # 3D 시각화, Practice/Diagnostics 레이어
│   ├── practice/           # 결과 패널
│   └── layout/             # Header, Footer
├── hooks/                  # 키바인딩, 3D 매니저, 진단 전환
├── lib/
│   ├── skdm/               # ★ 핵심 분석 모델 (가장 중요)
│   ├── practice/           # WPM/CPM/accuracy 메트릭
│   └── keyboard/           # 키 정규화
├── services/
│   └── sessionService.ts   # run/page 생명주기
├── store/
│   ├── typingSlices/       # Input / Keystroke / Session slice
│   ├── useTypingStore.ts   # 타자 입력 상태
│   └── useWorkspaceStore.ts # UI 모드 (practice vs diagnostics)
└── utils/
    ├── db.ts               # localStorage + dev API 추상화
    └── localDbService.ts   # 서버측 JSON 파일 DB (dev only)

skdm/                       # Python reference + fixture 생성 스크립트
docs/                       # 아키텍처 문서
```

---

## 4. 네이밍 규칙

### TypeScript 런타임 (앱 내부)

- **camelCase**: `fromKey`, `toKey`, `latencyMs`, `keyChar`, `holdDurationMs`
- 단일 타입: `src/lib/skdm/types.ts` 의 `KeyEvent`

### DB / API / localStorage 저장

- **snake_case**: `from_key`, `to_key`, `latency`, `hold_duration_ms`
- 타입: `src/utils/db.ts` 의 `KeyEventSchema`, `PageRow`, `RunRow`
- `src/lib/practice/metrics.ts` 의 `GenericKeyEvent`는 **양쪽 필드명 허용** (레거시 호환). **새 코드는 camelCase만 추가**

### 금지

- `any` 타입 신규 추가 (테스트 fixture 제외)
- 같은 개념에 세 번째 필드명 변형 만들기

---

## 5. 데이터 흐름 (건드리기 전 이해할 것)

```
키 입력 (window keydown/keyup)
  → useWorkspaceKeybindings
  → useTypingStore.handlePhysicalKeyPress / recordKey
  → KeyEvent[] (events)
  → Tab → useDiagnosticsTransition
  → runPipeline(events) → KeyResult map
  → LatencySurface3D / CylindricalVector3D

세션 저장
  → finishPage → SessionService → db.createPage
  → dev: POST /api/db → localDbService → src/data/local_db.json
  → prod(현재): localStorage
```

---

## 6. 테스트 규칙

작업 완료 전 로컬에서 실행:

```bash
npm run test        # Vitest 112+ tests
npm run typecheck   # tsc --noEmit
npm run lint        # ESLint
npm run build       # Next.js 빌드 (큰 변경 시)
```

### 필수 테스트 추가 조건

| 변경 내용                | 필요한 테스트                                 |
| ------------------------ | --------------------------------------------- |
| `src/lib/skdm/model.ts`  | `model.unit.test.ts` + `model.parity.test.ts` |
| `SessionService`         | `sessionService.test.ts`                      |
| 키 바인딩 / UI 모드 전환 | `useWorkspaceKeybindings.test.ts`             |
| `db.ts` CRUD / sync      | `db.test.ts`                                  |
| store slice 동작         | `useTypingStore.test.ts`                      |

### 아직 테스트 없는 영역 (건드릴 때 테스트 추가 권장)

- `src/app/api/db/route.ts`
- `src/utils/localDbService.ts` (직접)
- `src/lib/skdm/diagnostics.ts`
- `src/lib/skdm/cylindrical.ts`
- `src/hooks/useThreeManager.ts`
- 3D Manager 클래스 (`Surface3DManager`, `Cylindrical3DManager`)
- `createInputSlice.ts` (한글 입력, skip/next 로직)

---

## 7. 환경 / DB

- **현재 DB**: dev는 `local_db.json` + `/api/db`, 브라우저는 `localStorage`
- `/api/db` 는 `NODE_ENV === "development"` 에서만 동작 (403 otherwise)
- 실 DB(Supabase/Neon)는 아직 없음 — `db.ts` 인터페이스 유지하며 교체 예정
- `user_001` mock user 하드코딩 — 인증 붙이기 전까지 유지

---

## 8. UI / 3D 작업 시

- Three.js 초기화: `useThreeManager` 사용. **dispose 필수** (이미 구현됨)
- `LatencySurface3D`: `isActivated` 후 350ms 뒤 Three 초기화 (트랜지션 성능)
- 진단 모드 키: Tab(전환), Esc(surface 복귀), 키 클릭→cylindrical
- CSS: `docs/DESIGN_SYSTEM.md` 팔레트 준수

---

## 9. AI 작업 시 DO / DON'T

### DO

- 기존 slice 패턴·서비스 싱글톤 패턴 따르기
- 작은 diff. 한 PR/세션에 하나의 관심사
- 수학 변경은 config 상수로 빼기 (`src/lib/skdm/config.ts`)
- `docs/` 갱신 (동작이 바뀌면)
- corrupt localStorage 방어 (추가 시 `safeParseStorage` 패턴 사용 — `docs/` 또는 `src/utils/storage.ts` 참고)

### DON'T

- `public/three_test/` 코드를 `src/components` 로 복사
- Python만 고치고 TS parity 테스트 안 돌리기
- `KeyEvent` 필드명 또 다른 스타일로 추가
- `/api/db` 에 인증 없이 production 노출
- `console.log` 디버그 코드 커밋
- `eslint-disable` / `@ts-ignore` 로 타입 에러 숨기기

---

## 10. 로드맵 참고 (우선순위)

`TODO.md` 에 한국어로 상세 메모 있음. 요약:

1. 서브 통계 (space, backspace, shift, 오타 키)
2. 실 DB + 로그인
3. 진단 → 맞춤 드릴 루프 (AI 또는 룰 기반)
4. 영어 버전
5. 한글 자소 분리 없이 글자 단위 삭제

새 기능은 위 순서와 충돌하지 않게. **진단→드릴 루프**가 제품 완성도에 가장 중요.

---

## 11. 검증 체크리스트 (세션 종료 전)

- [ ] `npm run test` 통과
- [ ] `npm run typecheck` 통과
- [ ] SKDM 수정 시 parity test 확인
- [ ] 키보드로 practice → Tab → diagnostics 수동 스모크 (가능하면)
- [ ] 불필요한 `any` 추가 안 함
- [ ] `public/three_test/` 미수정 (필요 없으면)
