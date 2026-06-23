import json
import os

PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
TARGETS_JSON_PATH = os.path.join(PROJECT_ROOT, "src", "data", "targets_client.json")

# Define a list of high-quality English sentences for typing practice
english_sentences = [
    "The only way to do great work is to love what you do. If you haven't found it yet, keep looking. Don't settle.",
    "Success is not final, failure is not fatal: it is the courage to continue that counts in the long run.",
    "The future belongs to those who believe in the beauty of their dreams and work hard to achieve them.",
    "In the middle of every difficulty lies a hidden opportunity. Keep pushing forward and never look back.",
    "Simplicity is the ultimate sophistication. It takes a lot of careful work to make something simple and clean.",
    "The best way to predict your future is to create it, step by step, line of code by line of code.",
    "Do not go where the path may lead, go instead where there is no path and leave a trail for others to follow.",
    "To be yourself in a world that is constantly trying to make you something else is the greatest accomplishment.",
    "Technology is best when it brings people together and makes our communication more meaningful.",
    "A person who never made a mistake never tried anything new. Failure is simply the feedback to improve.",
    "Write code as if the next developer who maintains it is a psychopath who knows exactly where you live.",
    "Programs must be written for people to read, and only incidentally for machines to execute in the CPU.",
    "Good design is as little design as possible. It is honest, intuitive, and extremely easy to understand.",
    "Life is 10% what happens to you and 90% how you react to it. Attitude is the key to success.",
    "Your time is limited, so don't waste it living someone else's life. Follow your inner voice and heart.",
    "It is during our darkest moments that we must focus to see the light. Hope is a powerful anchor.",
    "Believe you can and you are halfway there. Every small progress adds up to a major breakthrough.",
    "Learning never exhausts the mind. Curiosity is the spark that leads to deep knowledge and wisdom."
]

def main():
    if not os.path.exists(TARGETS_JSON_PATH):
        print(f"Error: {TARGETS_JSON_PATH} does not exist.")
        return

    with open(TARGETS_JSON_PATH, "r", encoding="utf-8") as f:
        try:
            targets = json.load(f)
        except Exception as e:
            print(f"Error parsing JSON: {e}")
            return

    # Check existing IDs to avoid duplicates
    existing_contents = {t["content"] for t in targets}
    existing_ids = {t["id"] for t in targets}

    start_idx = 1
    added_count = 0

    for sentence in english_sentences:
        if sentence in existing_contents:
            continue

        # Find unique ID
        while True:
            target_id = f"target_eng_{start_idx:03d}"
            if target_id not in existing_ids:
                break
            start_idx += 1

        new_target = {
            "id": target_id,
            "content": sentence,
            "language": "en",
            "source": "default",
            "generator_model": None,
            "subject": None,
            "user_id": None,
            "usage_count": 0,
            "last_used_at": None,
            "created_at": "2026-06-23 14:00:00"
        }
        targets.append(new_target)
        existing_ids.add(target_id)
        added_count += 1
        start_idx += 1

    with open(TARGETS_JSON_PATH, "w", encoding="utf-8") as f:
        json.dump(targets, f, ensure_ascii=False, indent=2)

    print(f"Successfully added {added_count} English target sentences. Total targets: {len(targets)}.")

if __name__ == "__main__":
    main()
