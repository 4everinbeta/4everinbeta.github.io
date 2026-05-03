# Coding Conventions

**Analysis Date:** 2026-05-03

## Naming Patterns

**Files:**
- Python files: `snake_case.py` (e.g., `build_embeddings.py`, `generate_blog.py`, `test_build_embeddings.py`)
- JavaScript files: `kebab-case.js` (e.g., `chat-worker.js`, `rag-helpers.js`, `rag-helpers.test.js`)
- Constants/data files: `kebab-case.json` (e.g., `blog_posts.json`, `package.json`)
- Test files: Suffix with `.test.js` (Node.js) or prefix with `test_` (Python)

**Functions:**
- Python: `snake_case()` functions (e.g., `read_documents()`, `chunk_text()`, `embed_with_fake_vectors()`)
- JavaScript: `camelCase()` functions (e.g., `cosineSimilarity()`, `rankDocuments()`, `handleChat()`)
- Class methods: Follow parent language convention (Python methods snake_case, JS methods camelCase)

**Variables:**
- Python: `UPPER_SNAKE_CASE` for module-level constants (e.g., `CONTENT_DIR`, `CHUNK_SIZE`, `FAKE_DIMENSION`)
- Python: `snake_case` for regular variables (e.g., `raw_docs`, `embeddings`, `entry_id`)
- JavaScript: `camelCase` for variables (e.g., `bestScore`, `queryVector`, `payload`)
- JavaScript: `UPPER_SNAKE_CASE` or `camelCase` for constants (e.g., `DEFAULT_CHAT_ENDPOINT`, `DEFAULT_DOC_URL`)

**Types/Classes:**
- Python: Uses type hints with `List`, `Dict`, `Tuple` from `typing` module
- JavaScript: Classes use `PascalCase` (e.g., `BrandChat`)
- Python: Descriptive variable names with type hints (e.g., `texts: List[str]`, `embeddings: np.ndarray`)

## Code Style

**Formatting:**
- No explicit linter/formatter configured (no `.eslintrc`, `.prettierrc`, or `pyproject.toml` found)
- Python code follows implicit PEP 8 style with 2-space indentation visible in templates
- JavaScript uses 2-space indentation consistently
- No auto-formatting setup; relies on developer discipline

**Linting:**
- No linting tools detected in configuration
- Code quality maintained through manual review and testing

**Line Length:**
- Python appears flexible; long strings are common (e.g., HTML templates in `generate_blog.py`)
- JavaScript similarly flexible with template literals and long descriptions

## Import Organization

**Python Order:**
1. Standard library imports (`import hashlib`, `from pathlib import Path`, `from typing import Dict, List, Tuple`)
2. Third-party imports (`import numpy as np`, `from sentence_transformers import SentenceTransformer`, `from openai import OpenAI`)
3. Relative imports (e.g., `import build_embeddings as rag` in tests)

Example from `build_embeddings.py`:
```python
import hashlib
import json
import os
from pathlib import Path
from typing import Dict, List, Tuple

import numpy as np
```

**JavaScript Order:**
1. ES module imports (`import test from "node:test"`, `import assert from "node:assert/strict"`)
2. Named imports from relative modules (`import { rankDocuments, formatContextSections } from "./rag-helpers.js"`)
3. No unused imports

Example from `chat-worker.js`:
```javascript
import { rankDocuments, formatContextSections } from "./rag-helpers.js";
```

**Path Aliases:**
- No path aliases configured (no `jsconfig.json` or `tsconfig.json`)
- Relative imports with explicit paths (e.g., `"./rag-helpers.js"`)

## Error Handling

**Python Patterns:**
- Broad exception catching with `except Exception as err` followed by context manager re-raise:
  ```python
  try:
      vectors = embed_with_local_model(texts)
      return LOCAL_MODEL_NAME, vectors
  except Exception as err:  # pragma: no cover - network / env failure
      raise RuntimeError(
          "Failed to load the local embedding model. "
          "Ensure huggingface downloads are available or set "
          f"{FAKE_ENV_FLAG}=1 for deterministic test embeddings."
      ) from err
  ```
- Silent catch-and-return-none in utility functions:
  ```python
  def parse_date(value: str):
      try:
          return parsedate_to_datetime(value)
      except Exception:
          return None
  ```
