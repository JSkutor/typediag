# HTTP API 레퍼런스

TypeDiag App Router API 라우트 요약입니다. 정본은 `src/app/api/` 하위 `route.ts` 파일입니다.

---

## 인증 요약

| 라우트 | Clerk | 게스트 | 비고 |
| :--- | :---: | :---: | :--- |
| `POST /api/session` | ✅ | ✅ (bootstrap) | `resolveApiUser` — 토큰 없이 허용, `guestToken` 발급 가능 |
| `GET /api/session` | ✅ | ✅ (analysis는 토큰 필수) | `action=analysis`는 `requireGuestToken: true` |
| `POST /api/user/sync` | ✅ | 헤더만 (머지용) | Clerk 세션 필수 |
| `POST /api/practice/topic` | ✅ | ✅ (bootstrap) | 검색당 레이트리밋(일 100회) 적용 |
| `POST /api/practice/topic/generate`| ✅ | ✅ (bootstrap) | 생성당 레이트리밋(일 15회) 적용 |
| `GET /api/practice/target` | — | — | **무인증** (Normal mode 랜덤 문장) |
| `POST /api/feedback` | ✅ | ✅ (bootstrap) | 일일 10회 제한 |
| `GET /api/cron/embed-backfill` | — | — | **크론 전용** (`Authorization: Bearer CRON_SECRET`) |

게스트 헤더·토큰 상세: [AUTH.md](AUTH.md)

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
문장 완료 시 page + key_events를 DB에 저장합니다.
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
**Response**: `{ "runId": "<uuid>", "cpm": 120, "wpm": 20, "accuracy": 98, "guestToken?": "<string>" }`

### `action: "sync"`
앱 마운트 시 방치된 `in_progress` run을 정리합니다.
```json
{ "action": "sync" }
```
**Response**: `{ "success": true, "guestToken?": "<string>" }`

---

## `GET /api/session`

**Query**: `action`, 기타 파라미터

### `action=analysis` (인증 필요)
Run에 속한 모든 key_events를 반환합니다. 게스트는 유효 `X-Guest-Token` 필수.
**Request**: `GET /api/session?action=analysis&runId=<uuid>` (runId가 `all`이면 유저의 전체 이벤트 조회)
**Response**: `{ "events": KeyEvent[], "guestToken?": "<string>" }`  

### `action=mock` (개발 전용)
`src/data/local_db.json`의 mock 이벤트를 반환합니다.

---

## `POST /api/user/sync`

Clerk 로그인 사용자의 게스트 데이터 머지.
**Headers**: Clerk 세션 + `X-Guest-User-Id` + `X-Guest-Token` (머지 시 토큰 필수)
**Response**: `{ "success": true, "userId": "<clerkUserId>" }`

---

## `GET /api/practice/target`

Normal mode용 연습 문장 1개를 무작위로 반환합니다. (인증 없음)
**Query**: `language=ko|en` (기본 `ko`), 선택 `exclude=<targetId>` (직전 문장 제외)
**Response 200**:
```json
{
  "success": true,
  "data": { "id": "target_001", "content": "...", "language": "ko" }
}
```

---

## `POST /api/practice/topic`

주제어 벡터 검색. Upstage API 및 pgvector 기반 코사인 유사도 연산.
**Headers**: Clerk 세션 또는 게스트 `X-Guest-User-Id`
**Body**: `{ "topic": "<string>" }` 
**Response 200**:
```json
{
  "success": true,
  "data": [
    { "id": "...", "content": "...", "language": "ko", "similarity": 0.82 }
  ]
}
```

---

## `POST /api/practice/topic/generate`

OpenAI LLM으로 주제 기반 문장 생성 (일일 15회 제한).
**Headers**: Clerk 세션 또는 게스트 `X-Guest-User-Id`
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

---

## `POST /api/feedback`

사용자 피드백을 DB에 저장합니다. 타자 세션 데이터와 독립적입니다. 일일 10회 제한.
**Headers**: Clerk 세션 또는 게스트 `X-Guest-User-Id`
**Body**: `{ "message": "...", "language": "ko" }`
**Response**: `{ "success": true, "guestToken?": "<string>" }`

---

## `GET /api/cron/embed-backfill`

임베딩 값이 없는 `target_texts` 에 대해 Upstage API를 사용해 임베딩을 백필하는 크론 작업 라우트.
**Headers**: `Authorization: Bearer <CRON_SECRET>`

---

## 개발 전용 라우트

`NODE_ENV === "development"`에서만 동작:
- `GET /api/session?action=mock`: local_db.json mock 이벤트
- `src/app/api/db/route.ts`: DB 디버그
- `src/app/api/dev/cosine-similarity/route.ts`: 임베딩 유사도 실험
