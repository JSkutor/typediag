import os
import sys
import json
import argparse
import random
from google import genai
from google.genai import types

# 프로젝트 루트 기준 경로 설정을 위한 도우미
PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_DIR = os.path.join(PROJECT_ROOT, "scripts", "data")
METADATA_FILE = os.path.join(DATA_DIR, "batch_metadata.json")

# Topic list for generating diverse typing practice sentences
TOPICS = [
    "Nature",
    "Science",
    "Technology",
    "Art",
    "Culture",
    "Society",
    "Economy",
    "Philosophy",
    "Psychology",
    "Emotion",
    "Language",
    "Education",
    "Career",
    "Health",
    "Travel",
    "Food",
    "Animal",
    "Plant",
    "Universe",
    "Design",
    "Creativity",
    "Group",
    "Behavior",
    "Causality",
    "Principle",
    "Sensation",
    "Space",
    "Time",
    "Ocean",
    "Architecture",
]


def load_env_key():
    """
    로컬 환경변수 또는 프로젝트 루트의 .env / .env.local 파일에서
    GEMINI_API_KEY를 읽어와 환경 변수에 주입합니다.
    """
    key = os.environ.get("GEMINI_API_KEY")
    if key:
        return key

    env_files = [".env.local", ".env.development", ".env"]
    for filename in env_files:
        filepath = os.path.join(PROJECT_ROOT, filename)
        if os.path.exists(filepath):
            with open(filepath, "r", encoding="utf-8") as f:
                for line in f:
                    line = line.strip()
                    # 주석 및 빈 줄 제외
                    if line and not line.startswith("#") and "=" in line:
                        k, v = line.split("=", 1)
                        if k.strip() == "GEMINI_API_KEY":
                            # 따옴표 제거
                            val = v.strip().strip("'\"")
                            os.environ["GEMINI_API_KEY"] = val
                            return val
    return None


def make_directory():
    """데이터 저장 디렉토리 생성"""
    if not os.path.exists(DATA_DIR):
        os.makedirs(DATA_DIR)


def generate_prompts(count=1500):
    """
    Generates a specified number of diverse and high-quality typing practice prompts.
    Adjusts the distribution of character counts (excluding spaces and punctuation) to center around 80 characters.
    """
    prompts_file_path = os.path.join(
        PROJECT_ROOT, "src", "lib", "practice", "prompts.json"
    )
    with open(prompts_file_path, "r", encoding="utf-8") as f:
        prompts_cfg = json.load(f)

    prompts = []

    # Calculate count for each target length
    cnt_60 = int(count * 0.20)
    cnt_100 = int(count * 0.20)
    cnt_80 = count - cnt_60 - cnt_100

    length_configs = [(60, cnt_60), (80, cnt_80), (100, cnt_100)]

    # Create a list of flags to ensure exactly shared ratio of prompts have numbers.
    inclusion_ratio = prompts_cfg["number_constraint"]["inclusion_ratio"]
    num_with_numbers = int(count * inclusion_ratio)
    number_flags = [True] * num_with_numbers + [False] * (count - num_with_numbers)
    # Shuffle flags to distribute them randomly across different lengths
    random.shuffle(number_flags)

    index = 0
    for target_len, target_cnt in length_configs:
        for _ in range(target_cnt):
            if index < len(number_flags):
                has_num = number_flags[index]
            else:
                has_num = False

            topic = random.choice(TOPICS)
            style = random.choice(prompts_cfg["styles"])

            # Determine the number constraint text
            if has_num:
                number_condition = prompts_cfg["number_constraint"]["with_numbers"]
            else:
                number_condition = prompts_cfg["number_constraint"]["without_numbers"]

            # Construct the English prompt targeting Korean sentence generation using the template
            prompt_template = prompts_cfg["batch"]["user_prompt_template"]
            prompt_text = prompt_template.format(
                topic=topic,
                style=style,
                number_condition=number_condition,
                target_len=target_len,
                complex_sentence=prompts_cfg["common_rules"]["complex_sentence"],
                no_newlines=prompts_cfg["common_rules"]["no_newlines"],
                allowed_punctuation=prompts_cfg["common_rules"]["allowed_punctuation"],
            )

            prompts.append(
                {
                    "id": f"prompt_{index+1:04d}",
                    "target_length": target_len,
                    "prompt": prompt_text,
                }
            )
            index += 1

    # Shuffle the prompts before submission
    random.shuffle(prompts)
    return prompts