- `SystemExit` for fatal initialization errors: `raise SystemExit("No source documents found in content/")`

**JavaScript Patterns:**
- Throw descriptive errors for preconditions:
  ```javascript
  if (!cache[url]) {
      throw new Error(`Failed to load ${url}: ${res.status}`);
  }
  if (!env.AI) {
      throw new Error("Workers AI binding missing. Add [[ai]] binding.");
  }
  ```
- Try-catch with fallback values:
  ```javascript
  try {
      const res = await fetch(this.remoteEndpoint, {...});
      if (!res.ok) throw new Error(`API ${res.status}`);
      const data = await res.json();
      pending.textContent = data.answer || fallbackResponses[0];
  } catch (error) {
      console.error(error);
      pending.textContent = "The concierge is warming up—try again shortly.";
  }
  ```
- Bare catch blocks for recovery: `} catch { return Response.json(...) }`
- Graceful degradation with fallback responses (`fallbackResponses` array in `chat.js`)

## Logging

**Framework:** `console` and `print()` — no structured logging library

**Python Patterns:**
- Simple print statements for progress:
  ```python
  print(f"Wrote {len(entries)} chunks across {len(raw_docs)} documents.")
  ```
- Used only in `main()` functions, not in library code

**JavaScript Patterns:**
- `console.error()` for exceptions:
  ```javascript
  catch (error) {
      console.error(error);
      pending.textContent = "The concierge is warming up—try again shortly.";
  }
  ```
- No info/debug logging; errors logged only on failures

## Comments

**When to Comment:**
- Inline comments explain non-obvious logic (e.g., `# pragma: no cover - network / env failure`)
- Complex algorithms have comments on key steps (see vector math in `rag-helpers.js`)
- Configuration and constant definitions rarely commented
- No JSDoc or Python docstrings observed (except module docstrings in `generate_blog.py`)

**Documentation Strings:**
- Module-level docstrings in Python:
  ```python
  """Generate static journal pages from blog_posts.json."""
  from __future__ import annotations
  ```
- Type hints serve as inline documentation for function parameters and returns
- No function-level docstrings in observed code

## Function Design

**Size:** Functions are generally 10-40 lines; larger functions (e.g., `build_post_pages()`) decompose multi-step operations with internal helpers

**Parameters:**
- Python: Heavy use of type hints with union types implicit (e.g., `List[Dict[str, str]]`)
- JavaScript: Optional parameters with default values (e.g., `topK = 3`)
- Both languages: Named parameters for clarity; no positional argument chaos

**Return Values:**
- Python: Explicit type hints (e.g., `-> List[Dict]`, `-> Tuple[str, np.ndarray]`)
- JavaScript: Returns objects/arrays with explicit field names (e.g., `{ score, doc, index }`)
- Nullable returns handled via `None`/`null` defaults or exception throwing

**Example from `build_embeddings.py`:**
```python
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
    except Exception as err:
        raise RuntimeError(...) from err
```

## Module Design

**Exports:**
- Python: No explicit `__all__` observed; functions at module root available for import
- JavaScript: Named exports with `export function` and `export default` for default handler:
  ```javascript
  export function cosineSimilarity(a, b) { ... }
  export function rankDocuments(...) { ... }
  export default { async fetch(request, env) { ... } };
  ```

**Barrel Files:**
- No barrel files (`index.js`/`__init__.py`) observed
- Direct imports from specific modules (e.g., `import build_embeddings as rag`)

## Cross-Cutting Patterns

**Environment Variables:**
- Accessed via `os.getenv()` in Python, `env.*` in Cloudflare Workers
- Uppercase naming with defaults defined as constants:
  ```python
  OPENAI_MODEL = os.getenv("OPENAI_EMBEDDING_MODEL", "text-embedding-3-small")
  FAKE_ENV_FLAG = "RAG_FAKE_EMBEDDINGS"
  ```

**Caching:**
- Manual cache objects passed through function chains:
  ```javascript
  const cache = (env.CACHE ||= {});
  const documents = await loadKnowledge(cache, url);
  ```
- Used for expensive I/O operations (HTTP fetches, model loading)

**Data Transformation:**
- Chain-of-responsibility pattern in `generate_blog.py` (load → parse → format → write)
- Functional pipeline in embedding generation: read docs → chunk → embed → serialize

---

*Convention analysis: 2026-05-03*
