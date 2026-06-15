import math
import json
import os

# 1. 키 배열 정의 (숫자열 및 구두점 제외 - 알파벳 26키만 포함)
ROWS = [
    list("qwertyuiop"), # 1행
    list("asdfghjkl"),  # 2행
    list("zxcvbnm"),    # 3행
]

# 표준 키보드 행 어긋남(stagger)
STAGGER = {0: 0.50, 1: 0.75, 2: 1.25}
BASE_Y = {0: 2.0, 1: 1.0, 2: 0.0}
SHIFT_Y = {0: -0.25, 1: -0.25, 2: +0.25}

# 2. 모든 키의 '원래' (x, y) 좌표 및 행 정보 계산
keys_base_pos = {}
key_row_idx = {}
for r_idx, row_keys in enumerate(ROWS):
    for c_idx, key in enumerate(row_keys):
        x = c_idx * 1.0 + STAGGER[r_idx]
        y = BASE_Y[r_idx]
        keys_base_pos[key] = (x, y)
        key_row_idx[key] = r_idx

def get_angle(dx, dy):
    ang = math.atan2(dx, dy)
    if ang < 0:
        ang += 2 * math.pi
    return ang

results_dict = {}

for self_key in keys_base_pos:
    angles = []
    
    # 기준 키(self_key)에만 Shift 적용
    sx, sy = keys_base_pos[self_key]
    sy += SHIFT_Y[key_row_idx[self_key]]
    
    for from_key in keys_base_pos:
        if self_key == from_key:
            continue
            
        # 상대 키(from_key)는 원래 좌표 유지
        fx, fy = keys_base_pos[from_key]
        
        dx = fx - sx
        dy = fy - sy
        ang = get_angle(dx, dy)
        angles.append((ang, from_key))
    
    # 각도 기준으로 정렬
    angles.sort(key=lambda item: item[0])
    
    # JS에서 바로 읽기 좋게 단순 알파벳 배열로 저장
    order_list = [item[1] for item in angles]
    results_dict[self_key] = order_list

# 3. 스크립트 위치 기준으로 JSON 파일 저장
script_dir = os.path.dirname(os.path.abspath(__file__))
output_path = os.path.join(script_dir, "theta_order.json")

with open(output_path, "w", encoding="utf-8") as f:
    json.dump(results_dict, f, indent=2, ensure_ascii=False)

print(f"JSON 결과 파일이 생성되었습니다: {output_path}")