def submit_job(count=1500):
    """JSONL 생성, 업로드 및 배치 작업 요청 제출"""
    api_key = load_env_key()
    if not api_key:
        print("에러: GEMINI_API_KEY를 찾을 수 없습니다.", file=sys.stderr)
        print(
            "프로젝트 루트의 .env.local 파일에 GEMINI_API_KEY=your_key 를 작성하거나,",
            file=sys.stderr,
        )
        print(
            "터미널에 'export GEMINI_API_KEY=your_key'를 입력해 주세요.",
            file=sys.stderr,
        )
        return

    make_directory()
    client = genai.Client()

    print(f"1. {count}개의 타자 연습용 프롬프트 생성 중...")
    prompts_data = generate_prompts(count)

    # JSONL 파일 생성
    input_file_path = os.path.join(DATA_DIR, "batch_input.jsonl")
    print(f"2. {input_file_path} 파일 작성 중...")

    with open(input_file_path, "w", encoding="utf-8") as f:
        for idx, item in enumerate(prompts_data):
            req = {
                "key": f"target_gen_{idx:04d}_{item['target_length']}",
                "request": {
                    "contents": [{"parts": [{"text": item["prompt"]}]}],
                    "generationConfig": {
                        "temperature": 0.85,
                        "responseMimeType": "application/json",
                        "responseSchema": {
                            "type": "OBJECT",
                            "properties": {
                                "content": {"type": "STRING"},
                            },
                            "required": ["content"],
                        },
                    },
                },
            }
            f.write(json.dumps(req, ensure_ascii=False) + "\n")

    print(f"3. Gemini File API로 파일 업로드 중...")
    uploaded_file = client.files.upload(
        file=input_file_path,
        config=types.UploadFileConfig(
            display_name="typediag_batch_input", mime_type="application/json"
        ),
    )
    print(f"   업로드 완료. 서버 파일명: {uploaded_file.name}")

    print(f"4. Gemini Batch Job 생성 요청 중...")
    batch_job = client.batches.create(
        model="models/gemini-2.5-flash",
        src=uploaded_file.name,
        config=types.CreateBatchJobConfig(display_name="typediag_target_generation"),
    )
    print(f"   배치 작업 시작됨! Job ID: {batch_job.name}")

    # 메타데이터 로컬 저장
    metadata = {
        "job_id": batch_job.name,
        "src_file": uploaded_file.name,
        "submitted_at": (
            batch_job.create_time.isoformat()
            if hasattr(batch_job.create_time, "isoformat")
            else str(batch_job.create_time)
        ),
        "request_count": count,
    }
    with open(METADATA_FILE, "w", encoding="utf-8") as f:
        json.dump(metadata, f, ensure_ascii=False, indent=2)

    print(f"\n성공적으로 배치가 등록되었습니다.")
    print(
        f"상태를 모니터링하려면 다음 명령을 실행하세요: python scripts/generate_batch.py check"
    )


def check_status():
    """배치 상태 모니터링 및 완료 시 결과 다운로드"""
    api_key = load_env_key()
    if not api_key:
        print("에러: GEMINI_API_KEY를 찾을 수 없습니다.", file=sys.stderr)
        return

    if not os.path.exists(METADATA_FILE):
        print(
            f"에러: 메타데이터 파일({METADATA_FILE})을 찾을 수 없습니다. 먼저 submit 단계를 실행하세요.",
            file=sys.stderr,
        )
        return

    with open(METADATA_FILE, "r", encoding="utf-8") as f:
        metadata = json.load(f)

    job_id = metadata["job_id"]
    print(f"Job ID: {job_id} 의 상태 확인 중...")

    client = genai.Client()
    job_status = client.batches.get(name=job_id)
    state = job_status.state.name
    print(f"현재 작업 상태: {state}")

    if state == "JOB_STATE_SUCCEEDED":
        output_file_name = job_status.dest.file_name
        print(f"\n배치 작업 성공! 결과 파일을 다운로드하는 중: {output_file_name}")

        content_bytes = client.files.download(file=output_file_name)
        output_file_path = os.path.join(DATA_DIR, "batch_output.jsonl")

        with open(output_file_path, "wb") as f:
            f.write(content_bytes)

        print(f"다운로드 완료! 결과 저장 경로: {output_file_path}")
        print(
            "\n다음 단계를 위해 다음 명령어를 실행하여 데이터를 적재하고 JSON으로 정제하세요:"
        )
        print("python scripts/manage_targets.py import")

    elif state in ["JOB_STATE_FAILED", "JOB_STATE_CANCELLED"]:
        print(f"경고: 작업이 완료되지 못했습니다. 상태: {state}")
    else:
        print("아직 작업이 진행 중입니다. 잠시 후 다시 확인해 주세요.")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description="Gemini Batch API 타자 연습 문장 생성 스크립트"
    )
    parser.add_argument(
        "command",
        choices=["submit", "check"],
        help="실행할 명령 (submit: 배치 요청 제출, check: 상태 확인 및 결과 받기)",
    )
    parser.add_argument(
        "--count", type=int, default=1500, help="생성할 문장 개수 (기본값: 1500)"
    )

    args = parser.parse_args()

    if args.command == "submit":
        submit_job(args.count)
    elif args.command == "check":
        check_status()
