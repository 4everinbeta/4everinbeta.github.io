<!-- refreshed: 2026-05-03 -->
# Architecture

**Analysis Date:** 2026-05-03

## System Overview

```text
┌─────────────────────────────────────────────────────────────┐
│                    Frontend Layer (Static)                   │
│  HTML Pages + CSS + Chat Widget                              │
│  `index.html`, `journal.html`, `resume.html`, `chat.js`      │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ├─────────────────────┐
                       │                     │
        ┌──────────────▼──────┐  ┌──────────▼────────────┐
        │ Optional Remote     │  │ Content Generation    │
        │ Chat API            │  │ (Blog Generator)      │
        │ Cloudflare Worker   │  │ `generate_blog.py`    │
        │ `chat-worker.js`    │  └───────────────────────┘
        └──────────────┬──────┘
                       │
        ┌──────────────▼──────────────────┐
        │   RAG Pipeline                   │
        │ `build_embeddings.py`            │
        ├──────────────┬──────────────────┤
        │ Embeddings   │ Vector Store     │
        │ Module       │ (Cloudflare R2)  │
        └──────────────┴──────────────────┘
                       │
        ┌──────────────▼──────────────────┐
        │  Source Content                  │
        │  `content/` (resume.txt, etc)    │
        └──────────────────────────────────┘
```

## Component Responsibilities

| Component | Responsibility | File |
|-----------|----------------|------|
| **Frontend HTML** | Landing pages, resume, journal listing, post pages | `index.html`, `resume.html`, `journal.html`, `journal/*.html` |
| **Chat Widget** | Interactive chat UI, message display, fallback responses | `chat.js` |
| **Chat Worker** | RAG orchestration, vector search, LLM generation | `worker/chat-worker.js` |
| **RAG Helpers** | Cosine similarity, document ranking, context formatting | `worker/rag-helpers.js` |
| **Embedding Pipeline** | Chunk documents, generate embeddings, output JSON | `build_embeddings.py` |
| **Blog Generator** | Transform blog_posts.json into static journal pages | `generate_blog.py` |
| **Source Content** | Plain-text resume and profile for RAG ingestion | `content/resume.txt`, `content/profile.txt` |

## Pattern Overview

**Overall:** Multi-stage RAG (Retrieval-Augmented Generation) system with static site hosting, optional serverless chat backend, and offline-capable fallback.

**Key Characteristics:**
- Hybrid deployment: GitHub Pages (static) + Cloudflare Workers (optional serverless)
- Zero database—all data is static JSON (documents, vectors) stored in R2 or served from pages
- Offline fallback: Chat widget works without remote endpoint via hardcoded keyword matching
- Build-time vector generation: Embeddings computed once, served immutably
- Single-page rendering: All HTML pre-rendered, no client-side framework

## Layers

**Frontend Static Layer:**
- Purpose: Deliver brand, resume, and blog as a fast, SEO-friendly static site
- Location: Repository root (`index.html`, `journal.html`, etc.)
- Contains: HTML with embedded styling, navigation structure, chat widget initialization
- Depends on: CSS (`styles.css`), chat widget script (`chat.js`), blog data (`blog_posts.json`)
- Used by: Visitors to 4everinbeta.me

**Chat Widget Layer:**
- Purpose: Enable interactive Q&A about Ryan's background, work, and expertise
- Location: `chat.js`
- Contains: BrandChat class with two operating modes (remote API, local fallback)
- Depends on: `window.BRAND_CHAT_ENDPOINT` (optional), knowledge base (`brandChatKnowledge`)
- Used by: All frontend pages (injected via script tag)

**Chat API Layer (Optional):**
- Purpose: Provide serverless RAG-powered responses to chat queries
- Location: `worker/chat-worker.js`, `worker/rag-helpers.js`
- Contains: HTTP request handler, vector embedding, document ranking, LLM integration
- Depends on: Cloudflare Workers AI binding, R2 storage for `documents.json` and `vectors.json`
- Used by: Chat widget (if `window.BRAND_CHAT_ENDPOINT` is configured)

