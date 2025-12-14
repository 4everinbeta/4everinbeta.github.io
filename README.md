# 4everinbeta Brand Site – Installation Instructions

This repository combines a static executive-branding site, a lightweight blog,
and a Retrieval-Augmented Generation (RAG) concierge that runs on Cloudflare
Workers AI. Follow the steps below to reproduce the full setup—from local
development to the production deployment on GitHub Pages with a custom domain.

---

## 1. Prerequisites

- **Accounts**
  - GitHub repository with GitHub Pages enabled (this repo lives at
    `4everinbeta/4everinbeta.github.io`).
  - Cloudflare account with Workers + R2 access.
  - Domain managed in Cloudflare (e.g., `4everinbeta.me`).
- **Local tooling**
  - Python 3.12+ and `pip`
  - Node.js 20+ / npm
  - `gh` CLI authenticated to GitHub (used for secret automation)
  - `wrangler` CLI (`npm install -g wrangler`)
  - `awscli` (optional locally, but referenced in CI)

---

## 2. Clone & install dependencies

```bash
git clone git@github.com:4everinbeta/4everinbeta.github.io.git
cd 4everinbeta.github.io

# Python deps (RAG builder + tests)
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements-rag.txt

# Node tooling (worker unit tests)
npm install
```

Place the source documents in `content/` (already populated with
`resume.txt` and `profile.txt`). Converting PDFs to text keeps the repo light.

---

## 3. Local verification

```bash
# Deterministic fake embeddings (fast)
RAG_FAKE_EMBEDDINGS=1 python build_embeddings.py

# Full embedding build (downloads BAAI/bge-small-en-v1.5)
python build_embeddings.py

# Tests
python -m unittest discover -s tests
node --test worker/rag-helpers.test.js
```

All generated JSON stays under `rag/` and is ignored by Git.

---

## 4. Configure Cloudflare R2 credentials (GitHub Secrets)

1. Create an R2 bucket (e.g., `rag-assets`).
2. Generate an R2 API token with **Object Read/Write**.
3. Store the credentials in `private/R2.key` (not committed):

   ```
   account-id=xxxxxxxxxxxxxxxxxxxx
   access-key-id=XXXXXXXXXXXXXXXX
   secret-access-key=YYYYYYYYYYYYYYYYYYYY
   ```

4. Run the helper script to push them into the repo’s secrets:

   ```bash
   ./scripts/set-r2-secrets.sh
   ```

   The script uses `gh secret set` to populate `CF_ACCOUNT_ID`,
   `CF_R2_ACCESS_KEY`, and `CF_R2_SECRET_KEY`.

---

## 5. Build & publish RAG assets

The GitHub Action (`Build RAG assets`) can be triggered manually or whenever
`content/`, `build_embeddings.py`, or the tests change.

Pipeline summary:

1. Install Python deps.
2. Run Python + Worker unit tests.
3. Execute `python build_embeddings.py` to regenerate `rag/documents.json` and
   `rag/vectors.json`.
4. Upload the JSON to Cloudflare R2 via AWS CLI:
   `s3://rag-assets/latest`.
5. Attach the JSON as a workflow artifact for debugging.

After a successful run, the `latest/` prefix in R2 contains the up-to-date
knowledge base.

---

## 6. Serve RAG assets from `rag.4everinbeta.me`

1. In Cloudflare R2 → **rag-assets → Settings → Custom Domains**, click **Add**
   and connect `rag.4everinbeta.me`.
2. Ensure **Access** is **Disabled** for that custom domain (otherwise every
   request requires Zero Trust auth and yields 403).
3. Cloudflare creates a locked DNS record for `rag`. No manual DNS change is
   required unless you previously removed it.
4. Verify availability:

   ```bash
   curl -I https://rag.4everinbeta.me/latest/documents.json
   ```

   Expect a `200` response with `content-type: application/json`.

---

## 7. Deploy the Cloudflare Worker (chat concierge)

The Worker (`worker/chat-worker.js`) fetches the JSON from the R2 host, runs
vector similarity, embeds incoming questions with Workers AI
(`@cf/baai/bge-small-en-v1.5`), and drafts responses using
`@cf/meta/llama-3.2-3b-instruct`.

Steps:

```bash
wrangler login                 # one-time per machine
./scripts/publish-worker.sh    # wraps `wrangler deploy --name 4everinbeta-chat`
```

`worker/wrangler.toml` wires the `[ai]` binding plus the document/vector URLs.
The Worker responds with permissive CORS headers so the GitHub Pages front-end
can call it directly.
After deploy, note the public endpoint (default:
`https://4everinbeta-chat.workers.dev`). Optionally map a custom subdomain such
as `chat.4everinbeta.me` via Cloudflare → Workers → Custom Domains.

---

## 8. Wire the frontend widget

`chat.js` auto-detects `window.BRAND_CHAT_ENDPOINT`. Set it inside
`index.html` (and any other page using the widget):

```html
<script>
  window.BRAND_CHAT_ENDPOINT = "https://4everinbeta-chat.workers.dev";
</script>
```

If the variable is absent, the widget falls back to the on-page keyword
responses instead of the Worker.

---

## 9. GitHub Pages + custom domain

1. Publish the repo via GitHub Pages (root of `main` branch).
2. Keep the `CNAME` file at the repo root (`4everinbeta.me`) in sync with the
   Pages settings.
3. In Cloudflare DNS, point the apex and `www` records to GitHub Pages:
   - `A 4everinbeta.me 185.199.108-111.153`
   - `AAAA 4everinbeta.me 2606:50c0:8000-:153`
   - `CNAME www 4everinbeta.github.io`
4. In the Pages settings, enter the custom domain (`4everinbeta.me`) and enable
   **Enforce HTTPS** once the certificate is ready.

---

## 10. Validating end-to-end

1. Trigger the **Build RAG assets** workflow (or run `python build_embeddings.py`
   and upload manually) to refresh the knowledge base.
2. Deploy the Worker (`./scripts/publish-worker.sh`).
3. Visit `https://4everinbeta.me`, open the chat widget, and ask something that
   exists in the resume/profile contents.
4. Use the browser devtools → Network tab to confirm requests are sent to the
   Worker endpoint and responses include the `sources` array.

---

## 11. Troubleshooting

- **403 fetching documents** – Make sure Cloudflare Access is disabled for
  `rag.4everinbeta.me` and that the locked R2 custom-domain record exists.
- **GitHub Action cannot upload to R2** – Re-run `./scripts/set-r2-secrets.sh`
  so `CF_*` secrets are correct. Ensure the R2 token has write permissions.
- **Worker errors mentioning missing `AI` binding** – Run `wrangler deploy`
  from the `worker/` folder so the `[[ai]]` block in `wrangler.toml` is honored.
- **Chat widget still uses canned replies** – Define
  `window.BRAND_CHAT_ENDPOINT` before loading `chat.js`, and make sure the
  Worker URL returns responses for POST requests.

With the steps above you can fully rebuild the site, regenerate the knowledge
base, and redeploy the RAG concierge from scratch whenever needed. Let me know
if you’d like a diagram or scripted automation for any additional part of the
pipeline.
