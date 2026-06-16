"""SKDM 핵심 수학 모델.

전체 흐름(원시 타건 로그 -> 3D 면을 그릴 점들):

  1. 쌍 단위 집계(aggregate_pairs)
     - 원시 타건 이벤트(앞 키 -> 현재 키, 걸린 ms)를 (from, self) 쌍으로 묶는다.
     - 명백한 이상치(너무 빠르거나 너무 느린 입력)는 버린다.
     - 남은 지연시간들을 시그모이드에 통과시켜 0~1 로 만든 뒤 평균낸다.
       => 한 키 쌍이 "쌍별 대표 지연값 z(0~1)"와 "관측 빈도"를 갖게 된다.

  2. 키 단위 요약(summarize_keys)
     - 한 키(self)로 "들어오는" 여러 from 쌍의 z 값들을, 빈도를 가중치로 한
       가중평균으로 하나의 대표 z 로 합친다(여러 관측 -> 키당 대표값 1개).
     - 동시에 그 키로 들어온 총 빈도를 신뢰도(confidence)로 기록한다.
       => 키마다 (x, y, z, 신뢰도) 점 하나가 생긴다.
     - 분석 대상이 아닌 행(config.EXCLUDE_ROWS, 예: 숫자열)은 여기서 제외한다.
       숫자는 타자 입력으로 들어오지 않으므로 애초에 노드로 만들지 않는다.

  3. 메시화(triangulate + smooth)
     - 키들의 (x, y) 평면 좌표로 Delaunay 삼각분할을 만들어 "어떤 키가 이웃인지"
       그래프를 얻는다.
     - Graph Laplacian(이웃 평균으로 끌어당기기)으로 값을 국소 평활화한다.
       신뢰도가 낮은 키일수록 이웃값에 더 강하게 끌려가도록(=빈 키 메우기) 한다.

용어 메모: 2단계를 처음엔 '압축'이라 불렀으나, 실제로는 차원을 줄이는 압축이라기보다
"여러 관측을 키당 대표값 하나로 요약/집계"하는 것이라 'summarize(요약)'로 부른다.
(1단계가 쌍 단위 집계, 2단계가 키 단위 요약.)

왜 이렇게 가볍게 가는가: 데이터가 적은 상황을 가정하므로 평면 피팅/가우시안 보간
같은 무거운 방법 대신, 가중평균 + 삼각분할 + 라플라시안만으로 직관적이고
노이즈에 강하게 처리한다. (typediag 수학모델.md 의 결론)

모든 수치 상수는 config.py 에 있으며, 여기서는 그 값을 어떻게 쓰는지에 집중한다.
"""

from __future__ import annotations

import math
from collections import defaultdict
from dataclasses import dataclass, field

import numpy as np
from scipy.spatial import Delaunay

from . import config
from .layout import KeyPosition


# ---------------------------------------------------------------------------
# 데이터 타입
# ---------------------------------------------------------------------------
@dataclass(frozen=True)
class KeyEvent:
    """단일 타건 이벤트.

    from_key 를 친 직후 self_key 를 latency_ms(ms) 만에 쳤다는 의미.
    원시 로그 한 줄에 해당한다.
    """

    from_key: str
    self_key: str
    latency_ms: float
    is_correct: bool = True


@dataclass
class PairStat:
    """(from, self) 키 쌍 하나에 대한 집계 통계."""

    from_key: str
    self_key: str
    frequency: int = 0  # 이 쌍이 관측된 횟수(이상치 제외 후)
    z: float = 0.0  # 시그모이드 통과 후 평균값 (0~1, 클수록 느림)


@dataclass
class KeyResult:
    """한 키의 최종 압축/메시화 결과. 3D 점 하나에 대응."""

    key: str
    row: int  # 키가 속한 행(0=숫자열 ... 3=ZXCV). 렌더링 필터링에 사용.
    x: float
    y: float
    z: float  # 압축된 대표 지연(시그모이드 스케일, 평활화 전)
    confidence: float  # 이 키로 들어온 총 빈도 = 신뢰도
    stdev: float = 0.0  # 지연시간 표준편차 (원시 ms 스케일)
    z_smoothed: float = field(default=0.0)  # 라플라시안 평활화 후 z
    stdev_smoothed: float = field(default=0.0)  # 라플라시안 평활화 후 stdev