**RAG Pipeline Layer:**
- Purpose: Transform source content into queryable embeddings
- Location: `build_embeddings.py`
- Contains: Document reading, text chunking, embedding generation, JSON serialization
- Depends on: Source files in `content/`, embedding model (local or API)
- Used by: GitHub Action (build-rag.yml) → R2 upload
- Produces: `rag/documents.json`, `rag/vectors.json`

**Blog Generation Layer:**
- Purpose: Generate static journal pages from centralized blog_posts.json
- Location: `generate_blog.py`
- Contains: Post listing, individual post page templates, date parsing
- Depends on: `blog_posts.json` (hand-maintained), style imports
- Used by: Manual invocation after editing blog_posts.json
- Produces: `journal.html` and `journal/*.html` files

## Data Flow

### Primary Chat Request Path

1. **User submits question** (`chat.js:handleSubmit`, line 91-100)
   - Input validated (non-empty after trim)
   - User message displayed in chat UI
   - Handler calls `reply(text)`

2. **Route to remote or local** (`chat.js:reply`, line 110-122)
   - If `this.remoteEndpoint` set → `requestRemoteAnswer(text)`
   - Else → local fallback via `findBestResponse(text)`

3. **Remote Path: POST to Worker** (`chat.js:requestRemoteAnswer`, line 124-145)
   - Fetch POST to `window.BRAND_CHAT_ENDPOINT`
   - Body: `{ message: text }`
   - Shows pending "Synthesizing a response…" message
   - Replaces pending with response on success, or fallback on 4xx/5xx

4. **Worker receives request** (`worker/chat-worker.js:handleChat`, line 57-100)
   - Parse JSON body, extract `message`
   - Load documents and vectors from R2 (cached in `env.CACHE`)
   - Embed query using `embedQuery(env, message)` → Cloudflare AI

5. **Vector similarity search** (`worker/rag-helpers.js:rankDocuments`, line 21-35)
   - Compute cosine similarity between query vector and all document vectors
   - Sort by score descending, take top K (4 by default)
   - Filter out scores below 0

6. **Format context** (`worker/rag-helpers.js:formatContextSections`, line 38-48)
   - Create human-readable prompt with ranked documents
   - Format: "Source 1 (score 0.88):\n{document text}"

7. **Generate response** (`worker/chat-worker.js:runChatModel`, line 37-54)
   - Call Cloudflare LLM (`@cf/meta/llama-3.2-3b-instruct`)
   - System prompt: "You are Ryan Brown's executive concierge…"
   - User prompt: Context + question
   - Return generated response text

8. **Response sent to client** (`chat.js`)
   - Replace pending message with generated answer
   - Auto-scroll chat panel

### Local Fallback Path

1. User submits question (same as remote path)
2. `findBestResponse(text)` called in `chat.js` (line 147+)
3. Keyword matching against `brandChatKnowledge` array (6 topics)
4. Best match selected by keyword frequency score
5. Response shown after 400ms artificial delay (line 119-121)
6. If no match, random fallback from `fallbackResponses` array

### Blog Generation Path

1. **Manual trigger**: `python generate_blog.py`
2. **Load blog_posts.json** (`generate_blog.py:load_posts`, line 15-25)
   - Parse JSON array
   - Parse RFC 2822 pubDate to datetime
   - Format for display
   - Sort by date descending
3. **Build listing page** (`generate_blog.py:build_list_page`, line 77-143)
   - Create card grid of all posts
   - Each card: title, date, excerpt, "Read essay" link
   - Output: `journal.html`
4. **Build individual post pages** (`generate_blog.py:build_post_pages`, line 146-216)
   - For each post, render full template with:
     - Navigation bar (with prefix for journal/ subdirectory)
     - Hero section (date, title, optional intro)
     - Post content (pre-rendered HTML from blog_posts.json)
     - Dark mode toggle
     - Back link
   - Output: `journal/{slug}.html`

