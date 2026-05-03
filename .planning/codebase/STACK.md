# Technology Stack

**Analysis Date:** 2026-05-03

## Languages

**Primary:**
- JavaScript (ES6+) - Frontend chat widget and Cloudflare Worker runtime
- Python 3.12+ - RAG pipeline (embeddings generation and blog generation)
- HTML/CSS - Static site pages (GitHub Pages hosting)

## Runtime

**Environment:**
- Node.js 20+ - Worker development and unit testing
- Python 3.12+ - Local development for RAG pipeline
- Cloudflare Workers - Production chat endpoint runtime

**Package Manager:**
- npm 10+ (Node.js/JavaScript projects)
- pip (Python dependency management)
- Lockfile: `package-lock.json` present for npm

## Frameworks

**Core:**
- Cloudflare Workers - Serverless JavaScript runtime for chat concierge

**Testing:**
- Node.js native test runner (built-in, no external framework) - Worker unit tests via `node --test`
- Python unittest - Standard library testing for RAG pipeline

**Build/Dev:**
- GitHub Actions - CI/CD pipeline for RAG asset generation and deployment
- wrangler CLI - Cloudflare Worker development and deployment tool

## Key Dependencies

**Critical:**
- `sentence-transformers==3.0.1` (Python) - Local embedding model loader for BAAI/bge-small-en-v1.5, enables zero-cost local embeddings
- `numpy>=1.26` (Python) - Numerical computing for embedding arrays and vector operations
- `openai>=1.61.1` (Python) - Optional OpenAI API client for alternative embedding provider (text-embedding-3-small)
- `@resvg/resvg-js^2.6.2` (JavaScript) - SVG to PNG conversion for social media image generation

**Infrastructure:**
- Cloudflare Workers AI - Powers both embedding generation and chat response generation
- Cloudflare R2 - Object storage for RAG assets (documents.json and vectors.json)

## Configuration

**Environment:**
- `BRAND_CHAT_ENDPOINT` (JavaScript, window global) - Configures remote chat endpoint; defaults to `https://4everinbeta-chat.workers.dev`
- `RAG_FAKE_EMBEDDINGS=1` (Python) - Enables deterministic fake 64-dimensional embeddings for testing (no model download)
- `OPENAI_API_KEY` (Python, optional) - Enables OpenAI embedding mode instead of local model

**Build:**
- `worker/wrangler.toml` - Cloudflare Worker configuration with AI binding, models, and environment variables
- `package.json` - Node.js project metadata with test scripts
- `requirements-rag.txt` - Python dependencies for RAG pipeline
- `.env.rag.example` - Template for Cloudflare R2 credentials (account ID, access key, secret key)

**Cloudflare Worker Configuration (`worker/wrangler.toml`):**
- `DOCUMENT_URL` = "https://rag.4everinbeta.me/latest/documents.json"
- `VECTOR_URL` = "https://rag.4everinbeta.me/latest/vectors.json"
- `CHAT_MODEL` = "@cf/meta/llama-3.2-3b-instruct"
- `EMBEDDING_MODEL` = "@cf/baai/bge-small-en-v1.5"

## Platform Requirements

**Development:**
- Python 3.12+ with pip
- Node.js 20+ with npm
- `wrangler` CLI (`npm install -g wrangler`)
- GitHub CLI (`gh`) for secret automation
- AWS CLI (for local R2 uploads, optional)
- Cloudflare account with Workers and R2 enabled

**Production:**
- Deployment target: GitHub Pages for static frontend (`4everinbeta.github.io`)
- Cloudflare Workers for chat concierge backend (`4everinbeta-chat.workers.dev`)
- Cloudflare R2 for RAG asset storage (custom domain: `rag.4everinbeta.me`)
- Cloudflare DNS for domain management

---

*Stack analysis: 2026-05-03*
