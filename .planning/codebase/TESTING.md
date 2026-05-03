# Testing Patterns

**Analysis Date:** 2026-05-03

## Test Framework

**Python Runner:**
- `unittest` (Python standard library)
- Config: No explicit config file; uses discovery mode `python -m unittest discover -s tests`
- Location: `tests/test_build_embeddings.py`

**JavaScript Runner:**
- Node.js native `test` module (`node:test`)
- Config: No config file; run directly with `node --test worker/rag-helpers.test.js`
- Location: `worker/rag-helpers.test.js`

**Assertion Library:**
- Python: `unittest.TestCase` assertions (e.g., `self.assertEqual()`, `self.assertGreater()`, `np.testing.assert_array_almost_equal()`)
- JavaScript: `node:assert/strict` (e.g., `assert.strictEqual()`, `assert.ok()`, `assert.match()`)

**Run Commands:**
```bash
npm run test:python              # Run Python tests (RAG_FAKE_EMBEDDINGS=1)
npm run test:worker             # Run Worker tests
npm test                         # Run all tests (both suites)
```

**CI/CD Integration:**
- GitHub Actions workflow: `.github/workflows/build-rag.yml`
- Triggers: Manual dispatch or push to `content/`, `build_embeddings.py`, `requirements-rag.txt`, or `tests/`
- Python tests run with `RAG_FAKE_EMBEDDINGS=1` for deterministic results
- JavaScript tests run before artifact generation

## Test File Organization

**Location:**
- Python tests co-located: `tests/test_build_embeddings.py` (mirrors `build_embeddings.py`)
- JavaScript tests co-located: `worker/rag-helpers.test.js` (alongside `worker/rag-helpers.js`)
- Separate test directory for Python, inline for JavaScript

**Naming:**
- Python: `test_<module>.py` (e.g., `test_build_embeddings.py`)
- JavaScript: `<module>.test.js` (e.g., `rag-helpers.test.js`)

**Structure:**
```
tests/
├── test_build_embeddings.py    # Python RAG tests

worker/
├── rag-helpers.js             # Core utility functions
├── rag-helpers.test.js        # Unit tests for rag-helpers
├── chat-worker.js             # Main Worker logic (not tested directly)
└── wrangler.toml              # Cloudflare config
```

## Test Structure

**Python Suite Organization:**
```python
import os
import unittest
import numpy as np
import build_embeddings as rag

class BuildEmbeddingsTests(unittest.TestCase):
    def setUp(self):
        os.environ[rag.FAKE_ENV_FLAG] = "1"

    def tearDown(self):
        os.environ.pop(rag.FAKE_ENV_FLAG, None)

    def test_chunk_text_respects_overlap(self):
        # Test implementation
        ...
```

**JavaScript Suite Organization:**
```javascript
import test from "node:test";
import assert from "node:assert/strict";
import { cosineSimilarity, rankDocuments, formatContextSections } from "./rag-helpers.js";

test("cosine similarity matches expected value", () => {
    const a = [1, 0, 0];
    const b = [0, 1, 0];
    assert.strictEqual(cosineSimilarity(a, b), 0);
});
```

**Patterns:**
- **Setup pattern:** Python uses `setUp()` to enable fake embeddings via env var; JavaScript tests create fresh data structures
- **Teardown pattern:** Python cleans environment variables in `tearDown()`; JavaScript relies on test isolation
- **Assertion pattern:** Direct assertion calls without helper wrapper functions; uses appropriate assertion for each case

## Test Coverage

**Tests by Module:**

### Python: `tests/test_build_embeddings.py`

**Test 1: `test_chunk_text_respects_overlap()`**
- Verifies word-level chunking with configured overlap
- Checks that consecutive chunks share words at boundary
- Confirms no empty chunks

**Test 2: `test_fake_embeddings_are_deterministic()`**
- Confirms fake embedding mode returns consistent vectors for same input
- Validates shape matches `FAKE_DIMENSION`
- Uses `np.testing.assert_array_almost_equal()` for floating-point comparison

**Coverage:** Tests focus on deterministic behavior; actual embedding model quality not tested (relies on sentence-transformers library)

### JavaScript: `worker/rag-helpers.test.js`

**Test 1: `cosine similarity matches expected value`**
- Unit test for `cosineSimilarity()` function
- Orthogonal vectors (a, b) = 0
- Diagonal vectors (a, c) = 1/sqrt(2)
- Floating-point tolerance: 1e-9

**Test 2: `rankDocuments returns top scoring docs only`**
- Tests `rankDocuments()` with artificial embeddings
- Verifies ranking by cosine similarity to query vector
- Confirms filtering of zero-score documents

**Test 3: `formatContextSections stitches readable prompt`**
- Tests prompt formatting for RAG context
- Validates section numbering and score formatting
- Confirms text inclusion

**Coverage:** Core vector math tested; integration with AI models (chat-worker.js) not tested directly

## Mocking

**Framework:** No explicit mocking library (mock or jest)