# ---------------------------------------------------------------------------
# 1. 전처리
# ---------------------------------------------------------------------------
def sigmoid_latency(latency_ms: float, max_clip_ms: float) -> float:
    """지연시간(ms) 하나를 [0,1] 시그모이드 값으로 변환한다.

    목적(typediag 수학모델.md 의 'z' 절):
      - 짧은 시간은 둔감하게(차이를 거의 안 봄),
      - 일정 구간에서 민감하게,
      - 긴 시간은 1 에 포화시켜 극대화.

    동작:
      1) 하한 0.0, 상한 max_clip_ms (동적 upper_bound) 범위로 자른다(clip).
      2) 상한값에 비례하여 중심(center)과 기울기(steepness)를 동적으로 계산한다.
         - center = max_clip_ms * 0.4 (전체 범위의 약 40% 지점)
         - steepness = 4.6 / (max_clip_ms - center) (상한선에서 sigmoid 값이 ~0.99가 되도록 설정)
      3) 표준 시그모이드에 넣어 0~1 사이 값으로 변환한다.
    """
    t = max(0.0, min(max_clip_ms, latency_ms))
    center = max_clip_ms * 0.4
    denom = max_clip_ms - center
    steepness = 4.6 / denom if denom > 0 else 0.02

    x = steepness * (t - center)
    return 1.0 / (1.0 + math.exp(-x))


def filter_backspaces(events: list[KeyEvent]) -> list[KeyEvent]:
    """제어키 전이와 오타를 제외하고, 유효한 타건들만 남깁니다.
    
    (이름은 호환성을 위해 filter_backspaces로 유지)
    연속적인 타건 스트림(events)을 순회하며:
    - 백스페이스나 제어키가 개입된 전이(흐름 단절)는 제외합니다.
    - 오타(is_correct == False)는 제외합니다.
    - 비록 백스페이스로 지워졌다 하더라도 올바르게 입력된 글자는 포함합니다.
    """
    def is_control_key(k: str) -> bool:
        return len(k) > 1 and k != "space"

    cleaned_events = []
    for ev in events:
        s_key = ev.self_key.lower()
        f_key = ev.from_key.lower() if ev.from_key else ""
        
        # 제어키가 개입된 전이(단절된 흐름)는 버린다
        if is_control_key(s_key) or is_control_key(f_key):
            continue
            
        # 오타는 버린다
        if ev.is_correct is False:
            continue
            
        cleaned_events.append(ev)
            
    return cleaned_events


def filter_outliers(events: list[KeyEvent]) -> tuple[list[KeyEvent], float]:
    """상위 이상치를 제거하고 효과적인 최대 지연시간(클립 기준선)을 반환한다.
    
    1. 하드 컷오프(2000ms) 적용.
    2. 데이터 개수가 적으면 (OUTLIER_BLEND_START_EVENTS 미만) 하드 컷오프 내 최댓값.
    3. 충분하면 로그 IQR 상한선 도출 (최소 500ms 보장).
    4. 데이터 개수에 따라 하드 컷오프와 IQR 상한선을 블렌딩.
    """
    # 1. Hard Cutoff
    valid_events = [ev for ev in events if ev.latency_ms <= config.OUTLIER_HARD_CUTOFF_MS]

    # 2. Count Check
    if len(valid_events) < config.OUTLIER_BLEND_START_EVENTS:
        max_observed = max((ev.latency_ms for ev in valid_events), default=config.OUTLIER_HARD_CUTOFF_MS)
        return valid_events, float(max_observed)

    # 3. IQR
    latencies = [ev.latency_ms for ev in valid_events if ev.latency_ms > 0]
    if not latencies:
        return valid_events, config.OUTLIER_HARD_CUTOFF_MS

    log_latencies = np.log(latencies)
    q1 = float(np.percentile(log_latencies, 25))
    q3 = float(np.percentile(log_latencies, 75))
    iqr = q3 - q1
    iqr_bound = math.exp(q3 + config.OUTLIER_IQR_MULTIPLIER * iqr)
    
    final_iqr_bound = max(iqr_bound, config.OUTLIER_IQR_MIN_UPPER_BOUND_MS)

    # 4. Blend interpolation
    count = len(valid_events)
    if count >= config.OUTLIER_BLEND_END_EVENTS:
        final_upper_bound = final_iqr_bound
    else:
        weight = (count - config.OUTLIER_BLEND_START_EVENTS) / (config.OUTLIER_BLEND_END_EVENTS - config.OUTLIER_BLEND_START_EVENTS)
        final_upper_bound = (1.0 - weight) * config.OUTLIER_HARD_CUTOFF_MS + weight * final_iqr_bound

    valid_events = [ev for ev in valid_events if ev.latency_ms <= final_upper_bound]
    if valid_events:
        max_observed = max(ev.latency_ms for ev in valid_events)
    else:
        max_observed = final_upper_bound

    return valid_events, float(max_observed)


