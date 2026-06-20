"""Hardcore vocab helper module.

Loads the shared vocabulary JSON and provides mapping utilities.
"""

import json
import os

PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
VOCAB_JSON_PATH = os.path.join(
    PROJECT_ROOT, "src", "lib", "practice", "hardcore_vocab.json"
)


def load_vocab() -> list[str]:
    """Loads the shared hardcore vocabulary list from JSON."""
    with open(VOCAB_JSON_PATH, "r", encoding="utf-8") as f:
        return json.load(f)


# Load vocab and build dictionaries
HARDCORE_VOCAB = load_vocab()
CHAR_TO_ID = {char: idx for idx, char in enumerate(HARDCORE_VOCAB)}


def get_char_id(char: str) -> int:
    """Converts a character to its vocab ID. Returns -1 if not found."""
    return CHAR_TO_ID.get(char.lower(), -1)


def get_char_from_id(char_id: int) -> str | None:
    """Converts a vocab ID to its character. Returns None if out of bounds."""
    if 0 <= char_id < len(HARDCORE_VOCAB):
        return HARDCORE_VOCAB[char_id]
    return None
