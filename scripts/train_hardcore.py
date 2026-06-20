"""Train Hardcore Mode MLP model in pure NumPy.

Loads targets, pre-processes them with a sliding window, trains a simple 2-layer MLP,
and exports the trained weights.
"""

import json
import os
import numpy as np
import sys

PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.append(PROJECT_ROOT)

from skdm import hardcore_vocab_helper


class HardcoreMLP:
    """A 2-layer Multi-Layer Perceptron (MLP) trained in pure NumPy."""

    def __init__(
        self,
        vocab_size: int,
        embed_dim: int = 16,
        hidden_dim: int = 64,
        context_size: int = 6,
    ):
        self.vocab_size = vocab_size
        self.embed_dim = embed_dim
        self.hidden_dim = hidden_dim
        self.context_size = context_size

        # Initialize weights and biases
        np.random.seed(42)
        # He initialization for W1 and Xavier for W2
        self.emb_matrix = np.random.randn(vocab_size, embed_dim) * 0.1
        self.w1 = np.random.randn(embed_dim * context_size, hidden_dim) * np.sqrt(
            2.0 / (embed_dim * context_size)
        )
        self.b1 = np.zeros(hidden_dim)
        self.w2 = np.random.randn(hidden_dim, vocab_size) * np.sqrt(1.0 / hidden_dim)
        self.b2 = np.zeros(vocab_size)

        # Adam state
        self.m = {
            "emb": np.zeros_like(self.emb_matrix),
            "w1": np.zeros_like(self.w1),
            "b1": np.zeros_like(self.b1),
            "w2": np.zeros_like(self.w2),
            "b2": np.zeros_like(self.b2),
        }
        self.v = {
            "emb": np.zeros_like(self.emb_matrix),
            "w1": np.zeros_like(self.w1),
            "b1": np.zeros_like(self.b1),
            "w2": np.zeros_like(self.w2),
            "b2": np.zeros_like(self.b2),
        }
        self.t = 0

    def forward(self, inputs: np.ndarray) -> tuple[np.ndarray, np.ndarray, np.ndarray]:
        """Performs forward pass.

        inputs: shape (batch_size, context_size) representing context character IDs.
        Returns: logits, hidden layer activations, embedded vectors.
        """
        batch_size = inputs.shape[0]

        embeds = self.emb_matrix[inputs]
        embeds_flat = embeds.reshape(batch_size, -1)

        z1 = np.dot(embeds_flat, self.w1) + self.b1
        h = np.maximum(0, z1)  # ReLU

        logits = np.dot(h, self.w2) + self.b2

        return logits, h, embeds_flat

    def backward(
        self,
        inputs: np.ndarray,
        targets: np.ndarray,
        logits: np.ndarray,
        h: np.ndarray,
        embeds_flat: np.ndarray,
    ) -> dict[str, np.ndarray]:
        """Performs backward pass. Returns gradients."""
        batch_size = inputs.shape[0]

        # Softmax and CE Loss gradient
        max_logits = np.max(logits, axis=1, keepdims=True)
        exp_logits = np.exp(logits - max_logits)
        probs = exp_logits / np.sum(exp_logits, axis=1, keepdims=True)

        d_logits = probs.copy()
        d_logits[np.arange(batch_size), targets] -= 1
        d_logits /= batch_size

        d_w2 = np.dot(h.T, d_logits)
        d_b2 = np.sum(d_logits, axis=0)

        d_h = np.dot(d_logits, self.w2.T)
        d_z1 = d_h.copy()
        d_z1[h <= 0] = 0  # ReLU derivative

        d_w1 = np.dot(embeds_flat.T, d_z1)
        d_b1 = np.sum(d_z1, axis=0)

        d_embeds_flat = np.dot(d_z1, self.w1.T)
        d_embeds = d_embeds_flat.reshape(batch_size, self.context_size, self.embed_dim)

        d_emb_matrix = np.zeros_like(self.emb_matrix)
        np.add.at(d_emb_matrix, inputs, d_embeds)

        return {"emb": d_emb_matrix, "w1": d_w1, "b1": d_b1, "w2": d_w2, "b2": d_b2}

    def train_step(
        self, inputs: np.ndarray, targets: np.ndarray, lr: float = 0.001
    ) -> float:
        """Single gradient step update."""
        logits, h, embeds_flat = self.forward(inputs)
        grads = self.backward(inputs, targets, logits, h, embeds_flat)

        # Adam update
        beta1 = 0.9
        beta2 = 0.999
        epsilon = 1e-8
        self.t += 1

        params = {
            "emb": self.emb_matrix,
            "w1": self.w1,
            "b1": self.b1,
            "w2": self.w2,
            "b2": self.b2,
        }

        for k in params:
            g = grads[k]
            self.m[k] = beta1 * self.m[k] + (1 - beta1) * g
            self.v[k] = beta2 * self.v[k] + (1 - beta2) * (g**2)

            m_hat = self.m[k] / (1 - beta1**self.t)
            v_hat = self.v[k] / (1 - beta2**self.t)

            params[k] -= lr * m_hat / (np.sqrt(v_hat) + epsilon)

        # Calc loss for monitoring
        max_logits = np.max(logits, axis=1, keepdims=True)
        exp_logits = np.exp(logits - max_logits)
        probs = exp_logits / np.sum(exp_logits, axis=1, keepdims=True)
        loss = -np.mean(np.log(probs[np.arange(inputs.shape[0]), targets] + 1e-10))
        return loss

    def export_weights(self) -> dict:
        """Returns weights as serializable lists for JSON export."""
        return {
            "emb_matrix": self.emb_matrix.tolist(),
            "w1": self.w1.tolist(),
            "b1": self.b1.tolist(),
            "w2": self.w2.tolist(),
            "b2": self.b2.tolist(),
        }


