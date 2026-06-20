"""Train Hardcore Mode MLP model in pure NumPy.

Loads targets, pre-processes them with a sliding window, trains a simple 2-layer MLP,
and exports the trained weights.
"""

import json
import os
import numpy as np

# Adjust path to import skdm.hardcore_vocab_helper
import sys

PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.append(PROJECT_ROOT)

from skdm import hardcore_vocab_helper


class HardcoreMLP:
    """A 2-layer Multi-Layer Perceptron (MLP) trained in pure NumPy."""

    def __init__(self, vocab_size: int, embed_dim: int = 16, hidden_dim: int = 64):
        self.vocab_size = vocab_size
        self.embed_dim = embed_dim
        self.hidden_dim = hidden_dim

        # TODO: Initialize weights and biases (Embedding, W1, b1, W2, b2)
        self.emb_matrix = np.zeros((vocab_size, embed_dim))
        self.w1 = np.zeros((embed_dim * 5, hidden_dim))
        self.b1 = np.zeros(hidden_dim)
        self.w2 = np.zeros((hidden_dim, vocab_size))
        self.b2 = np.zeros(vocab_size)

    def forward(self, inputs: np.ndarray) -> tuple[np.ndarray, np.ndarray, np.ndarray]:
        """Performs forward pass.

        inputs: shape (batch_size, 5) representing context character IDs.
        Returns: logits, hidden layer activations, embedded vectors.
        """
        # TODO: Implement embedding lookup, flatten, ReLU hidden layer, and output logits
        logits = np.zeros((inputs.shape[0], self.vocab_size))
        h = np.zeros((inputs.shape[0], self.hidden_dim))
        embeds = np.zeros((inputs.shape[0], 5 * self.embed_dim))
        return logits, h, embeds

    def backward(
        self,
        inputs: np.ndarray,
        targets: np.ndarray,
        logits: np.ndarray,
        h: np.ndarray,
        embeds: np.ndarray,
    ) -> dict[str, np.ndarray]:
        """Performs backward pass. Returns gradients."""
        grads = {}
        # TODO: Implement backpropagation for Cross Entropy Loss and ReLU
        return grads

    def train_step(self, inputs: np.ndarray, targets: np.ndarray, lr: float = 0.01):
        """Single gradient step update."""
        # TODO: Forward, backward, and update parameters
        pass

    def export_weights(self) -> dict:
        """Returns weights as serializable lists for JSON export."""
        return {
            "emb_matrix": self.emb_matrix.tolist(),
            "w1": self.w1.tolist(),
            "b1": self.b1.tolist(),
            "w2": self.w2.tolist(),
            "b2": self.b2.tolist(),
        }


def prepare_dataset(vocab_size: int) -> tuple[np.ndarray, np.ndarray]:
    """Loads target sentences and prepares (X, y) sliding window training data."""
    # TODO: Load src/data/targets.json, extract sentences, convert chars to IDs, slide window of size 5
    X = np.zeros((10, 5), dtype=int)
    y = np.zeros(10, dtype=int)
    return X, y


def main():
    print("Training Hardcore MLP model skeleton...")
    # TODO: Load dataset, initialize model, run training epochs, and save weights
    weights_path = os.path.join(
        PROJECT_ROOT, "src", "lib", "practice", "hardcore_weights.json"
    )
    mock_weights = {
        "emb_matrix": [],
        "w1": [],
        "b1": [],
        "w2": [],
        "b2": [],
    }
    with open(weights_path, "w", encoding="utf-8") as f:
        json.dump(mock_weights, f, indent=2)
    print(f"Skeleton weights saved to {weights_path}")


if __name__ == "__main__":
    main()
