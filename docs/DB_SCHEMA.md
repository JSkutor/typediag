# 타이핑 진단 서비스 DB 스키마 설계

이 문서는 타이핑 진단 서비스에 사용되는 데이터베이스 구조를 설명합니다. 이 설계는 사용자 정보, 연습 세션, 개별 문장 결과를 기록하고 분석하는 데 초점을 맞춥니다.
최신 아키텍처에서는 **TimescaleDB, Drizzle ORM, Clerk 인증**을 사용하여 관계형 스키마와 시계열 최적화를 모두 달성합니다.

---

## 테이블 관계 구조

- 사용자(`users`)는 여러 연습 세션(`runs`)을 가집니다. (1:N)
- 각 연습 세션(`runs`)은 여러 문장 타이핑 결과(`pages`)로 구성됩니다. (1:N)
- 각 문장 타이핑 결과(`pages`)는 제시문 정보(`target_texts`)를 참조합니다. (N:1)
- 각 문장 결과(`pages`)는 수많은 개별 키 이벤트(`key_events`)를 가집니다. (1:N)

---

## 테이블 상세 정의 (Drizzle ORM 기반)

### 1. users (사용자)

Clerk 인증과 연동되는 사용자 정보를 저장합니다.

- `id`: 사용자 고유 식별값 (VARCHAR(255), PK) — Clerk `userId` 또는 게스트 `guest_<uuid>`
- `created_at`: 생성 일시 (TimestampTZ, Not Null)
- `updated_at`: 수정 일시 (TimestampTZ, Not Null)

### 2. target_texts (제시문)

타자 연습을 위해 시스템에 등록되거나 실시간으로 생성된 원본 문장 데이터입니다. `pgvector`를 사용해 의미 기반 검색을 지원합니다.

- `id`: 고유 식별값 (VARCHAR(50), PK)
- `content`: 제시문 내용 (TEXT, Unique, Not Null)
- `language`: 문장의 언어 (VARCHAR(10), Not Null)
- `source`: 생성 출처 (VARCHAR(20), Not Null, Default 'default')
- `generator_model`: 생성 LLM 모델명 등 (VARCHAR(50), Nullable)
- `subject`: 유저가 입력한 주제어 (TEXT, Nullable)
- `user_id`: 등록한 사용자 식별값 (VARCHAR(255), FK, Nullable)
- `usage_count`: 완주 횟수 (INT, Not Null, Default 0)
- `last_used_at`: 최근 완주 일시 (TimestampTZ, Nullable)
- `embedding`: Upstage Solar Embedding API 벡터 (vector(4096), Nullable)
- `created_at`: 생성 일시 (TimestampTZ, Not Null)

### 3. runs (연습 세션)

사용자가 1회 연습을 시작해서 끝낼 때까지의 단위 기록입니다.

- `id`: 고유 식별값 (UUID, PK)
- `user_id`: 사용자 식별값 (VARCHAR(255), FK, Nullable - 비회원 연습 허용 시)
- `status`: 진행 상태 ('pending', 'in_progress', 'completed') (VARCHAR(20), Not Null)
- `started_at`: 세션 시작 일시 (TimestampTZ, Not Null)
- `finished_at`: 세션 완료 일시 (TimestampTZ, Nullable)
- `cpm`: 세션 전체의 분당 타수 (Integer, Nullable)
- `wpm`: 세션 전체의 분당 단어 수 (Integer, Nullable)
- `accuracy`: 세션 전체의 정확도 퍼센트 (Real, Nullable)
- `created_at`: 생성 일시 (TimestampTZ, Not Null)

### 4. pages (문장 타이핑 결과)

한 세션 내에서 개별 문장을 타이핑한 결과 요약 정보를 저장합니다.

