# TypeDiag: Hardcore Mode 명세서

이 문서는 **TypeDiag**의 4가지 연습 모드 중, 핵심 훈련 모드인 **하드코어 모드 (Hardcore Mode)**의 아키텍처와 **MLP Language Model(다층 퍼셉트론 언어 모델)**의 기술적 로직을 다룹니다.

## 1. Hardcore Mode 개요

하드코어 모드의 궁극적인 목표는 **"한글 조합 정합성을 100% 만족하면서도, 사용자가 가장 오타를 잘 내고 리듬이 지연되는 희귀 자모 순서쌍(Rare Sequence)을 생성해 내는 것"**입니다.
단순히 어려운 단어를 보여주는 것이 아니라, 사용자의 실시간 타건 데이터를 바탕으로 가장 취약한 키 배열을 집중적으로 공략하는 문장을 실시간 추론합니다.

---

## 2. 웹 브라우저 구동 제약 극복 방안 (Pre-trained + Blending)

웹 브라우저의 한계로 인해 수만 건의 훈련 데이터를 클라이언트 측에서 실시간 Backpropagation(역전파)으로 학습시키는 것은 불가능에 가깝습니다. 
이를 해결하기 위해 다음과 같은 대안적 아키텍처를 채택했습니다:

- **Pre-trained Weights**: 오프라인 환경에서 대용량 한국어 말뭉치로 사전 학습된 가중치 JSON(`hardcore_weights.json`)을 브라우저에 서빙합니다.
- **Dynamic Blending**: 추론 시점에 **사용자의 실시간 취약 키 점수를 로짓 레벨에서 블렌딩(Blending)**하여, 개인화된 텍스트 생성을 달성합니다.

---

## 3. MLP 신경망 아키텍처 및 순전파 (Forward Pass)

추론의 안정성을 확보하기 위해, 입력 윈도우 크기는 동일하게 **직전 6글자(Context = 6)**로 한정합니다.

```
[직전 6개 글자 ID] ──► Embedding Lookup ──► Flatten (96차원)
                                              │
                                              ▼
                                      Hidden Layer (64차원, ReLU)
                                              │
                                              ▼
                                      Output Logits (V차원 어휘사전 크기)
```

1. **임베딩 테이블 조회 (Embedding Lookup)**:
   입력된 6글자 ID 각각을 $16$차원의 조밀 벡터로 변환합니다.
2. **직렬화 (Flatten)**:
   6개의 임베딩 벡터를 일렬로 이어 붙여 **$96$차원(6 \times 16)**의 1차원 입력 벡터 **x**를 형성합니다.
3. **은닉층 연산 (Hidden Layer with ReLU)**:
   가중치와 편향을 연산한 뒤, 음수 값을 0으로 깎는 ReLU 활성화 함수를 통과시켜 64차원 벡터를 도출합니다.
4. **출력 로짓 도출 (Output Logits)**:
   은닉 벡터에 가중치와 편향을 행렬 곱하여 어휘 사전 크기 V와 같은 차원의 로짓 배열(Logits)을 출력합니다.

---

## 4. 추론 가공 파이프라인 (Inference Post-Processing)

도출된 로짓 배열에서 최종 다음 한글 글자를 샘플링하기 전, 예측 불가능하고 어려운 문장을 유도하기 위해 특수 제어 필터를 거칩니다.

### 4.1. Logit Inversion (로짓 반전)
모델이 정상적인 언어 모델 형태로 구한 로짓 값 전체에 -1을 곱해 부호를 바꿉니다. 이를 통해 **평범하게 다음에 올 정상 글자들의 확률을 최소로 깎고, 비보편적이고 희귀한 자모 전이 패턴의 점수를 최상위**로 끌어올립니다.

### 4.2. Static Biases (정적 보정)
물리적으로 입력하기 너무 기괴하거나 타건 리듬을 깨는 특정 문자들에 패널티를 부여합니다:
- Shift 조합 자음(ㅃ, ㅉ, ㄸ, ㄲ, ㅆ)에 `-10.0` 바이어스 감쇄 (뇌절 입력 억제).
- 쌍모음(ㅒ, ㅖ)에 `-15.0`, 문장 부호(`,`, `.`, `?`, `!`)에 `-18.0` 감쇄.
- 단어 간의 경계를 자연스럽게 짓기 위해 스페이스바 ID에는 `+13.0`의 보정 가중치 추가.

### 4.3. User Weak Keys Blending (취약 키 융합)
사용자의 최근 타건 통계(SKDM 기반)에서 분석된 취약 키들의 로짓에 `+5.0`의 동적 부스트를 제공합니다. 약한 키가 한글 쌍자음/쌍모음일 경우 이에 대응하는 QWERTY 대문자(영어 물리 입력 형태)로 치환해 연산을 매치시킵니다.