### Embedding Pipeline Path

1. **GitHub Action triggers** (on push to `content/`, `build_embeddings.py`, etc.)
2. **read_documents()** (`build_embeddings.py:read_documents`, line 20-28)
   - Scan `content/` for `.txt` and `.md` files
   - Load raw text
3. **build_entries()** (`build_embeddings.py:build_entries`, line 48-61)
   - Chunk each document with 600-word size, 120-word overlap
   - Minimum trailing chunk: 240 words (40% of chunk size)
   - Create entry IDs: `{doc_id}-{chunk_index}`
4. **generate_embeddings()** (`build_embeddings.py:generate_embeddings`, line 93-111)
   - Mode selection (fake for tests, OpenAI if API key set, local model default)
   - Local model: `BAAI/bge-small-en-v1.5` via sentence-transformers
   - Returns: model name, embeddings array (normalized, rounded to 6 decimals)
5. **Output JSON** (`build_embeddings.py:main`, line 114-139)
   - `rag/documents.json`: Array of entries with id, source, text
   - `rag/vectors.json`: Object with model name, dimension, embeddings array
6. **GitHub Action uploads to R2**
   - AWS CLI sync to `s3://rag-assets/latest`
   - Accessible at `https://rag.4everinbeta.me/latest/`

**State Management:**
- Frontend chat state: In-memory (chat messages, UI state, endpoint resolution)
- Worker state: Ephemeral (per-request document/vector cache in `env.CACHE`)
- Blog state: Pre-generated static HTML (no runtime state)
- Persistent state: All in static JSON files (documents.json, vectors.json, blog_posts.json) on R2 or GitHub Pages

## Key Abstractions

**BrandChat Class:**
- Purpose: Encapsulate chat UI and logic, switching between remote and local modes
- Examples: `chat.js`, lines 49-180
- Pattern: Class-based with toggle(), handleSubmit(), reply() methods; dual-mode response generation

**Embedding Mode Polymorphism:**
- Purpose: Allow embedding generation from multiple sources without code duplication
- Examples: `build_embeddings.py:generate_embeddings()`, lines 93-111
- Pattern: Single entry point, environment-driven selection (RAG_FAKE_EMBEDDINGS, OPENAI_API_KEY, fallback to local)

**Worker RAG Orchestration:**
- Purpose: Coordinate loading, embedding, ranking, and LLM generation in single request
- Examples: `worker/chat-worker.js:handleChat()`, lines 57-100
- Pattern: Async function with cache layer, error handling, fallback response

**Vector Similarity as Function:**
- Purpose: Decouple similarity computation from document ranking
- Examples: `worker/rag-helpers.js:cosineSimilarity()`, lines 1-19
- Pattern: Pure function, testable in isolation

## Entry Points

**index.html:**
- Location: `/home/rbrown/workspace/4everinbeta/index.html`
- Triggers: HTTP GET from user browser to https://4everinbeta.me/
- Responsibilities: Render landing page with navigation, impact section, career section, focus areas, contact form, chat widget

**chat.js:**
- Location: `/home/rbrown/workspace/4everinbeta/chat.js`
- Triggers: Script load in all HTML pages (via `<script defer src="chat.js"></script>`)
- Responsibilities: Instantiate BrandChat on DOM ready, set up event listeners, handle chat submission

**chat-worker.js:**
- Location: `/home/rbrown/workspace/4everinbeta/worker/chat-worker.js`
- Triggers: HTTP POST from chat.js to `https://4everinbeta-chat.workers.dev/`
- Responsibilities: Parse request, coordinate RAG pipeline, return JSON response