def aggregate_pairs(valid_events: list[KeyEvent], max_clip_ms: float) -> dict[tuple[str, str], PairStat]:
    """원시 이벤트를 (from, self) 쌍별로 집계한다.

    절차:
      1) 이미 필터링된 이벤트와 상한선을 주입받는다.
      2) 지연시간을 즉시 시그모이드로 변환해 (from, self) 버킷에 쌓는다.
      3) 버킷마다 변환값들의 '평균'을 내어 쌍의 대표 z 로 삼고, 개수를 빈도로 기록한다.
         => 평균을 시그모이드 '이후'에 내는 이유: 먼저 비선형 변환을 적용해야
            긴 지연 하나가 평균을 과하게 끌어올리는 일이 줄고, 의도한
            '둔감/민감/포화' 특성이 평균에도 반영된다. (t -> sigmoid -> mean)
    """
    
    buckets: dict[tuple[str, str], list[float]] = defaultdict(list)
    for ev in valid_events:
        buckets[(ev.from_key, ev.self_key)].append(sigmoid_latency(ev.latency_ms, max_clip_ms))

    stats: dict[tuple[str, str], PairStat] = {}
    for (from_key, self_key), sig_values in buckets.items():
        if not sig_values:
            continue
        stats[(from_key, self_key)] = PairStat(
            from_key=from_key,
            self_key=self_key,
            frequency=len(sig_values),
            z=float(np.mean(sig_values)),
        )
    return stats


# ---------------------------------------------------------------------------
# 2. 키 단위 요약 (빈도 가중평균)
# ---------------------------------------------------------------------------
def summarize_keys(
    pair_stats: dict[tuple[str, str], PairStat],
    layout: dict[str, KeyPosition],
    valid_events: list[KeyEvent] | None = None,
) -> dict[str, KeyResult]:
    """self 키로 들어오는 from 쌍들의 z 를 키당 대표값 하나로 요약한다.

    개념:
      한 키 위 공간에는 그 키로 '들어오는' 여러 전이가 벡터처럼 존재한다.
      이들을 점으로 보고 빈도 가중평균을 내어 키 하나당 대표 z 하나로 줄인다.
      (= 여러 관측의 요약. 차원을 압축한다기보다 '대표값 산출'에 가깝다.)

    분석 제외 행:
      config.EXCLUDE_ROWS 에 속한 행(예: 숫자열)은 결과 노드로 만들지 않는다.
      숫자는 타자 입력으로 들어오지 않아 데이터가 없고, 노드로 두면 z=0·신뢰도=0 인
      '죽은 점'이 되어 메시/평활화에서 이웃을 끌어내리기 때문이다.

    가중치 설계(config.FREQUENCY_WEIGHT_POWER):
      weight = frequency ** POWER
      - 자주 발생한 전이일수록 대표값을 더 강하게 끌어당긴다(더 신뢰).
      - POWER=1 이면 빈도에 정확히 비례(선형). POWER 를 키우면 다수 전이에 더 편향.

    빈도를 '값을 깎는 데' 쓰지 않는 이유(typediag 수학모델.md 의 해당 절):
      드물게 친 전이라도 그 z 값 자체는 진짜 관측이므로 부정하면 안 된다.
      대신 '얼마나 믿을지'는 신뢰도(confidence)로 따로 들고 가서, 메시화 단계의
      평활화 강도에 반영한다. (값 부정 != 신뢰도 의심 을 분리)

    신뢰도(confidence):
      그 키로 들어온 모든 전이의 빈도 합. 많이 관측된 키일수록 값이 단단하다고 본다.

    데이터가 없는 키(분석 대상이지만 관측이 0):
      z=0, confidence=0 으로 둔다. 이후 smooth 단계에서 신뢰도가 0 이므로
      이웃값으로 강하게 채워진다(빈 구멍 메우기).
    """
    # self 키 기준으로 들어오는 쌍들을 모은다.
    incoming: dict[str, list[PairStat]] = defaultdict(list)
    all_zs = []
    for stat in pair_stats.values():
        incoming[stat.self_key].append(stat)
        all_zs.append(stat.z)
        
    # 세션(전체 pair_stats)의 중간값 z 계산
    session_median_z = float(np.median(all_zs)) if all_zs else 0.0

    valid_events = valid_events or []
    latencies_per_key: dict[str, list[float]] = defaultdict(list)
    for ev in valid_events:
        latencies_per_key[ev.self_key].append(ev.latency_ms)

    # 세션 전체의 stdev 중간값 계산
    all_stdevs = []
    for key_lats in latencies_per_key.values():
        if len(key_lats) >= 2:
            all_stdevs.append(float(np.std(key_lats)))
    session_median_stdev = float(np.median(all_stdevs)) if all_stdevs else 0.0

    results: dict[str, KeyResult] = {}
    for key, pos in layout.items():
        # 분석 제외 행(숫자열 등)은 노드 자체를 만들지 않는다.
        if pos.row in config.EXCLUDE_ROWS:
            continue

        stats = incoming.get(key, [])

        key_latencies = latencies_per_key.get(key, [])
        if len(key_latencies) >= 2:
            key_stdev = float(np.std(key_latencies))
        else:
            key_stdev = session_median_stdev

        if not stats:
            # 관측이 전혀 없는 키. 값은 세션 중간값, 신뢰도 0 으로 두고 평활화에 맡긴다.
            results[key] = KeyResult(
                key=key, row=pos.row, x=pos.x, y=pos.y, z=session_median_z, confidence=0.0, stdev=session_median_stdev
            )
            continue

        # 가중평균: sum(w_i * z_i) / sum(w_i), 여기서 w_i = freq_i ** POWER.
        weights = np.array(
            [s.frequency**config.FREQUENCY_WEIGHT_POWER for s in stats], dtype=float
        )
        zs = np.array([s.z for s in stats], dtype=float)
        total_w = float(weights.sum())
        z_rep = float(np.dot(weights, zs) / total_w) if total_w > 0 else 0.0

        # 신뢰도는 (지수를 적용하지 않은) 순수 빈도 합으로 둔다.
        total_freq = float(sum(s.frequency for s in stats))

        results[key] = KeyResult(
            key=key,
            row=pos.row,
            x=pos.x,
            y=pos.y,
            z=z_rep,
            confidence=total_freq,
            stdev=key_stdev,
        )
    return results


