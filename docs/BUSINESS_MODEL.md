# TypeDiag 비즈니스 모델 및 단위경제 명세서 (SSOT)

TypeDiag가 **어디서 비용이 발생하고, 어디서 수익을 낼 계획인지**, 그리고 **월간 금액이 어떤 사용량·단가·공식으로 결정되는지**를 정의하는 문서입니다.

관련 구현·계산 정본:

| 영역 | 정본 |
| :--- | :--- |
| Topic Mode (비용 트리거) | [TOPIC_MODE.md](TOPIC_MODE.md), `src/app/api/practice/topic/`, `src/store/typingSlices/createTopicSlice.ts` |
| 세션·DB 쓰기 (비용 트리거) | [DB_SCHEMA.md](DB_SCHEMA.md), `src/services/sessionService.ts`, `POST /api/session` |
| 인증 (Clerk) | [AUTH.md](AUTH.md), `@clerk/nextjs` |
| 단가·월간 합산 공식 | `src/lib/dev/costSimulation.ts`, `src/lib/dev/revenueSimulation.ts`, `src/lib/dev/platformScaling.ts` |
| DB 실측 (KB/page, 코퍼스 규모) | `GET /api/dev/cost-stats` (개발 환경) |

> 수치 검증·시나리오 탐색 UI는 `/dev/cost`에 있으나, **본 문서의 대상은 서비스 경제 구조**입니다.

---

## 1. 비용·수익 한눈에 보기

### 1.1. 비용 항목

| 구분 | 항목 | 과금 방식 | 서비스 내 트리거 |
| :--- | :--- | :--- | :--- |
| 변동 | **OpenAI** | 토큰당 (API 호출) | Topic Mode 런타임 문장 생성 |
| 변동 | **Gemini Batch API** | 토큰당 (배치) | 코퍼스 대량 생성 (`scripts/generate_batch.py`) |
| 변동 | **Upstage `embedding-query`** | 토큰당 (API 호출) | Topic Mode 주제 검색마다 1회 |
| 변동 | **Upstage `embedding-passage`** | 토큰당 (배치) | 코퍼스 임베딩 적재 (`scripts/embedBatch.ts`) |
| 변동 | **Clerk MRU 초과** | MRU당 (Pro만) | Pro 플랜 + MRU > 50,000 |
| 변동 | **DB 스토리지 증가** | 호스팅 플랜·추가 볼륨 | 페이지 완주 시 `pages` + `key_events` 적재 |
| 변동 | **DB 쓰기 부하** | 간접 (티어 상향) | 동일 — `key_events` Hypertable INSERT |
| 고정 | **Cloudflare Pages** | 월 정액 (한계 초과 시) | Next.js SSR·API 라우트 호스팅 |
| 고정 | **DB 호스팅** | 월 정액 (OCI Free → Hetzner) | PostgreSQL + TimescaleDB + pgvector |
| 고정 | **Clerk Pro** | 월 정액 (선택) | 프로덕션 인증 스택 |

### 1.2. 수익 항목

| 항목 | 상태 | 설명 |
| :--- | :--- | :--- |
| **Pro 구독** | **미구현** (BM 설계) | 월 $4.00 (₩6,000 @환율 1,500) — 결제·구독 API 없음 |
| **B2B 좌석** | **미구현** (BM 설계) | 팀/기관 단위 좌석 판매 가정 |
| **기타 수익** | **미구현** | 스폰서십 등 |

현재 코드베이스에는 Stripe·구독 상태·요금제 게이트가 **없습니다**. 수익 공식은 §7의 BM 설계이며, 구현 시 이 문서를 기준으로 맞춥니다.

---

## 2. 사용자 행동 → 비용 발생 경로

### 2.1. 일반 연습 (Topic Mode 외)

타건 중에는 서버 비용이 거의 없습니다. **문장 1개를 끝까지 치고 완주할 때** 비용이 발생합니다.