**generate_blog.py:**
- Location: `/home/rbrown/workspace/4everinbeta/generate_blog.py`
- Triggers: Manual execution (`python generate_blog.py`) after editing blog_posts.json
- Responsibilities: Load posts, generate journal.html and journal/*.html

**build_embeddings.py:**
- Location: `/home/rbrown/workspace/4everinbeta/build_embeddings.py`
- Triggers: GitHub Action (build-rag.yml) on push, or manual execution
- Responsibilities: Read source documents, chunk, embed, output JSON to rag/

## Architectural Constraints

- **Threading:** JavaScript (browser + Worker) is single-threaded event-loop. Python is synchronous, single-process. No multi-threading used.
- **Global state:** 
  - `chat.js`: No module-level state; all state encapsulated in BrandChat instance
  - `worker/chat-worker.js`: `env.CACHE` object used as ephemeral document/vector cache per Worker instance
  - No persistent global state across requests
- **Circular imports:** None detected in codebase (Python and JS both use clean dependency direction)
- **Static generation:** All user-facing HTML pre-rendered at build/deploy time; no server-side rendering at request time
- **Zero persistence:** No database, no persistent session store, no file uploads. Everything read-only except blog_posts.json (hand-edited)
- **CORS requirement:** Worker must return `Access-Control-Allow-*` headers to allow cross-origin fetch from GitHub Pages

## Anti-Patterns

### Fallback Mode Coupling

**What happens:** Chat widget has two fundamentally different code paths (remote API vs. local fallback). Local fallback uses hardcoded `brandChatKnowledge` array that is not synced with source content or blog posts.

**Why it's wrong:** Knowledge can drift between source of truth (resume.txt, profile.txt) and hardcoded fallback. If Worker is unavailable, users get stale info. Maintaining both is a manual burden.

**Do this instead:** Generate `brandChatKnowledge` from `blog_posts.json` and source content as part of the build pipeline. Embed it into chat.js at build time. Single source of truth.

### R2 as Authority for Live Embeddings

**What happens:** Worker fetches documents.json and vectors.json from R2 as the authority source. If R2 is unavailable or misconfigured, chat breaks silently with "warming up" fallback.

**Why it's wrong:** No retry logic, no heartbeat check, no visibility into R2 health. Users see degraded mode without knowing why. Hard to debug in production.

**Do this instead:** Implement retry with exponential backoff, emit metrics on fetch failure, pre-warm cache from local copy or CDN backup if available.

### Environment Variable String Parsing

**What happens:** Worker embeds configuration as string variables in wrangler.toml (line 6-9: DOCUMENT_URL, VECTOR_URL, etc.). Changes require redeploy.

**Why it's wrong:** Hard to test with different endpoints, hard to do blue-green deployments, no feature flag support for routing to different RAG sources.

**Do this instead:** Accept URL overrides in request headers or query params, with sane defaults. Allow runtime routing without redeploy.

## Error Handling

**Strategy:** Defensive graceful degradation. Chat widget never crashes; it always has a response (remote answer, local fallback, or generic error message).

**Patterns:**
- Worker catches JSON parse errors → return 400 with error message
- Worker catches missing AI binding → return error response before trying to embed
- Worker catches fetch failures for R2 → fall back to inline default response
- Chat widget catches fetch errors → replace pending message with "The concierge is warming up"
- Chat widget has no unhandled promise rejections; all fetch wrapped in try-catch

## Cross-Cutting Concerns

**Logging:** 
- Python: No structured logging; print statements to stdout captured by GitHub Action
- Worker: No explicit logging; could benefit from adding to Cloudflare Logpush
- Browser: Errors logged to console; no remote error tracking

**Validation:**
- Chat.js: Validates message non-empty, text type
- Worker: Validates message field exists in request body, validates JSON shape
- Python: Validates content directory exists, raises SystemExit if no source documents

**Authentication:**
- None. All endpoints public. No auth required for chat or static pages.
- R2 bucket configured with access disabled (not Zero Trust), allowing public read
- Contact form uses mailto: links (user's local email client handles auth)

---

*Architecture analysis: 2026-05-03*