- `id`: 고유 식별값 (UUID, PK)
- `run_id`: 속한 세션 식별값 (UUID, FK, Not Null)
- `target_text_id`: 참조하는 제시문 식별값 (VARCHAR(50), FK)
- `order_index`: 세션 내 진행 순서 (Integer, Not Null)
- `language`: 문장 언어 구분 (VARCHAR(10), Not Null)
- `typed_text`: 사용자가 최종 입력한 문장 (TEXT, Not Null)
- `wpm`: 해당 문장의 분당 단어 수 (Integer, Not Null)
- `cpm`: 해당 문장의 분당 타수 (Integer, Not Null)
- `accuracy`: 해당 문장의 정확도 퍼센트 (Real, Not Null)
- `started_at`: 문장 입력 시작 일시 (TimestampTZ, Not Null)
- `finished_at`: 문장 입력 완료 일시 (TimestampTZ, Not Null)
- `elapsed_time_ms`: 타이핑 소요 시간 밀리초 (Integer, Not Null)
- `created_at`: 생성 일시 (TimestampTZ, Not Null)

### 5. key_events (키 입력 이벤트 로그 - Hypertable)

수많은 키 입력 이벤트를 개별 Row 단위로 정규화하여 저장합니다. **TimescaleDB의 Hypertable**을 사용하여 `created_at` 기준으로 시간별 파티셔닝되어 대용량 쓰기 성능을 극대화합니다.

- `id`: 고유 식별값 (BIGSERIAL, PK)
- `page_id`: 속한 페이지 결과 식별값 (UUID, FK, Not Null)
- `seq`: 페이지 내 키 입력 순서 (SmallInt, Not Null)
- `from_key`: 이전 입력 키값 (VARCHAR(20), Nullable)
- `to_key`: 현재 입력 키값 (VARCHAR(20), Not Null)
- `key_char`: 화면에 출력되는 글자 (VARCHAR(10), Default '')
- `latency`: `from_key` 완료 후 `to_key`까지의 지연시간 ms (Integer, Not Null)
- `hold_duration_ms`: 키를 누르고 있던 시간 ms (SmallInt, Nullable)
- `is_correct`: 정타 여부 (Boolean, Nullable)
- `expected_char`: 기대했던 정타 글자 (VARCHAR(10), Nullable)
- `created_at`: 기록 생성 일시 (TimestampTZ, Not Null) **[Hypertable 파티션 키]**

---

## 주요 지표 계산 및 아키텍처

1. **실시간 처리 분리**: 실시간 타수(WPM, CPM) 및 정확도 계산은 모두 프론트엔드에서 처리합니다. 타건 중에는 서버 통신이 발생하지 않으며, 페이지(문장) 타이핑 완료 직후 1회의 API 호출을 통해 `pages` 요약과 `key_events` 배열 전체를 Drizzle ORM의 Bulk Insert로 DB에 적재합니다.
2. **시계열 최적화 (TimescaleDB)**: `key_events`는 매우 빠른 속도로 누적되므로, TimescaleDB의 Hypertable 구조를 통해 시간 단위(청크) 파티셔닝을 적용하여 쓰기 병목 및 스토리지 단편화를 방지합니다.
3. **벡터 검색 (pgvector)**: Subject 모드 등의 주제어 검색 시, 로컬 JSON을 뒤지는 대신 pgvector의 코사인 거리 연산자(`<=>`)를 활용해 DB 레벨에서 고속 시맨틱 검색을 수행합니다.

---

## 연습 세션(Run) 생명주기 관리 로직

- **공백 및 유휴시간**: 타이핑 중 긴 유휴시간(Idle, 5분 초과) 발생 시, 이전 Run을 `completed`로 닫고 새로운 Run을 분리 생성합니다. WPM/CPM 산출 시 비정상 latency는 보정하여 계산됩니다.
- **방향키/스킵**: 문장 중간 포기(오른쪽 방향키) 시 해당 page 이벤트를 DB에 저장하지 않고 버립니다. 재시도(왼쪽 방향키) 시 동일 문장에 대해 새로운 page를 누적 생성합니다.
- **OnMount 동기화**: 프론트엔드 진입 시 `syncSessionOnMount` 호출을 통해 브라우저 종료 등으로 방치된 `in_progress` 세션들의 완료 여부(최종 입력 후 3분 경과 검사)를 정리합니다.