```
페이지 시작 → POST /api/session { action: "start" }     → DB read/write (run)
타건 완료   → POST /api/session { action: "finish" }    → pages 1행 + key_events N행 bulk insert
```

- 정본: `sessionService.finishPage`, [DB_SCHEMA.md](DB_SCHEMA.md) §주요 지표
- 방향키로 문장 중간 포기 시 해당 page는 **저장하지 않음** (비용 없음)
- Run 분리: 페이지 간 3분 유휴, 문장 내 5분 경과 시 run이 쪼개짐 — 저장 횟수·행 수에는 영향, API 단가에는 없음

**발생 비용:** DB 호스팅(고정) + 스토리지·쓰기 RPS(변동, §5) + Cloudflare SSR/API 호출(§6.1).

### 2.2. Topic Mode

Topic Mode는 **검색(Upstage) + 필요 시 생성(OpenAI)** 이 핵심 변동비입니다.

```
주제 입력 (Enter)
  → POST /api/practice/topic
       → Upstage embedding-query 1회
       → pgvector 검색 (DB CPU, 무료 티어 한계에 포함)

  [유사도 > 0.5 행 없음] → 404
       → POST /api/practice/topic/generate
            → OpenAI chat/completions 1회 (문장 20개 JSON)
            → target_texts INSERT (embedding NULL, 비동기)

  [히트했으나 반환 문장 < 3] → 클라이언트가 추가 generate

세션 중 남은 문장 ≤ 3 → 클라이언트가 추가 generate (풀 리필)
```

정본: `createTopicSlice.ts` — `fetchTopicTarget`, `requestMoreTopicTargets`, `topicNextTarget`.

| 클라이언트 조건 | OpenAI 호출 |
| :--- | :--- |
| 검색 404 | 1회 (검색 직후) |
| 검색 성공 but `data.length < 3` | 1회 추가 |
| `remainingCount <= 3` 이고 풀 < 100 | 세션 중 반복 가능 |
| 풀 ≥ 100 | generate 중단 |

검색 API는 **캐시 히트·미스와 무관하게** Upstage query 1회가 항상 발생합니다.

Topic API는 현재 **무인증** ([API.md](API.md)). Free/Pro 한도는 §7 설계이며 **아직 서버에 없음**.

### 2.3. 코퍼스 임베딩 (운영 비용)

`insertTopicGeneratedTargets`는 **embedding 없이** 행만 저장합니다. 벡터 검색에 쓰이려면 별도 배치가 필요합니다.

- 스크립트: `scripts/embedBatch.ts`
- 모델: Upstage `embedding-passage`, 최대 50문장/요청
- 대상: `target_texts` 중 `embedding IS NULL`인 행

초기 시드·Topic 런타임 생성분이 쌓일 때마다 운영자가 배치를 돌리는 **간헐적 변동비**입니다. 사용자 1명의 검색 1회와는 별개입니다.

---

## 3. 변동비 상세 — API

### 3.1. OpenAI (Topic 문장 생성)

**호출 위치:** `src/lib/api/topicGenerateOpenAI.ts` → `POST /api/practice/topic/generate`

| 항목 | 값 |
| :--- | :--- |
| 모델 | `gpt-4.1-nano` (고정) |
| 생성량 | JSON `sentences` 배열 **정확히 20개** (`max_tokens: 4000`) |
| 재시도 | 429/503 시 동일 모델로 최대 4회 backoff (`TOPIC_GENERATE_RETRY_DELAYS_MS`: 2.5s, 5s, 8s, 12s) |

**공식 단가 (USD / 1M tokens)** — `OPENAI_PRICING`:

| 모델 | Input | Output |
| :--- | :--- | :--- |
| `gpt-4.1-nano` | $0.10 | $0.40 |

> Topic 생성은 input ~400 tok·text-only 기준으로 위 단가를 적용합니다.

**1회 호출 비용:**

