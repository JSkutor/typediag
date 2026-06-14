# 타이핑 진단 서비스 DB 스키마 설계

이 문서는 타이핑 진단 서비스에 사용되는 데이터베이스 구조를 설명합니다. 이 설계는 사용자 정보, 연습 세션, 개별 문장 결과를 기록하고 분석하는 데 초점을 맞춥니다.
특히 수많은 키 입력 이벤트는 프론트엔드에서 실시간으로 수집 및 가공된 후, 문장 연습이 끝나는 시점에 서버로 전송되어 `page` 테이블 내에 JSON 형태로 한 번에 통합 저장됩니다.

---

## 테이블 관계 구조

- 사용자(`user`)는 여러 연습 세션(`run`)을 가집니다. (1:N)
- 각 연습 세션(`run`)은 여러 문장 타이핑 결과(`page`)로 구성됩니다. (1:N)
- 각 문장 타이핑 결과(`page`)는 제시문 정보(`target_text`)를 참조합니다. (N:1)

---

## 테이블 상세 정의

### 1. user (사용자)
서비스를 이용하는 사용자 정보를 저장합니다.

- `id`: 고유 식별값 (UUID, PK)
- `email`: 이메일 주소 (문자열, Unique, Nullable - 소셜 로그인만 사용하는 경우 대비)
- `password`: 암호화된 비밀번호 (문자열, Nullable)
- `nickname`: 화면에 표시될 사용자 닉네임 (문자열, Unique, Not Null)
- `created_at`: 생성 일시 (Timestamp, Not Null)
- `updated_at`: 수정 일시 (Timestamp, Not Null)

### 2. target_text (제시문)
연습용으로 시스템에 등록된 원본 문장 데이터입니다.

- `id`: 고유 식별값 (UUID, PK)
- `content`: 제시문 내용 (문자열, Not Null)
- `language`: 문장의 언어 (예: 'ko', 'en') (문자열, Not Null)
- `created_at`: 생성 일시 (Timestamp, Not Null)

### 3. run (연습 세션)
사용자가 1회 연습을 시작해서 끝낼 때까지의 단위 기록입니다.

- `id`: 고유 식별값 (UUID, PK)
- `user_id`: 사용자 식별값 (UUID, FK, Nullable - 비회원 연습 허용 시)
- `status`: 진행 상태 ('pending', 'in_progress', 'completed') (문자열, Not Null)
- `started_at`: 세션 시작 일시 (Timestamp, Not Null)
- `finished_at`: 세션 완료 일시 (Timestamp, Nullable - 완료되지 않은 세션 대비)
- `cpm`: 세션 전체의 분당 타수 (Integer, Nullable)
- `wpm`: 세션 전체의 분당 단어 수 (Integer, Nullable)
- `accuracy`: 세션 전체의 정확도 퍼센트 (Float, Nullable)
- `created_at`: 생성 일시 (Timestamp, Not Null)

### 4. page (문장 타이핑 결과)
한 세션 내에서 개별 문장을 타이핑한 결과 및 상세 키 로그를 저장합니다.
(프론트엔드에서 한 페이지의 타건이 끝났을 때 1회의 API 호출로 통계와 키 배열 전체를 저장합니다.)

- `id`: 고유 식별값 (UUID, PK)
- `run_id`: 속한 세션 식별값 (UUID, FK, Not Null)
- `target_text_id`: 참조하는 제시문 식별값 (UUID, FK, Not Null)
- `order_index`: 세션 내 진행 순서 (Integer, Not Null)
- `language`: 문장 언어 구분 (문자열, Not Null)
- `typed_text`: 사용자가 최종 입력한 문장 (문자열, Not Null)
- `wpm`: 해당 문장의 분당 단어 수 (Integer, Not Null)
- `cpm`: 해당 문장의 분당 타수 (Integer, Not Null)
- `accuracy`: 해당 문장의 정확도 퍼센트 (Float, Not Null)
- `elapsed_time_ms`: 타이핑 소요 시간 밀리초 (Integer, Not Null)
- `key_events`: 해당 문장을 칠 때 발생한 키 입력 배열 전체 (JSON/JSONB, Not Null)
    - *JSON 내부 구조 예시:*
      `[{ "from_key": "a", "to_key": "b", "key_char": "ㅂ", "latency": 120, "hold_duration_ms": 50, "is_correct": true, "expected_char": null }, ...]`
- `created_at`: 생성 일시 (Timestamp, Not Null)

---

## 주요 지표 계산 논리

### 아키텍처 및 통계 처리 (클라이언트 위임)
1. 실시간 타수(WPM, CPM) 및 정확도 계산, 백스페이스 오타 감지 등의 무거운 실시간 연산은 모두 **프론트엔드(브라우저)에서 처리**합니다.
2. 타건 중에는 서버(네트워크) 통신이 전혀 발생하지 않으며, 사용자가 한 문장(Page) 타이핑을 완료한 직후 **단 1회의 POST 요청**으로 서버에 요약 통계와 키 로그 데이터를 적재합니다.
3. 이를 통해 서버의 API 호출 및 DB 트랜잭션 부하를 극단적으로 줄이고 최상의 반응성을 확보합니다.

### SKDM 모델 데이터 연동
기존 SKDM 엔진은 두 물리 키 사이의 지연 시간 정보(`from_key`, `to_key`, `latency`) 배열을 직접 사용합니다.
- 데이터베이스에 저장된 `page` 테이블의 `key_events` JSON 배열을 꺼내어 곧바로 SKDM 엔진의 입력값으로 던져줄 수 있습니다.
- 별도의 테이블 조인(Join) 과정이 생략되므로 분석 모델로의 데이터 서빙 속도가 매우 빠릅니다.