CHO_MAP = [
    "r", "R", "s", "e", "E", "f", "a", "q", "Q", "t", "T", "d", "w", "W", "c", "z", "x", "v", "g"
]

JUNG_MAP = [
    "k", "o", "i", "O", "j", "p", "u", "P", "h", "hk", "ho", "hl", "y", "n", "nj", "np", "nl", "b", "m", "ml", "l"
]

JONG_MAP = [
    "", "r", "R", "rt", "s", "sw", "sg", "e", "f", "fr", "fa", "fq", "ft", "fx", "fv", "fg", "a", "q", "qt", "t", "T", "d", "w", "c", "z", "x", "v", "g"
]

SINGLE_JAMO_MAP = {
    "ㄱ": "r", "ㄲ": "R", "ㄴ": "s", "ㄷ": "e", "ㄸ": "E", "ㄹ": "f", "ㅁ": "a", 
    "ㅂ": "q", "ㅃ": "Q", "ㅅ": "t", "ㅆ": "T", "ㅇ": "d", "ㅈ": "w", "ㅉ": "W", 
    "ㅊ": "c", "ㅋ": "z", "ㅌ": "x", "ㅍ": "v", "ㅎ": "g",
    "ㅏ": "k", "ㅐ": "o", "ㅑ": "i", "ㅒ": "O", "ㅓ": "j", "ㅔ": "p", "ㅕ": "u", 
    "ㅖ": "P", "ㅗ": "h", "ㅘ": "hk", "ㅙ": "ho", "ㅚ": "hl", "ㅛ": "y", "ㅜ": "n", 
    "ㅝ": "nj", "ㅞ": "np", "ㅟ": "nl", "ㅠ": "b", "ㅡ": "m", "ㅢ": "ml", "ㅣ": "l",
    "ㄵ": "sw", "ㄶ": "sg", "ㄺ": "fr", "ㄻ": "fa", "ㄼ": "fq", "ㄽ": "ft", "ㄾ": "fx", 
    "ㄿ": "fv", "ㅀ": "fg", "ㅄ": "qt"
}

def convert_korean_to_qwerty(text: str) -> str:
    result = []
    for char in text:
        code = ord(char)
        if 0xAC00 <= code <= 0xD7A3:
            idx = code - 0xAC00
            cho_idx = idx // (21 * 28)
            jung_idx = (idx % (21 * 28)) // 28
            jong_idx = idx % 28
            
            result.append(CHO_MAP[cho_idx])
            result.append(JUNG_MAP[jung_idx])
            if JONG_MAP[jong_idx]:
                result.append(JONG_MAP[jong_idx])
        elif char in SINGLE_JAMO_MAP:
            result.append(SINGLE_JAMO_MAP[char])
        else:
            result.append(char)
    return "".join(result)


def prepare_dataset(
    vocab_size: int, context_size: int = 6
) -> tuple[np.ndarray, np.ndarray]:
    """Loads target sentences and prepares (X, y) sliding window training data."""
    targets_path = os.path.join(PROJECT_ROOT, "src", "data", "targets.json")
    with open(targets_path, "r", encoding="utf-8") as f:
        targets_data = json.load(f)

    X_list = []
    y_list = []

    space_id = hardcore_vocab_helper.get_char_id(" ")

    for item in targets_data:
        content = item.get("content", "")
        if not content:
            continue

        # Convert Korean content dynamically into QWERTY string
        qwerty_content = convert_korean_to_qwerty(content)

        # Convert chars to IDs, substituting missing chars with space (if available)
        valid_ids = []
        for c in qwerty_content:
            cid = hardcore_vocab_helper.get_char_id(c)
            if cid != -1:
                valid_ids.append(cid)
            elif space_id != -1:
                valid_ids.append(space_id)

        if len(valid_ids) <= context_size:
            continue

        for i in range(len(valid_ids) - context_size):
            window = valid_ids[i : i + context_size]
            target = valid_ids[i + context_size]
            X_list.append(window)
            y_list.append(target)

    return np.array(X_list, dtype=int), np.array(y_list, dtype=int)


def main():
    print("Training Hardcore MLP model...")
    vocab_size = len(hardcore_vocab_helper.HARDCORE_VOCAB)
    context_size = 6
    X, y = prepare_dataset(vocab_size, context_size)
    print(f"Dataset prepared: X shape {X.shape}, y shape {y.shape}")

    model = HardcoreMLP(vocab_size=vocab_size, context_size=context_size)

    epochs = 10
    batch_size = 64
    lr = 0.001

    num_samples = X.shape[0]
    indices = np.arange(num_samples)

    for epoch in range(epochs):
        np.random.shuffle(indices)
        X_shuffled = X[indices]
        y_shuffled = y[indices]

        epoch_loss = 0.0
        num_batches = 0

        for i in range(0, num_samples, batch_size):
            X_batch = X_shuffled[i : i + batch_size]
            y_batch = y_shuffled[i : i + batch_size]

            loss = model.train_step(X_batch, y_batch, lr=lr)
            epoch_loss += loss
            num_batches += 1

        avg_loss = epoch_loss / num_batches
        print(f"Epoch {epoch + 1}/{epochs} - Loss: {avg_loss:.4f}")

    weights_path = os.path.join(
        PROJECT_ROOT, "src", "lib", "practice", "hardcore_weights.json"
    )
    weights = model.export_weights()
    with open(weights_path, "w", encoding="utf-8") as f:
        # Use compact JSON dump
        json.dump(weights, f, separators=(",", ":"))
    print(f"Trained weights saved to {weights_path}")


if __name__ == "__main__":
    main()
