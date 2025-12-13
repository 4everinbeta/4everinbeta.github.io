const DEFAULT_DOC_URL =
  "https://4everinbeta.me/rag/documents.json";
const DEFAULT_VECTOR_URL =
  "https://4everinbeta.me/rag/vectors.json";

async function loadKnowledge(cache, url) {
  if (!cache[url]) {
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`Failed to load ${url}: ${res.status}`);
    }
    cache[url] = await res.json();
  }
  return cache[url];
}

function cosineSimilarity(a, b) {
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

async function handleChat(request, env, ctx) {
  const { message } = await request.json();
  if (!message) {
    return Response.json({ error: "Missing message" }, { status: 400 });
  }

  const cache = env.CACHE || (env.CACHE = {});
  const docs = await loadKnowledge(cache, env.DOCUMENT_URL || DEFAULT_DOC_URL);
  const vectors = await loadKnowledge(cache, env.VECTOR_URL || DEFAULT_VECTOR_URL);

  // TODO: replace with real embedding call. Placeholder returns canned response.
  return Response.json({
    answer: "Chat backend wired-up. Plug in embeddings + LLM call next.",
    sources: docs.slice(0, 2).map((doc) => ({
      source: doc.source,
      preview: doc.text.slice(0, 160)
    }))
  });
}

export default {
  async fetch(request, env, ctx) {
    if (request.method === "POST") {
      return handleChat(request, env, ctx);
    }
    return new Response("Send a POST with {message}", { status: 200 });
  }
};