**Patterns - Python:**
- Environment variable manipulation for test modes:
  ```python
  os.environ[rag.FAKE_ENV_FLAG] = "1"  # Enable fake embeddings
  ```
- Deterministic fake embeddings (`embed_with_fake_vectors()`) used instead of real model:
  ```python
  def embed_with_fake_vectors(texts: List[str]) -> np.ndarray:
      vectors = []
      for text in texts:
          seed = int(hashlib.sha256(text.encode("utf-8")).hexdigest()[:16], 16)
          rng = np.random.default_rng(seed)
          vectors.append(rng.random(FAKE_DIMENSION))
      return np.vstack(vectors) if vectors else np.zeros((0, FAKE_DIMENSION))
  ```

**Patterns - JavaScript:**
- Test data created inline with known embeddings:
  ```javascript
  const query = [1, 0];
  const embeddings = [
      [1, 0],
      [0, 1],
      [-1, 0]
  ];
  const docs = [
      { id: "first", text: "First" },
      { id: "second", text: "Second" },
      { id: "third", text: "Third" }
  ];
  ```
- No mocking of external services; pure function testing

**What to Mock:**
- Environment variables and feature flags (Python)
- File I/O (not currently mocked; tests create real files)
- External APIs (not tested; handled via fallback responses)

**What NOT to Mock:**
- Core utility functions (tested directly)
- Deterministic math operations
- Document/embedding data structures

## Test Data & Fixtures

**Python Fixtures:**
- Fake embeddings generated deterministically from text hash (no separate fixture files)
- Test documents created inline with factory patterns:
  ```python
  text = " ".join([f"word{i}" for i in range(1000)])
  chunks = rag.chunk_text(text)
  ```

**JavaScript Fixtures:**
- Test data hardcoded inline (vectors, documents):
  ```javascript
  const embeddings = [[1, 0], [0, 1], [-1, 0]];
  const docs = [{ id: "first", text: "First" }, ...];
  ```

**Location:** No separate fixtures directory; all test data defined in test files

## Test Execution Flow

**GitHub Actions CI:**
```bash
# 1. Setup
python -m pip install --upgrade pip
pip install -r requirements-rag.txt

# 2. Run Python tests with fake embeddings (deterministic, fast)
env RAG_FAKE_EMBEDDINGS=1 python -m unittest discover -s tests

# 3. Run Worker tests
node --test worker/rag-helpers.test.js

# 4. Generate real embeddings (if tests pass)
python build_embeddings.py

# 5. Upload artifacts
aws s3 sync rag/ s3://rag-assets/latest
```

**Local Development:**
```bash
# Run specific test module
python -m unittest tests.test_build_embeddings

# Run with verbose output
python -m unittest discover -s tests -v

# Watch mode (manual - no watch script configured)
# Run: node --test worker/rag-helpers.test.js
```

## Test Types

**Unit Tests:**
- Scope: Individual functions (`chunk_text()`, `cosineSimilarity()`, `rankDocuments()`)
- Approach: Pure function testing with synthetic inputs
- Isolation: No external dependencies; all I/O mocked or avoided
- Example: `test_chunk_text_respects_overlap()` tests chunking algorithm in isolation

**Integration Tests:**
- Scope: Multi-step pipelines (embedding generation → document chunking → vector storage)
- Approach: Full `build_embeddings.py` execution with fake embeddings
- Isolation: Uses deterministic fake vectors instead of network calls
- Example: GitHub Action runs `python build_embeddings.py` after tests pass

**E2E Tests:**
- Framework: Not used
- Workaround: Manual testing of chat-worker endpoint via curl/fetch
- Coverage: Chat endpoint (`chat-worker.js`) has no automated tests; relies on GitHub Action artifact validation

## Error Testing

**Python Pattern:**
- No explicit error testing; relies on exception propagation
- `test_fake_embeddings_are_deterministic()` implicitly tests error handling by enabling fake mode and validating shape

**JavaScript Pattern:**
- No explicit error testing; helper functions assume valid inputs
- Chat worker has try-catch at HTTP boundary; error response tested manually

**Recommended Addition:**
```javascript
test("rankDocuments returns empty array for empty embeddings", () => {
    const ranked = rankDocuments([1, 0], [], [], 3);
    assert.strictEqual(ranked.length, 0);
});
```

## Gaps & Untested Areas

**Python (`build_embeddings.py`):**
- `read_documents()` — Not tested; file I/O untested
- `embed_with_openai()` — Not tested; requires OPENAI_API_KEY
- `embed_with_local_model()` — Not tested; requires sentence-transformers model download
- `main()` — Not tested; orchestrator function untested

**JavaScript (`chat-worker.js`):**
- `loadKnowledge()` — Not tested; HTTP fetch untested
- `embedQuery()` — Not tested; Workers AI binding untested
- `runChatModel()` — Not tested; AI model untested
- `handleChat()` — Not tested; HTTP handler untested

**General:**
- No integration tests of full RAG pipeline (read → chunk → embed → rank → generate)
- No e2e tests of chat endpoint
- No error recovery testing (timeout, network failure, invalid API response)

---

*Testing analysis: 2026-05-03*
