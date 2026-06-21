import os
import sqlite3
import json
from openai import OpenAI
from dotenv import load_dotenv

# Load environment variables (OPENAI_API_KEY)
load_dotenv(".env.local")

PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_DIR = os.path.join(PROJECT_ROOT, "scripts", "data")
DB_FILE = os.path.join(DATA_DIR, "targets.db")

client = OpenAI()

def generate_embeddings():
    if not os.path.exists(DB_FILE):
        print(f"Error: {DB_FILE} not found.")
        return

    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()

    # Find rows without an embedding
    cursor.execute("SELECT id, content FROM target_texts WHERE embedding IS NULL OR embedding = ''")
    rows = cursor.fetchall()

    if not rows:
        print("No texts found that need embedding.")
        conn.close()
        return

    print(f"Found {len(rows)} texts to embed.")

    # Batch process
    batch_size = 100
    for i in range(0, len(rows), batch_size):
        batch = rows[i:i + batch_size]
        texts = [row[1] for row in batch]
        ids = [row[0] for row in batch]

        print(f"Processing batch {i // batch_size + 1}/{(len(rows) - 1) // batch_size + 1}...")
        
        try:
            response = client.embeddings.create(
                input=texts,
                model="text-embedding-3-small"
            )
            
            # Update DB with generated embeddings
            for idx, data in enumerate(response.data):
                embedding_json = json.dumps(data.embedding)
                cursor.execute(
                    "UPDATE target_texts SET embedding = ? WHERE id = ?",
                    (embedding_json, ids[idx])
                )
            conn.commit()
            
        except Exception as e:
            print(f"Error processing batch {i // batch_size + 1}: {e}")
            break

    print("Embedding generation completed.")
    conn.close()

if __name__ == "__main__":
    generate_embeddings()