### 4.4. Rule-based Masking (규칙 기반 마스킹)
한글 조합이 물리적/논리적으로 불가능한 자모 나열을 막기 위해, 부적합한 후보 글자 ID의 로짓 점수를 음의 무한대로 강제 클리핑(Masking)합니다.
- **마스킹 규칙**: 연속 2개 공백 금지, 문장 부호 바로 뒤 공백 의존성 강제, 한글 정합성 검사(`isValidHangulSequence`) 불합격 자모 차단, 문장의 맨 끝 글자가 미완성 자음으로 끝나는 것 차단 등.

### 4.5. Symmetric Log-Transform (스케일 정규화)
극단적으로 치우친 로짓 분포로 인해 동일 자모가 도돌이표처럼 반복 생성되는 루프를 예방하기 위해, 부호를 보존하는 대칭 로그 변환을 적용해 확률을 부드럽게 고르게 폅니다.

### 4.6. Softmax & Sampling (샘플링)
최종 로짓 배열을 필터 파라미터(`Temperature = 2.0`, `Top-K = 40`, `Top-P = 0.9`)에 통과시켜 Softmax 확률로 환산한 후, 누적 랜덤 샘플링을 실시해 최종 자모를 선정합니다.

---

## 5. 오프라인 학습 파이프라인 (Offline Training Pipeline)

하드코어 모드에서 사용하는 사전 학습 가중치(`hardcore_weights.json`)는 오프라인 환경에서 대용량 한국어 말뭉치 데이터를 기반으로 사전에 학습하여 생성됩니다. 이 과정은 [train_hardcore.py](file:///Users/kutor/Documents/Projects_Kutor/typediag/scripts/train_hardcore.py) 스크립트에 의해 수행됩니다.

### 5.1. 학습 데이터 전처리
1. **QWERTY 자모 변환**: 
   - `src/data/targets.json`에 저장된 한글 문장을 영문 물리 자판 좌표 형태로 매핑합니다.
   - 초성, 중성, 종성 맵 및 단일 자모 맵을 이용하여 한글 글자를 개별 QWERTY 입력 문자열(예: `ㄱ` $\rightarrow$ `r`, `ㅏ` $\rightarrow$ `k`, `ㄵ` $\rightarrow$ `sw` 등)로 분해합니다.
2. **슬라이딩 윈도우 데이터셋 구축**:
   - 변환된 QWERTY 문자열을 `hardcore_vocab_helper`의 어휘 사전 ID 리스트로 변환합니다.
   - `context_size = 6` 설정을 사용하여 직전 6개의 자모 ID 배열을 입력($X$)으로, 그 바로 다음 자모 ID를 타겟($y$)으로 하는 데이터셋을 생성합니다.

### 5.2. 신경망 모델 구조 및 역전파
- **Pure NumPy MLP**: 외부 딥러닝 프레임워크(PyTorch, TensorFlow 등) 없이 오직 **NumPy**만을 사용하여 다층 퍼셉트론을 구현했습니다.
  - **Embedding Layer**: 입력된 6글자 ID 각각을 16차원 벡터로 조회 후, Flat하여 96차원 입력 벡터를 형성합니다.
  - **Hidden Layer**: He 초기화를 적용한 64차원 가중치와 bias를 사용하며, 활성화 함수로 ReLU를 적용합니다.
  - **Output Layer**: Xavier 초기화를 적용하여 어휘 사전 크기(V-차원)의 Logits을 구합니다.
- **Adam Optimizer**: NumPy로 직접 구현한 Adam Optimizer 상태(m, v 배열 및 시간 스텝 $t$)를 사용하여 가중치를 조절합니다.
- **학습 하이퍼파라미터**:
  - Epochs: `10`
  - Batch Size: `64`
  - Learning Rate: `0.001`

### 5.3. 가중치 내보내기 (Export)
학습이 끝난 후 모델의 파라미터(`emb_matrix`, `w1`, `b1`, `w2`, `b2`)를 JSON 직렬화가 가능한 리스트 포맷으로 가공하여 [hardcore_weights.json](file:///Users/kutor/Documents/Projects_Kutor/typediag/src/lib/practice/hardcore_weights.json)에 저장합니다. 브라우저는 이 JSON 파일을 로드하여 런타임에 정방향 추론(Inference)을 수행합니다.

### 5.4. 학습 실행 방법
로컬 개발 환경에서 모델을 재학습하고 가중치를 업데이트하려면 프로젝트 루트 디렉터리에서 다음 명령을 실행합니다:
```bash
python scripts/train_hardcore.py
```