$$
C_{openai} = m_{retry} \times \left( \frac{T_{in}}{10^6} P_{in} + \frac{T_{out}}{10^6} P_{out} \right)
$$

- $m_{retry}$: 재시도 반영 계수 (계획값 **1.08**, 동일 모델 최대 5회 시도 기준)
- $T_{in}, T_{out}$: input/output 토큰 수
- $P_{in}, P_{out}$: 선택 모델 단가

**토큰 수 추정 (`estimateTopicLlmTokens`):**

프롬프트 정본 `src/lib/practice/prompts.json` + `topicGenerateOpenAI.ts`와 동일하게 구성합니다.

| 스크립트 | 토큰화 휴리스틱 |
| :--- | :--- |
| Latin (`a-zA-Z0-9`) | 4자당 1토큰 |
| Hangul | 1자당 0.62토큰 |
| 기타 | 4자당 1토큰 |

- Input: `system_instruction` + user template (주제·숫자 포함 여부에 따라 min~max)
- Output: 20문장 JSON 직렬화 (한글 문장 ~80자×20)
- SSOT 추정치: input 약 **350~400** tokens, output **1,100+** tokens (단위 테스트 기준)

**월간 OpenAI 비용:**

$$
C_{openai,mo} = N_{generate} \times C_{openai}
$$

$N_{generate}$ = 월간 `POST /topic/generate` 성공 호출 수. Topic 세션 비율·코퍼스 히트율·풀 리필에 따라 달라지며, §4.2의 호출 모델로 추정합니다.

### 3.2. Upstage `embedding-query` (주제 검색)

**호출 위치:** `src/app/api/practice/topic/route.ts` — 검색 요청마다 1회.

| 항목 | 값 |
| :--- | :--- |
| 모델 | `embedding-query` (4096차원) |
| 환경 변수 | `UPSTAGE_API_KEY` |
| 유사도 임계 | `> 0.5` (코사인) |
| 반환 상한 | 100행 (`.limit(100)`) |

**단가:** **$0.10 / 1M tokens** (`DEFAULT_UPSTAGE_USD_PER_M`, `costSimulation.ts` — 2026 Upstage 공개 요금 반영).

주제 문자열 1건 ≈ **5 tokens** (계획 추정).

$$
C_{query,mo} = \frac{N_{search} \times T_{query}}{10^6} \times 0.10
$$

$N_{search}$ = 월간 `POST /api/practice/topic` 호출 수 (= Topic Mode에서 주제 검색을 시도한 횟수).

### 3.3. Upstage `embedding-passage` (코퍼스 배치)

**호출 위치:** `scripts/embedBatch.ts` (운영 배치, 사용자 요청 경로 아님).

| 항목 | 값 |
| :--- | :--- |
| 모델 | `embedding-passage` |
| 배치 크기 | 최대 50문장/HTTP 요청 |

$$
C_{passage,mo} \approx \frac{N_{new\_sentences} \times T_{passage}}{10^6} \times 0.10
$$

- $N_{new\_sentences}$: 해당 월에 embedding이 필요해진 신규 `target_texts` 행 수
- LLM(OpenAI 또는 Gemini) 1회 생성 → 20행 적재 → 배치 1회분 passage 토큰 ≈ 20문장 join 기준 추정

Topic 런타임 생성 직후에는 embedding이 NULL이므로, **배치 전까지는 동일 주제 재검색이 404 → OpenAI를 다시 탈 수 있음**. 코퍼스 운영 주기가 런타임 API 비용에 간접 영향을 줍니다.

### 3.4. Gemini Batch API (코퍼스 문장 생성)

**호출 위치:** `scripts/generate_batch.py` (운영 배치, 사용자 요청 경로 아님).

| 항목 | 값 |
| :--- | :--- |
| 모델 | `gemini-3.1-flash-lite` |
| 생성량 | JSON `content` (주제당 20문장) |
| 과금 방식 | Batch API (표준 단가의 50% 할인) |

