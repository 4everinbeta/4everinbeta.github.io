# 4everinbeta RAG pipeline

This repo now includes a lightweight retrieval-augmented generation loop that powers the
chat concierge on **4everinbeta.me**.

1. Source content (resume, Profile PDF, essays) lives in `content/`.
2. `build_embeddings.py` chunks each file and generates embeddings. When the `RAG_FAKE_EMBEDDINGS=1`
   flag is set it produces deterministic dummy vectors (for unit tests and environments without
   Hugging Face access); otherwise it uses `sentence-transformers/all-MiniLM-L6-v2`. You can still
   set `OPENAI_API_KEY` if you prefer hosted embeddings, but the GitHub Action relies solely on the
   local model to keep costs at zero.
3. The GitHub Action (`.github/workflows/build-rag.yml`) installs dependencies, runs the unit tests,
   executes the embedder, and uploads `rag/documents.json` + `rag/vectors.json` to Cloudflare R2.
   They are served from a custom subdomain such as `https://rag.4everinbeta.me/latest/documents.json`.
4. `worker/chat-worker.js` (deploy via `wrangler publish`) reads those JSON files, performs
   retrieval, and will eventually call an LLM to craft answers. Its configuration lives in
   `worker/wrangler.toml`.
5. The in-page widget (`chat.js`) now checks for `window.BRAND_CHAT_ENDPOINT`. When defined, it POSTs
   user questions to the Worker; otherwise it falls back to the curated knowledge array.

### Local usage

```bash
python -m venv .venv && source .venv/bin/activate
pip install -r requirements-rag.txt
RAG_FAKE_EMBEDDINGS=1 python build_embeddings.py  # quick fake run
# or, with full embeddings (requires huggingface downloads)
python build_embeddings.py
```

### Deployment steps

1. Create an R2 bucket (e.g., `rag-assets`) and bind it to `rag.4everinbeta.me`. Store the bucket
   credentials in the repository secrets `CF_ACCOUNT_ID`, `CF_R2_ACCESS_KEY`, and
   `CF_R2_SECRET_KEY`.
2. Trigger the **Build RAG assets** workflow. It will run the tests, generate the fresh JSON, upload
   them to R2, and attach the output as a workflow artifact for debugging.
3. Deploy the Worker:

   ```bash
   cd worker
   npm install wrangler --global
   wrangler publish --name 4everinbeta-chat
   ```

4. In your HTML (e.g., `index.html`), set `window.BRAND_CHAT_ENDPOINT =
   "https://4everinbeta-chat.workers.dev"` so the UI calls the Worker. A Cloudflare custom domain
   works equally well if you prefer `chat.4everinbeta.me`.
