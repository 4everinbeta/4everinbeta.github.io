# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

This is a personal brand site for Ryan Brown (4everinbeta) that combines:
1. A static executive-branding site hosted on GitHub Pages
2. A lightweight blog generator
3. A RAG (Retrieval-Augmented Generation) chat concierge powered by Cloudflare Workers AI

The site is deployed at `4everinbeta.me` with GitHub Pages, while the chat backend runs on Cloudflare Workers (`4everinbeta-chat.workers.dev`).

## Project Architecture

### RAG Pipeline (Python → R2 → Worker)

The knowledge base flows through three stages:

1. **Source Content** (`content/`): Resume and profile documents in plain text
2. **Embedding Generation** (`build_embeddings.py`): Chunks documents and creates vector embeddings
3. **R2 Storage**: GitHub Action uploads `rag/documents.json` and `rag/vectors.json` to Cloudflare R2 at `rag.4everinbeta.me/latest/`
4. **Worker Runtime** (`worker/chat-worker.js`): Fetches JSON, embeds queries with Workers AI, performs vector search, and generates responses

### Frontend (Static Site)

- `chat.js`: Interactive chat widget that POSTs questions to the Worker endpoint
- Fallback to keyword-based responses if `window.BRAND_CHAT_ENDPOINT` is not set
- Contact form uses `mailto:` links to open the user's email client

### Cloudflare Worker

- `worker/chat-worker.js`: Main entry point with CORS handling
- `worker/rag-helpers.js`: Vector similarity and document ranking utilities
- `worker/wrangler.toml`: Configuration including AI binding and environment variables

The Worker uses two AI models:
- `@cf/baai/bge-small-en-v1.5` for embeddings (matches the Python pipeline model)
- `@cf/meta/llama-3.2-3b-instruct` for chat responses

## Common Commands

### Local Development

```bash
# Install Python dependencies (RAG pipeline)
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements-rag.txt

# Quick test with fake embeddings (deterministic, fast)
RAG_FAKE_EMBEDDINGS=1 python build_embeddings.py

# Full embedding build (downloads BAAI/bge-small-en-v1.5 model)
python build_embeddings.py

# Run Python tests
python -m unittest discover -s tests

# Run Worker unit tests
node --test worker/rag-helpers.test.js

# Run all tests
npm test
```

### Deployment

```bash
# Deploy Cloudflare Worker (requires wrangler login first)
./scripts/publish-worker.sh

# Set R2 credentials as GitHub secrets (one-time setup)
./scripts/set-r2-secrets.sh
```

The GitHub Action `.github/workflows/build-rag.yml` automatically:
1. Runs Python and Worker tests
2. Generates embeddings with the local model
3. Uploads JSON files to R2 via AWS CLI
4. Attaches artifacts to the workflow run

Triggers: manual dispatch or changes to `content/`, `build_embeddings.py`, `requirements-rag.txt`, or `tests/`

## Key Implementation Details

### Embedding Strategy

The Python pipeline (`build_embeddings.py`) supports three modes:
- **Fake embeddings**: Set `RAG_FAKE_EMBEDDINGS=1` for deterministic 64-dim vectors (used in tests)
- **OpenAI**: Set `OPENAI_API_KEY` to use `text-embedding-3-small`
- **Local model**: Default uses `BAAI/bge-small-en-v1.5` via sentence-transformers (matches Worker AI model)

The GitHub Action always uses the local model to keep costs at zero.

### Document Chunking

- Chunk size: 600 words
- Overlap: 120 words
- Minimum chunk: 40% of chunk size (240 words)
- Small trailing chunks are discarded to avoid low-quality fragments

### R2 Access Configuration

The R2 bucket custom domain (`rag.4everinbeta.me`) must have:
- **Custom Domain** configured in R2 settings
- **Access Disabled** (not Zero Trust) to avoid 403 errors
- DNS record is auto-created and locked by Cloudflare

Credentials stored in GitHub secrets: `CF_ACCOUNT_ID`, `CF_R2_ACCESS_KEY`, `CF_R2_SECRET_KEY`

### Worker CORS Handling

The Worker includes permissive CORS headers to allow GitHub Pages frontend to call it:
- `Access-Control-Allow-Origin: *`
- OPTIONS preflight handler for POST requests
- All responses include CORS headers

### Chat Widget Integration

In HTML pages, set the endpoint before loading `chat.js`:

```html
<script>
  window.BRAND_CHAT_ENDPOINT = "https://4everinbeta-chat.workers.dev";
</script>
<script src="chat.js"></script>
```

If undefined, the widget falls back to keyword-based responses using `brandChatKnowledge` array.

## Testing Strategy

- **Python tests** (`tests/test_build_embeddings.py`): Use fake embeddings for deterministic results
- **Worker tests** (`worker/rag-helpers.test.js`): Node.js native test runner for helper functions
- GitHub Action runs both test suites before building/deploying

## File Structure

```
content/              # Source documents (resume.txt, profile.txt)
rag/                  # Generated embeddings (gitignored, uploaded to R2)
worker/               # Cloudflare Worker code
  chat-worker.js      # Main Worker entry point
  rag-helpers.js      # Vector search utilities
  rag-helpers.test.js # Unit tests
  wrangler.toml       # Worker configuration
scripts/              # Deployment helpers
  publish-worker.sh   # Worker deployment wrapper
  set-r2-secrets.sh   # GitHub secrets automation
tests/                # Python unit tests
build_embeddings.py   # RAG pipeline entry point
chat.js               # Frontend chat widget
```