사전 코퍼스 확보를 위한 일회성 또는 주기적 배치 작업 비용입니다.

---

## 4. 변동비 상세 — 사용량 모델 (MAU → API·DB 호출 수)

아래는 **계획·추정에 쓰는 기본 가정**입니다. 실측은 DB·로그로 대체합니다.

### 4.1. 공통 활동 가정

| 기호 | 의미 | 기본값 |
| :--- | :--- | :--- |
| $M$ | MAU | — |
| $S$ | MAU당 월 세션 수 | 10 |
| $P$ | 세션당 완주 page 수 | 30 |
| $r_t$ | Topic Mode 세션 비율 | 0.3 |
| $q$ | Topic 세션당 주제 검색 횟수 | 1.2 |

$$
\begin{aligned}
\text{pages/MAU/월} &= S \times P \\
\text{topicSessions/MAU/월} &= S \times r_t \\
N_{search} &= M \times S \times r_t \times q
\end{aligned}
$$

### 4.2. OpenAI 월 호출 수 추정

코퍼스 히트율 $h$ (§4.3), 검색당 평균 생성 횟수 $\bar{g}$ (풀 리필 로직, `estimateAvgGeneratesPerSearch`):

$$
N_{generate} = N_{search} \times \bar{g}
$$

풀 동작 상수 (클라이언트 SSOT):

| 상수 | 값 |
| :--- | :--- |
| 최소 usable 풀 | 3문장 |
| 리필 임계 (`remainingCount`) | ≤ 3 |
| 1회 생성 문장 수 | 20 |
| 클라이언트 풀 상한 | 100 |

batch 코퍼스는 주제당 문장 1개인 경우가 많아, **히트해도 $\bar{g} > 0$** 인 “얇은 히트”가 발생합니다.

### 4.3. 코퍼스 히트율

벡터 검색이 1건 이상 반환할 확률 $h$:

**코퍼스 기반 추정** (`estimateCacheHitRate`):

$$
\begin{aligned}
T_{eff} &= \left\lfloor \frac{N_{corpus}}{sentencesPerTopic} \right\rfloor \\
h_{novel} &= \min\left(0.98,\ \frac{T_{eff} \times b}{Q}\right) \\
h_{repeat} &= \min\left(0.99,\ h_{novel} + (1-h_{novel}) \times 0.85\right) \\
h &= \rho \cdot h_{repeat} + (1-\rho) \cdot h_{novel}
\end{aligned}
$$

| 기호 | 의미 | 기본값 |
| :--- | :--- | :--- |
| $N_{corpus}$ | `embedding IS NOT NULL` 행 수 | 10,000 |
| $sentencesPerTopic$ | 주제당 코퍼스 문장 | 1 |
| $Q$ | 주제 검색 공간 (distinct 주제 추정) | 100,000 |
| $b$ | 유사 주제 보정 (paraphrase) | 1.8 |
| $\rho$ | 동일 주제 재검색 비율 | 0.25 |

실측: `GET /api/dev/cost-stats` → `embedded`, `distinctTopics`.

### 4.4. BM 설계 — Free tier가 API 비용에 미치는 영향 (미구현)

유료화 도입 시 의도된 한도 (서버 미적용). `/dev/cost` 시뮬은 기본적으로 이 한도를 **모델링**합니다 (`applyFreeTierCaps`).

| 한도 | 값 |
| :--- | :--- |
| 무료 MAU 주제 검색 | 30회/MAU/월 |
| 무료 MAU OpenAI 생성 | 5회/MAU/월 |
| Pro | 한도 해제 |

**시뮬 기본 가정** (`DEFAULT_COST_SIMULATION`):

