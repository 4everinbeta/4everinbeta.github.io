# External Integrations

**Analysis Date:** 2026-05-03

## APIs & External Services

**Cloudflare Workers AI (Remote Inference):**
- Embedding model: BAAI/bge-small-en-v1.5 for semantic search
  - SDK/Client: `env.AI` binding in `worker/chat-worker.js:26`
  - Called by: `embedQuery()` function
- Chat model: Meta Llama 3.2 3B Instruct for response generation
  - SDK/Client: `env.AI` binding in `worker/chat-worker.js:53`
  - Called by: `runChatModel()` function

**OpenAI Embeddings API (Optional Alternative):**
- Service: Text embedding for RAG when `OPENAI_API_KEY` is set
- Model: `text-embedding-3-small` (configurable via `OPENAI_EMBEDDING_MODEL` env var)
- SDK/Client: `openai>=1.61.1` package, imported in `build_embeddings.py:65`
- When enabled: Used by `embed_with_openai()` in `build_embeddings.py:64-74`
- Auth: `OPENAI_API_KEY` environment variable

## Data Storage

**Databases:**
- None (fully static + serverless)

**File Storage:**
- **Cloudflare R2 (Primary):** Object storage for RAG asset delivery
  - Bucket: `rag-assets` (organization-specific)
  - Custom domain: `rag.4everinbeta.me`
  - Contents:
    - `latest/documents.json` — Chunked source documents with metadata (loaded by Worker)
    - `latest/vectors.json` — Embedding vectors for semantic search (loaded by Worker)
  - Credentials stored in GitHub secrets: `CF_ACCOUNT_ID`, `CF_R2_ACCESS_KEY`, `CF_R2_SECRET_KEY`
  - Configured in: `worker/wrangler.toml` with vars `DOCUMENT_URL` and `VECTOR_URL`

- **Local Filesystem (Development):** 
  - `content/` directory: Source documents (`resume.txt`, `profile.txt`)
  - `rag/` directory: Generated embeddings and vectors (gitignored)
  - `journal/` directory: Generated blog post pages

**Caching:**
- Cloudflare Workers: In-memory object cache within request handler (`env.CACHE` in `worker/chat-worker.js:69`)

## Authentication & Identity

**Auth Provider:**
- None for chat widget (public, unauthenticated)
- Contact form: Mailto links (client-side, no auth required)

**Implementation:**
- Chat API: No authentication; Worker uses permissive CORS headers (`Access-Control-Allow-Origin: *`)
- R2 access: Restricted via Cloudflare API credentials stored in GitHub secrets
- GitHub Actions: Uses environment variables for R2 credentials (`CF_ACCOUNT_ID`, `CF_R2_ACCESS_KEY`, `CF_R2_SECRET_KEY`)

## Monitoring & Observability

**Error Tracking:**
- None (no external service)

**Logs:**
- Cloudflare Workers: Standard Workers logs (accessible via wrangler dashboard)
- Python pipeline: stdout/stderr in GitHub Actions workflow
- Error messages: Fallback responses hardcoded in `chat.js:115` and `worker/chat-worker.js:84, 110, 114`

## CI/CD & Deployment

**Hosting:**
- **Frontend:** GitHub Pages (static site at `4everinbeta.github.io` mapped to custom domain `4everinbeta.me`)
- **Chat Backend:** Cloudflare Workers (`4everinbeta-chat.workers.dev` with optional custom subdomain mapping)
- **RAG Assets:** Cloudflare R2 with custom domain (`rag.4everinbeta.me`)

**CI Pipeline:**
- GitHub Actions (`.github/workflows/build-rag.yml`)
- Triggers: Manual dispatch or pushes to `content/`, `build_embeddings.py`, `requirements-rag.txt`, or `tests/`
- Steps:
  1. Install Python 3.12 via `actions/setup-python@v5`
  2. Run unit tests: Python (`python -m unittest discover -s tests`) and Worker (`node --test worker/rag-helpers.test.js`)
  3. Generate embeddings: `python build_embeddings.py` (uses local BAAI model by default)
  4. Upload to R2: AWS CLI to `https://${CF_ACCOUNT_ID}.r2.cloudflarestorage.com` S3-compatible endpoint
  5. Attach artifacts: Upload `rag/*.json` to workflow run

**Deployment Commands:**
- Worker deployment: `./scripts/publish-worker.sh` (wraps `wrangler publish`)
- R2 credentials setup: `./scripts/set-r2-secrets.sh` (uses `gh secret set` to populate GitHub secrets)

## Environment Configuration

**Required env vars (Development):**
- `CF_ACCOUNT_ID` — Cloudflare account ID for R2 access
- `CF_R2_ACCESS_KEY` — R2 API access key
- `CF_R2_SECRET_KEY` — R2 API secret key
- `RAG_FAKE_EMBEDDINGS=1` (optional) — Use deterministic fake embeddings for fast testing

**Optional env vars:**
- `OPENAI_API_KEY` — Enable OpenAI embeddings instead of local model
- `BRAND_CHAT_ENDPOINT` (client-side, set in HTML) — Custom Worker endpoint URL (defaults to `https://4everinbeta-chat.workers.dev`)

**Secrets location:**
- `.env.rag.example` — Template file (never committed with real values)
- GitHub Actions secrets: `CF_ACCOUNT_ID`, `CF_R2_ACCESS_KEY`, `CF_R2_SECRET_KEY` (set via `scripts/set-r2-secrets.sh`)
- Worker environment: Configured in `worker/wrangler.toml` under `[vars]` section

## Webhooks & Callbacks

**Incoming:**
- None

**Outgoing:**
- Contact form: Uses client-side `mailto:` URI scheme to open user's email client (no HTTP callbacks)
- Chat form: POSTs to Cloudflare Worker endpoint (`window.BRAND_CHAT_ENDPOINT`) with JSON payload `{ "message": "..." }`

---

*Integration audit: 2026-05-03*
