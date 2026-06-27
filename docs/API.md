# HTTP API 레퍼런스

TypeDiag App Router API 라우트 요약입니다. 정본은 `src/app/api/` 하위 `route.ts` 파일입니다.

---

## 인증 요약

| 라우트 | Clerk | 게스트 | 비고 |
| :--- | :---: | :---: | :--- |
| `POST /api/session` | ✅ | ✅ (bootstrap) | `resolveApiUser` — 토큰 없이 허용, `guestToken` 발급 가능 |
| `GET /api/session` | ✅ | ✅ (analysis는 토큰 필수) | `action=analysis`는 `requireGuestToken: true` |
| `POST /api/user/sync` | ✅ | 헤더만 (머지용) | Clerk 세션 필수 |
| `POST /api/practice/topic` | — | — | **무인증** (주제 검증만) |
| `POST /api/practice/topic/generate` | — | — | **무인증** (주제 검증만) |
| `GET /api/practice/target` | — | — | **무인증** (Normal mode 랜덤 문장) |
| `POST /api/feedback` | ✅ | ✅ (bootstrap) | `resolveApiUser` — 일일 10회 제한 |

게스트 헤더·토큰 상세: [AUTH.md](AUTH.md)

> Topic API는 현재 인증·레이트리밋이 없습니다. 운영 환경에서는 API 키 비용·남용에 유의하세요.

---

## `POST /api/session`

**Body**: `{ action: "start" | "finish" | "sync", ... }`  
**Headers**: `Content-Type: application/json`, 게스트 시 `X-Guest-User-Id` (+ 선택 `X-Guest-Token`)

### `action: "start"`

문장 입력 시작 시 run ID를 확보합니다.

```json
{ "action": "start", "now": "2026-06-24T12:00:00.000Z" }
```

**Response**: `{ "runId": "<uuid>", "guestToken?": "<string>" }`

### `action: "finish"`

문장 완료 시 page + key_events를 DB에 저장합니다. Body는 Zod로 검증됩니다 (`events` 최대 10,000건).

```json
{
  "action": "finish",
  "runId": "<uuid>",
  "targetText": "...",
  "typedText": "...",
  "events": [/* KeyEvent[] */],
  "startedAt": 12345.6,
  "finishedAt": 67890.1,
  "targetId": "optional",
  "language": "ko"
}
```

**Response**: `{ "runId": "<uuid>", "guestToken?": "<string>" }` — 5분 gap split 시 runId가 바뀔 수 있음

### `action: "sync"`

앱 마운트 시 방치된 `in_progress` run을 정리합니다 (3분 idle 기준).

```json
{ "action": "sync" }
```

**Response**: `{ "success": true, "guestToken?": "<string>" }`

---

## `GET /api/session`

**Query**: `action`, 기타 파라미터

### `action=analysis` (인증 필요)

Run에 속한 모든 key_events를 반환합니다. 게스트는 유효 `X-Guest-Token` 필수.

```
GET /api/session?action=analysis&runId=<uuid>
```

**Response**: `{ "events": KeyEvent[], "guestToken?": "<string>" }`  
**403**: run이 없거나 `run.userId`가 요청 사용자와 불일치

### `action=mock` (development only)

`src/data/local_db.json`의 mock 이벤트를 반환합니다. `NODE_ENV !== "development"`이면 403.

---

## `POST /api/user/sync`

Clerk 로그인 사용자의 게스트 데이터 머지.

**Headers**: Clerk 세션 + `X-Guest-User-Id` + `X-Guest-Token` (머지 시 토큰 필수)

**Response**: `{ "success": true, "userId": "<clerkUserId>" }`

| Status | 의미 |
| :--- | :--- |
| 401 | Clerk 미로그인, 또는 게스트 토큰 무효 |
| 400 | guest ID 형식 오류 |

---

## `GET /api/practice/target`

Normal mode용 연습 문장 1개를 무작위로 반환합니다.

**Query**: `language=ko|en` (기본 `ko`), 선택 `exclude=<targetId>` (직전 문장 제외)

**Response 200**:

```json
{
  "success": true,
  "data": {
    "id": "target_001",
    "content": "...",
    "language": "ko"
  }
}
```

| Status | 의미 |
| :--- | :--- |
| 400 | 지원하지 않는 `language` |
| 404 | 해당 언어 문장 없음 |

---

## `POST /api/practice/topic`

주제어 벡터 검색 (pgvector 캐시).

**Body**: `{ "topic": "<string>" }` — `validateTopic()` 통과 필요

**Response 200**:

```json
{
  "success": true,
  "data": [
    { "id": "...", "content": "...", "language": "ko", "similarity": 0.82 }
  ]
}
```

| Status | 의미 |
| :--- | :--- |
| 400 | topic 누락/검증 실패 |
| 404 | 유사도 > 0.5인 캐시 없음 → 클라이언트가 generate로 폴백 |
| 500 | Upstage/DB 오류 |

환경 변수: `UPSTAGE_API_KEY`

---

## `POST /api/practice/topic/generate`

OpenAI `gpt-4.1-nano`로 주제 기반 문장 20개 생성.

**Body**: `{ "topic": "<string>" }`

**Response 200**:

```json
{
  "success": true,
  "data": [
    { "id": "target_gen_<uuid>", "content": "...", "language": "ko" }
  ]
}
```

| Status | 의미 |
| :--- | :--- |
| 400 | topic 누락/검증 실패 |
| 422 | 생성 결과가 형식 필터를 통과하지 못함 |
| 503 | OpenAI 429/503 (재시도 소진) |
| 500 | 기타 오류 |

환경 변수: `OPENAI_API_KEY`  
모델: `gpt-4.1-nano` (고정, 429/503 시 동일 모델 재시도)  
생성 문장은 비동기로 `target_texts`에 적재됩니다 (`insertTopicGeneratedTargets`).

---

## `POST /api/feedback`

사용자 피드백(의견·버그 리포트 등)을 DB에 저장합니다. 타자 세션(`pages`/`key_events`)과 분리됩니다.

**Headers**: `Content-Type: application/json`, Clerk 세션 또는 게스트 `X-Guest-User-Id` (+ 선택 `X-Guest-Token`)

```json
{
  "message": "진단 화면이 더 보고 싶어요",
  "language": "ko"
}
```

| 필드 | 규칙 |
| :--- | :--- |
| `message` | trim 후 1~5000자 |
| `language` | `"ko"` \| `"en"` |

**Response**: `{ "success": true, "guestToken?": "<string>" }`

| Status | 의미 |
| :--- | :--- |
| 400 | payload 검증 실패 |
| 401 | 인증 실패 (게스트 ID 없음 등) |
| 429 | 일일 10회 한도 초과 |
| 500 | DB 오류 |

클라이언트 SSOT: `src/services/feedbackServiceClient.ts`, UI: `src/components/workspace/feedback/`

---

## 개발 전용 라우트

`NODE_ENV === "development"`에서만 동작:

| 라우트 | 용도 |
| :--- | :--- |
| `GET /api/session?action=mock` | local_db.json mock 이벤트 |
| `src/app/api/db/route.ts` | DB 디버그 |
| `src/app/api/dev/cosine-similarity/route.ts` | 임베딩 유사도 실험 |

판별 SSOT: `src/lib/api/isDevOnlyRoute.ts` (`isDevOnlyEnabled()`)