| 파라미터 | 기본값 | 의미 |
| :--- | :--- | :--- |
| `freeTierSearchShare` | **0.9** | MAU 중 무료 한도 적용 비율 (나머지 10% = Pro/무제한) |
| `freeTopicSearchCapPerMauMonth` | 30 | 무료 MAU 1인당 월 검색 상한 |
| `freeOpenAiCapPerMauMonth` | 5 | 무료 MAU 1인당 월 OpenAI 상한 |

**캡 적용 순서** (`applyFreeTierCaps` — 검색·생성은 **독립** 상한):

$$
\begin{aligned}
M_{free} &= M \times \text{freeTierSearchShare} \\
D_{search} &= N_{search} \times \text{freeTierSearchShare} \\
N_{search,free} &= \min(D_{search},\ M_{free} \times 30) \\
N_{search,pro} &= N_{search} \times (1 - \text{freeTierSearchShare}) \\
D_{openai,free} &= N_{search,free} \times \bar{g} \\
N_{generate,free} &= \min(D_{openai,free},\ M_{free} \times 5) \\
N_{generate,pro} &= N_{search,pro} \times \bar{g} \\
N_{generate} &= N_{generate,free} + N_{generate,pro}
\end{aligned}
$$

- $N_{search}$: 캡 적용 전 월간 `POST /api/practice/topic` 수 (= $M \times S \times r_t \times q$)
- $\bar{g}$: `estimateAvgGeneratesPerSearch` — 코퍼스 히트율·풀 리필 반영
- Upstage query 호출 수 = $N_{search,free} + N_{search,pro}$ (검색 캡 후)
- 차단된 무료 OpenAI = \max(0,\ D_{openai,free} - N_{generate,free})$

캡은 **Topic 세션 비율이 아닌 전체 무료 MAU 풀**에 적용됩니다. Pro 사용자 비율(`1 - freeTierSearchShare`)이 높을수록 변동비 상승.

---

## 5. 변동비 상세 — 데이터베이스

### 5.1. 무엇이 쌓이는가

| 테이블 | 내용 | 비용 성격 |
| :--- | :--- | :--- |
| `pages` | 문장 완주 요약 1행 | 스토리지 + 쓰기 |
| `key_events` | 키 입력 이벤트 (Hypertable) | **대부분의 행 수·RPS** |
| `runs` | 세션 메타 | 소량 |
| `target_texts` | 연습 문장·임베딩 (코퍼스) | Topic 캐시, 배치 임베딩 |

세션 데이터만 용량 추정에 사용 (코퍼스 제외):

$$
K_{page} = \frac{size(pages) + size(key\_events) + size(runs)}{pageCount \times 1024}\ \text{(KB)}
$$

실측: `cost-stats` → `usage.kbPerPageEstimate`. 기본 계획값 **25 KB/page**.

### 5.2. 월 스토리지 증분

$$
\Delta GB_{mo} = \frac{M \times S \times P \times K_{page}}{1024 \times 1024}
$$

예: $M=10{,}000, S=10, P=30, K_{page}=25$ → **약 2.86 GB/월**.

전체 DB 크기는 코퍼스·인덱스·WAL을 포함하므로 $\Delta GB_{mo}$보다 큽니다. OCI cap(200GB) 비교에는 `pg_database_size` 사용.

### 5.3. 평균 쓰기 RPS

페이지 완주 시 `key_events`를 한 번에 bulk insert합니다.

$$
RPS_{write} = \frac{M \times S \times P \times E_{key}}{30 \times 24 \times 3600}
$$

$E_{key}$: page당 key_event 수 (기본 **40**). 실측: `key_event_count / page_count`.

이 값이 OCI ARM Free 한계(**100 RPS** 계획치)를 넘으면 Hetzner 이전 검토 대상입니다. 피크는 평균보다 높을 수 있으나 본 명세는 **평균** 기준입니다.

---

## 6. 고정비 상세 — 인프라

배포 아키텍처 정본: `src/lib/dev/platformScaling.ts` (`ORACLE_FREE_TIER`, `CLOUDFLARE_PAGES`, `HETZNER_VPS`).

