import os
import sys
import json
import sqlite3
import re
import argparse
import shutil

# 프로젝트 루트 기준 경로 설정을 위한 도우미
PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_DIR = os.path.join(PROJECT_ROOT, "scripts", "data")
DB_FILE = os.path.join(DATA_DIR, "targets.db")
OUTPUT_JSONL = os.path.join(DATA_DIR, "batch_output.jsonl")
TARGETS_CLIENT_PATH = os.path.join(PROJECT_ROOT, "src", "data", "targets_client.json")
TARGETS_VECTOR_PATH = os.path.join(PROJECT_ROOT, "src", "data", "targets_vector.json")

def get_pure_hangul_count(text):
    """공백과 문장부호를 제외한 순수 한글 글자 수 계산"""
    hangul_chars = re.findall(r'[가-힣]', text)
    return len(hangul_chars)

def clean_sentence(text):
    """문장 정제 (앞뒤 공백 제거, 비정상 제어 문자 제거)"""
    if not text:
        return ""
    cleaned = re.sub(r'\s+', ' ', text)
    return cleaned.strip()

def init_db():
    """SQLite 데이터베이스 및 테이블 초기화"""
    if not os.path.exists(DATA_DIR):
        os.makedirs(DATA_DIR)
        
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    # tags 컬럼이 추가된 새 스키마
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS target_texts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            content TEXT UNIQUE NOT NULL,
            language TEXT NOT NULL,
            source TEXT DEFAULT 'default',
            generator_model TEXT,
            subject TEXT,
            user_id TEXT,
            usage_count INTEGER DEFAULT 0,
            last_used_at DATETIME,
            raw_key TEXT,
            pure_hangul_count INTEGER,
            embedding TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    """)
    conn.commit()
    conn.close()

def import_results(min_len=50, max_len=110):
    """
    Gemini Batch API 결과(JSONL)를 파싱하여 SQLite DB에 적재합니다.
    - 중복 문장은 자동으로 걸러집니다 (UNIQUE 제약조건).
    - 순수 한글 자수 조건(min_len <= hangul_count <= max_len)을 만족하는 문장만 적재합니다.
    """
    init_db()
    
    if not os.path.exists(OUTPUT_JSONL):
        print(f"에러: 배치 출력 파일({OUTPUT_JSONL})을 찾을 수 없습니다. 먼저 python scripts/generate_batch.py check를 성공적으로 실행해 주세요.", file=sys.stderr)
        return
        
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    
    total_parsed = 0
    inserted_count = 0
    duplicate_count = 0
    filtered_count = 0
    
    print(f"1. {OUTPUT_JSONL} 에서 문장 및 태그 읽기 시작...")
    
    with open(OUTPUT_JSONL, "r", encoding="utf-8") as f:
        for line_num, line in enumerate(f, 1):
            if not line.strip():
                continue
            
            try:
                result = json.loads(line)
                key = result.get("key", "")
                
                # 오류 상태 체크
                if "response" not in result:
                    print(f"   라인 {line_num} 건너뜀 (에러 응답): {result.get('status')}")
                    continue
                    
                total_parsed += 1
                
                # Structured Output 파싱
                response_text = result["response"]["candidates"][0]["content"]["parts"][0]["text"]
                content_data = json.loads(response_text)
                
                raw_content = content_data.get("content", "")
                raw_tags = content_data.get("tags", [])
                
                # 태그 정제 (더 이상 사용 안함, 하위 호환성 위해 로드만)
                tags = [str(t).strip() for t in raw_tags if t]
                # tags_json = json.dumps(tags, ensure_ascii=False)
                
                # 문장 정제 및 순수 한글 글자수 계산
                content = clean_sentence(raw_content)
                hangul_cnt = get_pure_hangul_count(content)
                
                # 글자 수 필터링 (50자 ~ 110자 범위)
                if not (min_len <= hangul_cnt <= max_len):
                    filtered_count += 1
                    continue
                    
                # DB 저장
                try:
                    cursor.execute(
                        "INSERT INTO target_texts (content, language, source, generator_model, raw_key, pure_hangul_count) VALUES (?, ?, ?, ?, ?, ?)",
                        (content, "ko", "default", "gemini-batch", key, hangul_cnt)
                    )
                    inserted_count += 1
                except sqlite3.IntegrityError:
                    duplicate_count += 1
                    
            except Exception as e:
                print(f"   라인 {line_num} 파싱 실패: {e}")
                
    conn.commit()
    conn.close()
    
    print("\n[가져오기 결과 요약]")
    print(f"- 파싱 완료된 전체 요청: {total_parsed}건")
    print(f"- 성공적으로 DB에 등록됨: {inserted_count}건")
    print(f"- 중복 문장 제거됨: {duplicate_count}건")
    print(f"- 순수 한글 자수 조건({min_len}자~{max_len}자) 미달로 필터링됨: {filtered_count}건")

def export_to_json():
    """
    SQLite DB에 저장된 문장을 두 개의 JSON으로 내보냅니다.
    - targets_client.json: 프론트엔드 번들용 (임베딩 제외, 가벼움)
    - targets_vector.json: 서버 API 및 유사도 검색용 (임베딩 포함, 무거움)
    """
    if not os.path.exists(DB_FILE):
        print(f"에러: SQLite DB 파일({DB_FILE})이 존재하지 않습니다. 먼저 import 명령을 수행해 주세요.", file=sys.stderr)
        return
        
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    
    # DB에서 데이터 조회 (임베딩 정보 포함)
    cursor.execute("""
        SELECT content, language, embedding, pure_hangul_count, source, generator_model, subject, user_id, usage_count, last_used_at, created_at
        FROM target_texts 
        ORDER BY id ASC
    """)
    rows = cursor.fetchall()
    conn.close()
    
    if not rows:
        print("경고: DB에 저장된 문장이 없습니다. JSON 파일로 내보낼 내용이 없습니다.")
        return
        
    # JSON 파일 데이터 구성
    client_list = []
    vector_list = []
    for idx, row in enumerate(rows, 1):
        # embedding 파싱
        try:
            embedding = json.loads(row[2]) if row[2] else []
        except:
            embedding = []
            
        base_item = {
            "id": f"target_{idx:03d}",
            "content": row[0],
            "language": row[1],
            "source": row[4] or "default",
            "generator_model": row[5],
            "subject": row[6],
            "user_id": row[7],
            "usage_count": row[8] or 0,
            "last_used_at": row[9],
            "created_at": row[10]
        }
        
        client_list.append(base_item)
        vector_list.append({
            **base_item,
            "embedding": embedding
        })
        
    # 기존 targets.json 백업 (구버전 삭제 방지)
    old_targets_path = os.path.join(PROJECT_ROOT, "src", "data", "targets.json")
    if os.path.exists(old_targets_path):
        backup_path = old_targets_path + ".bak"
        print(f"기존 {old_targets_path} 파일을 백업합니다 -> {backup_path}")
        shutil.copyfile(old_targets_path, backup_path)
        os.remove(old_targets_path)
        
    # JSON 파일 쓰기
    with open(TARGETS_CLIENT_PATH, "w", encoding="utf-8") as f:
        json.dump(client_list, f, ensure_ascii=False, indent=2)
        
    with open(TARGETS_VECTOR_PATH, "w", encoding="utf-8") as f:
        json.dump(vector_list, f, ensure_ascii=False, indent=2)
        
    print(f"\n성공적으로 {len(client_list)}개의 문장을 내보냈습니다!")
    print(f"- 클라이언트용: {TARGETS_CLIENT_PATH}")
    print(f"- 벡터 검색용: {TARGETS_VECTOR_PATH}")
    
    # 분포 요약 출력
    lengths = [row[3] for row in rows]
    avg_len = sum(lengths) / len(lengths)
    print("\n[생성된 문장의 한글 글자수 분포 요약 (공백/문장부호 제외)]")
    print(f"- 전체 문장 개수: {len(lengths)}개")
    print(f"- 평균 글자 수: {avg_len:.1f}자")
    
    # 구간별 개수
    under_70 = len([l for l in lengths if l < 70])
    between_70_90 = len([l for l in lengths if 70 <= l <= 90])
    over_90 = len([l for l in lengths if l > 90])
    print(f"- 70자 미만: {under_70}개 ({under_70/len(lengths)*100:.1f}%)")
    print(f"- 70자 ~ 90자 (80자 전후): {between_70_90}개 ({between_70_90/len(lengths)*100:.1f}%)")
    print(f"- 90자 초과: {over_90}개 ({over_90/len(lengths)*100:.1f}%)")

def show_db_stats():
    """DB에 저장된 문장 요약 및 예시 5개 출력"""
    if not os.path.exists(DB_FILE):
        print(f"DB 파일({DB_FILE})이 존재하지 않습니다.")
        return
        
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    cursor.execute("SELECT COUNT(*) FROM target_texts")
    total = cursor.fetchone()[0]
    
    print(f"현재 DB에 적재된 타겟 문장 총 개수: {total}개")
    
    if total > 0:
        print("\n최근 등록된 예시 문장 5개:")
        cursor.execute("SELECT id, content, pure_hangul_count, embedding FROM target_texts ORDER BY id DESC LIMIT 5")
        for row in cursor.fetchall():
            emb_status = "임베딩 완료" if row[3] else "임베딩 안됨"
            print(f"[{row[0]}] (순수한글 {row[2]}자, {emb_status}): {row[1]}")
            
    conn.close()

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="타겟 문장 데이터베이스 관리 및 JSON 내보내기")
    parser.add_argument("command", choices=["import", "export", "stats"], help="실행할 명령 (import: 출력 JSONL을 DB에 적재, export: DB 데이터를 targets.json으로 내보내기, stats: DB 상태 확인)")
    parser.add_argument("--min-len", type=int, default=50, help="가져올 문장의 최소 순수 한글 자수 (기본값: 50)")
    parser.add_argument("--max-len", type=int, default=110, help="가져올 문장의 최대 순수 한글 자수 (기본값: 110)")
    
    args = parser.parse_args()
    
    if args.command == "import":
        import_results(args.min_len, args.max_len)
    elif args.command == "export":
        export_to_json()
    elif args.command == "stats":
        show_db_stats()
