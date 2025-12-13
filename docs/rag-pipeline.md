# 4everinbeta RAG pipeline

This repo now includes a lightweight retrieval augmented generation loop:

1. Source material lives in `content/` (resume, LinkedIn profile, Markdown essays).
2. `build_embeddings.py` chunks those files and either:
   - runs a local `sentence-transformers` model (if Hugging Face access is permitted), or
   - calls OpenAI's `text-embedding-3-small` API when `OPENAI_API_KEY` is set.
3. The script writes `rag/documents.json` and `rag/vectors.json`, which will be served statically.
4. `.github/workflows/build-rag.yml` can be triggered manually (or via content changes) to regenerate the assets and commit the results automatically.
5. `worker/chat-worker.js` (deploy via `wrangler publish`) fetches those JSON files, performs retrieval, and will soon call an LLM to craft answers.
6. `chat.js` now looks for `window.BRAND_CHAT_ENDPOINT` so the UI can call the Worker once it is deployed; otherwise it falls back to the deterministic responses.

### Local usage

```bash
python -m venv .venv && source .venv/bin/activate
pip install -r requirements-rag.txt
OPENAI_API_KEY=sk-... python build_embeddings.py
```

### Deployment steps

1. Add `OPENAI_API_KEY` to the repo's GitHub Actions secrets.
2. Run the `Build RAG assets` workflow from the Actions tab to generate the JSON files.
3. Deploy the Worker:
   ```bash
   cd worker
   npm install wrangler --global  # or use pnpm
   wrangler publish --name 4everinbeta-chat
   ```
4. Set `window.BRAND_CHAT_ENDPOINT = "https://4everinbeta-chat.workers.dev"` in a small inline script or via Google Tag Manager until the endpoint stabilizes.
