"""키보드 레이아웃 -> 2D 물리 좌표 변환.

각 키를 표준 행 어긋남(stagger)을 반영한 (x, y) 좌표로 매핑한다.
implementation_plan_SKDM.md 의 1단계(키보드 레이아웃 2차원 공간화) 구현.
"""

from __future__ import annotations

from dataclasses import dataclass

from . import config


# 분석 대상 키 배열. 행 인덱스 0=숫자열, 1=qwerty, 2=asdf, 3=zxcv.
# 필요에 따라 확장 가능. 우선 영문 알파벳 중심 + 숫자열 일부.
DEFAULT_ROWS: list[list[str]] = [
    list("1234567890"),
    list("qwertyuiop"),
    list("asdfghjkl"),
    list("zxcvbnm,."),
]


@dataclass(frozen=True)
class KeyPosition:
    """키 한 개의 물리 좌표 정보."""

    key: str
    row: int
    col: int
    x: float
    y: float


def build_layout(rows: list[list[str]] | None = None) -> dict[str, KeyPosition]:
    """키 -> KeyPosition 매핑을 생성한다.

    x: 열 인덱스 * KEY_UNIT + 행별 누적 stagger.
    y: 행 인덱스 * ROW_HEIGHT_U (위쪽이 큰 값이 되도록 부호 조정).
    """
    rows = rows if rows is not None else DEFAULT_ROWS
    layout: dict[str, KeyPosition] = {}

    n_rows = len(rows)
    for row_idx, row_keys in enumerate(rows):
        stagger = config.ROW_STAGGER_U.get(row_idx, 0.0)
        # 숫자열(0)이 화면상 위쪽에 오도록 y 를 뒤집는다.
        y = (n_rows - 1 - row_idx) * config.ROW_HEIGHT_U
        for col_idx, key in enumerate(row_keys):
            x = col_idx * config.KEY_UNIT + stagger
            layout[key] = KeyPosition(
                key=key,
                row=row_idx,
                col=col_idx,
                x=x,
                y=y,
            )
    return layout


def get_row(key: str, layout: dict[str, KeyPosition]) -> int:
    """키가 속한 행 인덱스를 반환한다. 없으면 -1."""
    pos = layout.get(key)
    return pos.row if pos is not None else -1