# ---------------------------------------------------------------------------
# 3. 메시화 + 신뢰도 전파 (Delaunay + Graph Laplacian)
# ---------------------------------------------------------------------------
def triangulate(
    results: dict[str, KeyResult],
    keys: list[str] | None = None,
) -> tuple[list[str], Delaunay]:
    """키들의 (x, y) 좌표로 Delaunay 삼각분할을 만든다.

    Delaunay 삼각분할을 쓰는 이유:
      평면 위에 흩어진 점들을 '가장 자연스러운 삼각형 망'으로 연결해 준다.
      이 삼각형들의 변(edge)이 곧 '이웃 관계 그래프'가 되고, 동시에 3D 면을 그릴
      삼각형 목록(simplices)도 그대로 쓸 수 있다.

    keys 인자:
      None 이면 results 의 모든 키를 사용한다(전체 모델용).
      부분 리스트를 주면 그 키들만으로 삼각분할한다(예: 숫자열 제외 렌더링).

    반환: (사용한 키 순서 리스트, Delaunay 객체)
      simplices 의 인덱스는 이 '키 순서 리스트' 기준이라는 점에 유의.
    """
    keys = keys if keys is not None else list(results.keys())
    points = np.array([[results[k].x, results[k].y] for k in keys], dtype=float)
    tri = Delaunay(points)
    return keys, tri


def _build_adjacency(keys: list[str], tri: Delaunay) -> dict[int, set[int]]:
    """삼각분할 결과로부터 인접(이웃) 그래프를 만든다.

    이웃이 '어떻게' 정해지는가:
      Delaunay 삼각분할은 평면의 점들을 삼각형들로 빈틈없이 채운다. 핵심 성질은
      "한 삼각형의 외접원 안에 다른 점이 들어오지 않는다"는 것이라, 결과적으로
      서로 '가장 가까운' 점들끼리 변(edge)으로 이어진다.
      => 따라서 어떤 키의 이웃은 '양옆'만이 아니라, 평면상 그 키를 둘러싸고
         맞닿아 있는 모든 키(좌/우 + 윗줄의 대각 + 아랫줄의 대각)가 된다.
         스태거(행 어긋남) 덕분에 키 배치가 육각형 격자에 가까워서, 안쪽 키는
         보통 6개 안팎의 이웃(좌, 우, 위2, 아래2)을 갖고 가장자리 키는 더 적다.

    구현:
      각 삼각형(simplex)은 점 3개로 이루어지고, 한 삼각형 안의 세 점은 서로 이웃이다.
      모든 삼각형을 훑으며 (i, j) 쌍을 양방향으로 등록하면 무방향 인접 그래프가 된다.
      같은 변을 공유하는 두 삼각형이 있어도 set 이라 자동으로 중복 제거된다.
      인덱스는 triangulate 가 돌려준 keys 리스트 기준.
    """
    adj: dict[int, set[int]] = defaultdict(set)
    for simplex in tri.simplices:
        for i in simplex:
            for j in simplex:
                if i != j:
                    adj[i].add(j)
    return adj


