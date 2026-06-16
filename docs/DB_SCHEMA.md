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
- `started_at`: 문장 입력 시작 일시 (Timestamp, Not Null)
- `finished_at`: 문장 입력 완료 일시 (Timestamp, Not Null)
- `elapsed_time_ms`: 타이핑 소요 시간 밀리초 (Integer, Not Null)
- `key_events`: 해당 문장을 칠 때 발생한 키 입력 배열 전체 (JSON/JSONB, Not Null)
  - _JSON 내부 구조 예시:_
    `[{ "from_key": null, "to_key": "a", "key_char": "ㅁ", "latency": 0, "hold_duration_ms": 50, "is_correct": true, "expected_char": null }, { "from_key": "a", "to_key": "b", "key_char": "ㅂ", "latency": 120, "hold_duration_ms": 50, "is_correct": true, "expected_char": null }, ...]`
  - _필드 세부 설명:_
    - `from_key`: 이전 입력 키값 (문자열, Nullable). **문장의 첫 번째 키 입력일 경우 이전 키가 없으므로 `null`로 저장합니다.**
    - `to_key`: 현재 입력 키값 (문자열, Not Null)
    - `latency`: 이전 키 입력 완료 후 현재 키 입력 시점까지의 지연시간 ms (Integer, Not Null. 첫 입력의 경우 `0` 또는 타이핑 시작 대기 시간)
  - _기록 대상 키 명세 (from_key / to_key 저장 값):_
    - 알파열: a ~ z, A ~ Z
    - 쉼표: ,
    - 마침표: .
    - 스페이스바: space
    - 백스페이스: backspace
    - 엔터: enter
    - 시프트: shift_l (좌), shift_r (우) 로 구분하여 기록
- `created_at`: 생성 일시 (Timestamp, Not Null)

---

## 주요 지표 계산 논리

### 아키텍처 및 통계 처리 (클라이언트 위임)

1. 실시간 타수(WPM, CPM) 및 정확도 계산, 백스페이스 오타 감지 등의 무거운 실시간 연산은 모두 프론트엔드(브라우저)에서 처리합니다.
2. 타건 중에는 서버(네트워크) 통신이 전혀 발생하지 않으며, 사용자가 한 문장(Page) 타이핑을 완료한 직후 단 1회의 POST 요청으로 서버에 요약 통계와 키 로그 데이터를 적재합니다.
3. 이를 통해 서버의 API 호출 및 DB 트랜잭션 부하를 극단적으로 줄이고 최상의 반응성을 확보합니다.

### SKDM 모델 데이터 연동

기존 SKDM 엔진은 두 물리 키 사이의 지연 시간 정보(`from_key`, `to_key`, `latency`) 배열을 직접 사용합니다.

- 데이터베이스에 저장된 `page` 테이블의 `key_events` JSON 배열을 꺼내어 곧바로 SKDM 엔진의 입력값으로 던져줄 수 있습니다.
- 별도의 테이블 조인(Join) 과정이 생략되므로 분석 모델로의 데이터 서빙 속도가 매우 빠릅니다.

---

## 연습 세션(Run) 및 문장(Page) 저장/타임아웃 처리 로직

브라우저 종료나 탭 닫기 이벤트를 완벽하게 감지하기 어려운 웹 환경의 한계를 극복하기 위해, 시간 경과(Timeout)와 로컬 스토리지 초기화를 기반으로 세션(Run) 상태를 관리합니다.

### 1. 방향키 및 스킵 처리

- 오른쪽 방향키 (스킵): 문장 입력을 포기하고 넘기므로, 서버에 page 객체를 생성하지 않고 버립니다(Drop).
- 왼쪽 방향키 (이전 문장): 동일한 문장을 다시 연습하는 새로운 시도로 간주합니다. 기존 기록을 덮어쓰지 않고, order_index를 다음 숫자로 증가시켜 새로운 page 객체로 누적 저장합니다.

### 2. 앱(페이지) 접속 시 초기화

- 사용자가 진입(onMount)할 때, 로컬 스토리지에 처리되지 않고 남아있는 임시 데이터(안 끝난 page 등)를 검사합니다.
- 마지막 입력으로부터 5분이 경과했다면: 미완성된 로컬 page 데이터는 삭제하고, 서버(또는 임시 로컬 DB)에 해당 run을 completed로 업데이트하는 동기화 API를 호출합니다.
- 5분 이내라면: run의 상태를 in_progress로 유지합니다 (미완성 page는 삭제).

### 3. 첫 키 입력 시 (타이핑 시작)

- 최근 Run이 pending인 경우: 해당 run을 삭제하거나 새로 만들지 않고, started_at을 현재 시점으로 덮어쓴 뒤 in_progress로 상태를 업데이트하여 재사용합니다.
- 최근 Run이 in_progress이고 마지막 page 종료 후 5분이 지났을 경우:
  - 이전 run의 상태를 completed로 닫습니다 (종료 시간은 마지막 page 완료 시간).
  - 새로운 pending 상태의 run을 생성한 뒤, 이번 입력의 시작 시점으로 업데이트하며 in_progress로 전환합니다.
- 정상적인 경우 (5분 이내): 현재 in_progress인 run에 계속 이어서 진행합니다.

### 4. 유휴 시간(Idle Time) 및 이상치(Outlier) 처리

사용자가 타이핑 도중 오랜 시간(예: 10분) 자리를 비웠다가 다시 이어서 완성하는 경우의 데이터 무결성 처리 방안입니다.

- 원본 데이터 보존: typed_text가 완성되었다면, 그사이의 공백 시간이 얼마든 간에 key_events 배열은 절대 잘라내지 않고 처음부터 끝까지 온전하게 저장(Raw Data 유지)합니다. 이는 SKDM 엔진 분석 및 target_text_id 기반 정확도 계산의 무결성을 지키기 위함입니다.
- 통계(WPM/CPM) 보정: elapsed_time_ms를 구할 때 단순히 마지막시간 - 처음시간으로 구하지 않습니다. 대신 key_events 배열 내의 모든 latency를 합산하여 구하되, 비정상적으로 큰 이상치(Outlier) latency는 나머지 정상 latency들의 평균값으로 대체한 후 합산합니다. 이를 통해 공백 시간에 영향을 받지 않는 정확한 WPM/CPM을 도출할 수 있습니다.
- Run 분리: 문장을 완성하여 page를 저장할 때 중간에 긴 공백이 존재했다면, 이전 run은 completed로 닫고 새로운 run을 생성하여 완성된 이 page를 해당 새 run에 귀속시킵니다.
