import hashlib
import json
import os
from pathlib import Path
from typing import Dict, List, Tuple

import numpy as np


CONTENT_DIR = Path("content")
OUTPUT_DIR = Path("rag")
CHUNK_SIZE = 600  # words
CHUNK_OVERLAP = 120  # words
LOCAL_MODEL_NAME = "sentence-transformers/all-MiniLM-L6-v2"
OPENAI_MODEL = os.getenv("OPENAI_EMBEDDING_MODEL", "text-embedding-3-small")
FAKE_DIMENSION = 64
FAKE_ENV_FLAG = "RAG_FAKE_EMBEDDINGS"


def read_documents() -> List[Dict]:
    docs = []
    for path in sorted(CONTENT_DIR.glob("*")):
        if path.is_file() and path.suffix.lower() in {".txt", ".md"}:
            text = path.read_text().strip()
            if not text:
                continue
            docs.append({"id": path.stem, "source": str(path), "text": text})
    return docs


def chunk_text(text: str) -> List[str]:
    words = text.split()
    if not words:
        return []
    chunks = []
    step = CHUNK_SIZE - CHUNK_OVERLAP
    for start in range(0, len(words), step):
        end = min(len(words), start + CHUNK_SIZE)
        chunk_words = words[start:end]
        if len(chunk_words) < CHUNK_SIZE * 0.4 and start != 0:
            break
        chunks.append(" ".join(chunk_words))
        if end == len(words):
            break
    return chunks


def build_entries(raw_docs: List[Dict]) -> List[Dict]:
    entries = []
    for doc in raw_docs:
        for idx, chunk in enumerate(chunk_text(doc["text"])):
            entry_id = f"{doc['id']}-{idx}"
            entries.append(
                {
                    "id": entry_id,
                    "source": doc["source"],
                    "chunk_index": idx,
                    "text": chunk,
                }
            )
    return entries


def embed_with_openai(texts: List[str]) -> np.ndarray:
    from openai import OpenAI

    client = OpenAI()
    batched = []
    batch_size = 20
    for i in range(0, len(texts), batch_size):
        chunk = texts[i : i + batch_size]
        resp = client.embeddings.create(model=OPENAI_MODEL, input=chunk)
        batched.extend([item.embedding for item in resp.data])
    return np.array(batched)


def embed_with_local_model(texts: List[str]) -> np.ndarray:
    from sentence_transformers import SentenceTransformer

    model = SentenceTransformer(LOCAL_MODEL_NAME)
    return model.encode(texts, convert_to_numpy=True)


def embed_with_fake_vectors(texts: List[str]) -> np.ndarray:
    vectors = []
    for text in texts:
        seed = int(hashlib.sha256(text.encode("utf-8")).hexdigest()[:16], 16)
        rng = np.random.default_rng(seed)
        vectors.append(rng.random(FAKE_DIMENSION))
    return np.vstack(vectors) if vectors else np.zeros((0, FAKE_DIMENSION))


def generate_embeddings(texts: List[str]) -> Tuple[str, np.ndarray]:
    if not texts:
        return LOCAL_MODEL_NAME, np.zeros((0, FAKE_DIMENSION))

    if os.getenv(FAKE_ENV_FLAG) == "1":
        return "debug-fake-embeddings", embed_with_fake_vectors(texts)

    if os.getenv("OPENAI_API_KEY"):
        return OPENAI_MODEL, embed_with_openai(texts)

    try:
        vectors = embed_with_local_model(texts)
        return LOCAL_MODEL_NAME, vectors
    except Exception as err:  # pragma: no cover - network / env failure
        raise RuntimeError(
            "Failed to load the local embedding model. "
            "Ensure huggingface downloads are available or set "
            f"{FAKE_ENV_FLAG}=1 for deterministic test embeddings."
        ) from err


def main():
    raw_docs = read_documents()
    if not raw_docs:
        raise SystemExit("No source documents found in content/")

    entries = build_entries(raw_docs)
    texts = [entry["text"] for entry in entries]
    model_name, embeddings = generate_embeddings(texts)

    OUTPUT_DIR.mkdir(exist_ok=True)
    docs_path = OUTPUT_DIR / "documents.json"
    vectors_path = OUTPUT_DIR / "vectors.json"

    docs_path.write_text(json.dumps(entries, indent=2))
    vectors_path.write_text(
        json.dumps(
            {
                "model": model_name,
                "dimension": embeddings.shape[1],
                "embeddings": embeddings.round(6).tolist(),
            },
            indent=2,
        )
    )
    print(f"Wrote {len(entries)} chunks across {len(raw_docs)} documents.")


if __name__ == "__main__":
    main()