### 6.1. Frontend — Cloudflare Pages

Next.js App Router + API Routes (Edge/SSR).

| 단계 | 조건 | 비용 |
| :--- | :--- | :--- |
| Free | 일 SSR ≤ 100,000 **且** MAU ≤ 10,000 | $0 |
| Paid | 일 SSR > 100,000 **或** MAU > 10,000 | **$5/월** (플랜 업그레이드만, 코드 변경 없음) |

**일 SSR 추정:**

$$
SSR_{day} = \frac{M \times S \times P}{30} \times V_{ssr}
$$

$V_{ssr}$: page view당 SSR/API 호출 가중 (기본 **1.5** — 라우팅·세션 API 포함 추정).

### 6.2. Backend & DB — OCI Always Free → Hetzner Cloud

**1단계: OCI Always Free (ARM VM + Docker TimescaleDB)**

| 리소스 | 한도 |
| :--- | :--- |
| Compute | 2 OCPU / 12 GB RAM |
| 스토리지 | 200 GB |
| 아웃바운드 | 10 TB/월 (초과 과금은 본 명세 미포함) |
| 비용 | **$0** |

**OCI 이전 트리거** (하나라도 해당):

| 조건 | 임계 |
| :--- | :--- |
| MAU | > 20,000 |
| 평균 쓰기 RPS | > 100 |
| DB baseline | ≥ 200 GB |
| cap 소진 | 월 증분 기준 1개월 내 200 GB 도달 |

**2단계: Hetzner Cloud VPS** (DB만 이전, `pg_dump` → 복원 → `DATABASE_URL` 변경)

| 티어 | vCPU | RAM | SSD | 월 비용 | auto 선택 조건 |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **CX23** (Shared) | 2 | 4 GB | 40 GB | ₩7,000 | RPS ≤ 50 **且** MAU ≤ 10k |
| **CCX23** (Dedicated) | 4 | 16 GB | 160 GB | ₩38,000 | RPS ≤ 300 **且** MAU ≤ 100k |
| **CCX33** (Dedicated) | 8 | 32 GB | 240 GB | ₩84,000 | 그 이상 |

티어 기본 SSD를 초과하는 baseline에는 추가 볼륨:

$$
C_{volume} = \max(0,\ baseline_{GB} - SSD_{tier}) \times ₩70/GB
$$

(€0.044/GB 환산, `volumePriceKrwPerGb`)

### 6.3. 인증 — Clerk

