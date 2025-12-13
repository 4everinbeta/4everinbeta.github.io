# RAG Assets

This directory stores the generated `documents.json` and `vectors.json` files your chat
worker will read at runtime. Run `python build_embeddings.py` locally (with either a
local embedding model or `OPENAI_API_KEY` set) or trigger the `Build RAG assets`
workflow to refresh these files whenever the source content changes.