def smooth(results: dict[str, KeyResult]) -> dict[str, KeyResult]:
    """Graph Laplacian 기반 국소 평활화로 이웃 키에 값을 전파한다.

    Graph Laplacian 평활화란:
      각 점의 값을 '자기 값'과 '이웃 평균값'의 가중 혼합으로 갱신하는 것.
        new = (1 - alpha) * self + alpha * mean(neighbors)
      alpha 가 클수록 면이 더 매끈해지고(이웃에 끌려감), 작을수록 원본을 보존한다.

    신뢰도 반영(핵심):
      모든 키에 같은 alpha 를 쓰지 않는다. 신뢰도가 낮은 키일수록 더 강하게
      이웃값에 끌려가도록 alpha 를 (1 - 정규화 신뢰도) 로 깎아 곱한다.
        alpha_i = ALPHA * (1 - norm_conf_i)
      => 관측이 많은(믿을 만한) 키는 거의 안 움직이고,
         관측이 없는(신뢰도 0) 키는 ALPHA 만큼 이웃값으로 채워진다(구멍 메우기).

    반복(ITERATIONS):
      한 번 돌리면 바로 옆 이웃까지만 번진다. 여러 번 돌리면 그 너머로 점점 퍼진다.
      과전파를 막기 위해 보통 2 회 정도의 작은 값을 쓴다.

    주의:
      평활화는 전체 키(숫자열 포함)로 수행한다. 숫자열은 렌더링에선 빼지만
      옆 키들의 값 전파에는 기여해야 면이 자연스럽기 때문이다.
      결과는 각 KeyResult.z_smoothed 에 기록한다(원본 z 는 보존).
    """
    keys, tri = triangulate(results)
    adj = _build_adjacency(keys, tri)

    z = np.array([results[k].z for k in keys], dtype=float)
    stdev = np.array([results[k].stdev for k in keys], dtype=float)
    conf = np.array([results[k].confidence for k in keys], dtype=float)

    # 신뢰도를 0~1 로 정규화. 최댓값으로 나눈다(전부 0 이면 1 로 나눠 0 유지).
    max_conf = conf.max() if conf.size and conf.max() > 0 else 1.0
    norm_conf = conf / max_conf

    for _ in range(config.LAPLACIAN_ITERATIONS):
        new_z = z.copy()  # 같은 반복 안에서는 이전 상태(z)를 기준으로 동시 갱신
        new_stdev = stdev.copy()
        for i in range(len(keys)):
            neighbors = adj.get(i)
            if not neighbors:
                continue  # 이웃이 없으면(고립점) 그대로 둔다
            neighbor_mean = float(np.mean([z[j] for j in neighbors]))
            neighbor_mean_stdev = float(np.mean([stdev[j] for j in neighbors]))
            # 신뢰도 높으면 alpha 가 0 에 가까워 거의 안 움직이고,
            # 신뢰도 낮으면 alpha 가 ALPHA 에 가까워 이웃값으로 끌려간다.
            alpha = config.LAPLACIAN_SMOOTHING_ALPHA * (1.0 - norm_conf[i])
            if norm_conf[i] == 0:
                alpha = 0.8
            new_z[i] = (1.0 - alpha) * z[i] + alpha * neighbor_mean
            new_stdev[i] = (1.0 - alpha) * stdev[i] + alpha * neighbor_mean_stdev
        z = new_z
        stdev = new_stdev

    for idx, k in enumerate(keys):
        results[k].z_smoothed = float(z[idx])
        results[k].stdev_smoothed = float(stdev[idx])
    return results


# ---------------------------------------------------------------------------
# 파이프라인 진입점
# ---------------------------------------------------------------------------
def run_pipeline(
    events: list[KeyEvent],
    layout: dict[str, KeyPosition],
) -> dict[str, KeyResult]:
    """원시 이벤트 -> 전처리 -> 압축 -> 메시화 전체 파이프라인.

    반환: 키 -> KeyResult 딕셔너리. 렌더러는 여기서 z_smoothed 와 (x, y) 를 읽는다.
    """
    cleaned_events = filter_backspaces(events)
    valid_events, max_clip_ms = filter_outliers(cleaned_events)
    pair_stats = aggregate_pairs(valid_events, max_clip_ms)
    results = summarize_keys(pair_stats, layout, valid_events)
    results = smooth(results)
    return results