정본 요금 (2026-02 [Clerk pricing](https://clerk.com/pricing), [changelog](https://clerk.com/changelog/2026-02-05-new-plans-more-value)):

| 플랜 | 고정 | 포함 MRU | 초과 |
| :--- | :--- | :--- | :--- |
| **Hobby** (현재 가정) | $0 | **50,000** / 앱 | **없음** — 초과 시 Pro 업그레이드 필요 |
| **Pro** (성장 시) | $25/월 ($20 연간) | 50,000 | $0.02/MRU (50,001–100,000 구간, 볼륨 할인 별도) |

- **MRU**(Monthly Retained User): 가입 후 **최소 1일 경과 뒤** 해당 월에 재방문한 사용자. 단순 MAU·가입 수와 다름.
- Hobby는 50,000 MRU까지 **무료 포함**이며, 초과분에 대한 종량 과금은 **없음** (한도 초과 시 Pro 전환).
- Pro만 $ \max(0,\ \text{MRU} - 50{,}000) \times \$0.02 $ 초과 과금.

$$
MRU = round(M \times loginRate \times mruConversionRate)
$$

- `loginRate`: MAU 중 로그인 비율 (계획 **0.4** — 게스트 히스토리 미저장 가정)
- `mruConversionRate`: 로그인 사용자 중 MRU로 집계되는 비율 (계획 **0.5**)
- 시뮬: `useClerkPro: false` → Hobby ($0, overage $0). `useClerkPro: true` → Pro $25 + 초과 MRU 과금.

게스트 사용자(`guest_<uuid>`)는 Clerk MRU에 포함되지 않습니다 ([AUTH.md](AUTH.md)).

---

## 7. 수익 모델 (BM 설계 — 미구현)

결제·구독 코드는 없습니다. 아래는 **목표 BM**이며 MRR 산식의 정본은 `revenueSimulation.ts`입니다.

### 7.1. Pro 구독

| 항목 | 값 |
| :--- | :--- |
| 월 가격 | **$4.00** (₩6,000 @환율 1,500) |
| 전환 기준 | 로그인 사용자 중 Pro 결제 (기본 가정) |
| 로그인 비율 | MAU의 40% |
| 유료 전환율 | 로그인 풀의 2% |
| 연간 플랜 | 전체 유료의 20%, 연 17% 할인 (≈2개월 무료) |

**전환 풀·구독자:**

$$
\begin{aligned}
Pool &= round(M \times loginRate) \\
N_{pay} &= round(Pool \times conversionRate)
\end{aligned}
$$

**블렌디드 ARPU:**

$$
ARPU = (1-\alpha) \times P_{mo} + \alpha \times P_{mo} \times (1 - d_{annual})
$$

- $\alpha$: 연간 플랜 비율 (0.2)
- $P_{mo}$: $4.00 (₩6,000)
- $d_{annual}$: 0.17

**구독 MRR:**

$$
MRR_{sub} = N_{pay} \times ARPU
$$

### 7.2. B2B·기타

$$
MRR_{b2b} = N_{seats} \times P_{seat}
$$

기본 가정: 좌석 0, 좌석가 $15/월. 기타 수익 $0/월.

### 7.3. 결제 수수료 (Stripe 가정)

$$
Fee = N_{charges} \times \$0.30 + MRR_{gross} \times 2.9\%
$$

- $N_{charges} = N_{pay} + N_{seats}$
- $MRR_{gross} = MRR_{sub} + MRR_{b2b} + other$

**순수익 (Revenue):**

$$
MRR_{net} = \max(0,\ MRR_{gross} - Fee)
$$

### 7.4. Free vs Pro — 제품 차별 (설계)

| | Free / 게스트 | Pro |
| :--- | :--- | :--- |
| Topic 검색 | 30회/MAU/월 (설계) | 무제한 |
| OpenAI 생성 | 5회/MAU/월 (설계) | 무제한 |
| SKDM 히스토리 | 제한 (설계) | 무제한 |

한도 초과 시 `402 Payment Required` + 구독 유도 — **API 미구현**. `parseTopicRequest`는 주제 검증만 수행.

---

## 8. 월간 손익·단위경제

### 8.1. 월간 비용 합계

$$
\begin{aligned}
C_{fixed} &= C_{cloudflare} + C_{db\_host} + C_{clerk\_base} \\
C_{variable} &= C_{openai} + C_{upstage\_query} + C_{upstage\_passage} + C_{clerk\_overage} \\
C_{total} &= C_{fixed} + C_{variable}
\end{aligned}
$$

`db-disk` 증분은 호스팅 플랜·추가 볼륨에 이미 반영되거나 OCI cap 모니터링용이며, 별도 USD line item은 $0입니다.

### 8.2. 월간 손익

$$
Profit = MRR_{net} - C_{total}
$$

$$
Profit/MAU = \frac{Profit}{M}
$$

$$
Margin = \frac{Profit}{MRR_{net}} \quad (MRR_{net} > 0)
$$

### 8.3. 손익분기 MAU

고정비 $F = C_{fixed}$, MAU당 변동비 $v = C_{variable}/M$, MAU당 순수익 $r = MRR_{net}/M$:

$$
M_{BE} = \left\lceil \frac{F}{r - v} \right\rceil \quad \text{when } r > v \text{ and } F > 0
$$

---

## 9. 비용·수익이 결정되는 요인 요약

| 비용이 커지는 조건 | 이유 |
| :--- | :--- |
| Topic Mode 이용 비율 ↑ | Upstage query·OpenAI 호출 증가 |
| 코퍼스 작음 / 배치 임베딩 지연 | 캐시 미스·얇은 히트 → OpenAI 반복 |
| MAU·세션·완주 page ↑ | DB 증분·RPS·SSR 증가 |
| 로그인 MAU ↑ (Clerk Pro 사용 시) | MRU 초과 과금 |
| OCI 한계 초과 | Hetzner 티어·추가 볼륨 비용 |

| 수익이 커지는 조건 | 이유 |
| :--- | :--- |
| 로그인·유료 전환율 ↑ | $N_{pay}$ 증가 |
| 연간 플랜 비율 ↓ | 블렌디드 ARPU ↑ (할인 감소) |
| B2B 좌석 판매 | $MRR_{b2b}$ 증가 |

---

## 10. 검증·실측

| 측정치 | 방법 |
| :--- | :--- |
| KB/page | `pg_total_relation_size(pages+key_events+runs) / count(pages)` |
| 코퍼스 규모 | `count(*) filter (embedding is not null)` from `target_texts` |
| DB 전체 크기 | `pg_database_size` |
| OpenAI·Upstage 호출 수 | 프로덕션: API 로그·벤더 대시보드 (코드 미집계) |
| 단가 | OpenAI·Upstage·Clerk·Cloudflare·Hetzner 청구서 |

개발 DB 스냅샷: `GET /api/dev/cost-stats` (`NODE_ENV=development`).

단위 테스트로 공식 고정: `npm run test -- src/lib/dev/`

---

## 11. 대규모 스케일 검증 예시 (MAU 500,000)

`DEFAULT_COST_SIMULATION` + `DEFAULT_REVENUE_SIMULATION` (`mau=500_000`, `dbDiskBaselineGb=3000` 기준) 시뮬레이션 결과 예시입니다.

### 11.1. 주요 리소스 예측치
* **월 완료 페이지 수**: $500,000 \times 10 \text{ (세션/월)} \times 30 \text{ (페이지/세션)} = 150,000,000\text{회}$
* **월 DB 용량 증가량**: $1.5\text{억} \times 25\text{ KB} / (1024 \times 1024) \approx \mathbf{3.57\text{ GB / 월}}$ (누적 볼륨 누적 과금 대상)
* **평균 쓰기 RPS**: 약 **2,314.8 RPS** (피크 RPS 1만~2.5만 돌파 예상)

### 11.2. DB 비용 산출 상세
* **DB 호스팅 요금**: OCI Free 및 CX23/CCX23 한계를 대폭 초과하므로 **Hetzner CCX33 (Dedicated)** 티어 자동 선택 (월 ₩84,000 $\approx$ **$60.00**)
* **DB 추가 볼륨 요금**: 3TB baseline 기준, 기본 SSD 240GB 초과 용량인 2,760GB에 대해 GB당 $0.05 과금 $\approx$ **$138.00** (₩193,200)
* **최종 월 DB 인프라 비용**: **$198.00/mo (약 ₩277,200)**

> [!NOTE]
> 단순 고정형 VPS 비용 모델을 사용할 때보다 **약 20배 이상** 비용이 현실적으로 늘어났으며, 대규모 트래픽 시 DB 디스크 증가율에 비례한 스토리지 비용의 누적 합산이 단위 경제(Unit Economics) 손익분기 분석에 올바르게 연동됩니다.

---

## 12. 관련 문서

- [TOPIC_MODE.md](TOPIC_MODE.md) — Topic 파이프라인·캐시
- [API.md](API.md) — Topic·Session API 계약
- [DB_SCHEMA.md](DB_SCHEMA.md) — `key_events` Hypertable·세션 생명주기
- [AUTH.md](AUTH.md) — Clerk·게스트
