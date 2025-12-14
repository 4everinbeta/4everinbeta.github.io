import { rankDocuments, formatContextSections } from "./rag-helpers.js";

const DEFAULT_RAG_BASE = "https://rag.4everinbeta.me/latest";
const DEFAULT_DOC_URL = `${DEFAULT_RAG_BASE}/documents.json`;
const DEFAULT_VECTOR_URL = `${DEFAULT_RAG_BASE}/vectors.json`;
const DEFAULT_EMBEDDING_MODEL = "@cf/baai/bge-small-en-v1.5";
const DEFAULT_CHAT_MODEL = "@cf/meta/llama-3.2-3b-instruct";

async function loadKnowledge(cache, url, transform = (value) => value) {
  if (!cache[url]) {
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`Failed to load ${url}: ${res.status}`);
    }
    const payload = await res.json();
    cache[url] = transform(payload);
  }
  return cache[url];
}

async function embedQuery(env, text) {
  if (!env.AI) {
    throw new Error("Workers AI binding missing. Add [[ai]] binding.");
  }
  const model = env.EMBEDDING_MODEL || DEFAULT_EMBEDDING_MODEL;
  const response = await env.AI.run(model, { text: [text] });
  const vector =
    response?.data?.[0]?.embedding ||
    response?.data?.[0] ||
    response?.output?.[0];
  if (!vector || !Array.isArray(vector)) {
    throw new Error("Embedding model returned no vector.");
  }
  return Float32Array.from(vector);
}

async function runChatModel(env, question, contextText) {
  if (!env.AI) {
    throw new Error("Workers AI binding missing.");
  }
  const model = env.CHAT_MODEL || DEFAULT_CHAT_MODEL;
  const messages = [
    {
      role: "system",
      content:
        "You are Ryan Brown's executive concierge. Answer with confident, concise prose that cites specific accomplishments."
    },
    {
      role: "user",
      content: `Use the reference snippets below to answer the visitor's question. If the context is missing the answer, say so and invite them to use the contact form.\n\nContext:\n${contextText}\n\nQuestion: ${question}\n\nRespond in two short paragraphs or less.`
    }
  ];
  const response = await env.AI.run(model, { messages });
  return (response?.response || "").trim();
}

async function handleChat(request, env) {
  let payload;
  try {
    payload = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const message = payload?.message?.trim();
  if (!message) {
    return Response.json({ error: "Missing message" }, { status: 400 });
  }

  const cache = (env.CACHE ||= {});
  const documents = await loadKnowledge(
    cache,
    env.DOCUMENT_URL || DEFAULT_DOC_URL
  );
  const vectorStore = await loadKnowledge(
    cache,
    env.VECTOR_URL || DEFAULT_VECTOR_URL,
    (data) => ({
      ...data,
      embeddings: data.embeddings.map((vec) => Float32Array.from(vec))
    })
  );

  let answer =
    "I'm warming up and don't have enough signal yet—please try asking again in a moment.";
  let sources = documents.slice(0, 2).map((doc) => ({
    source: doc.source,
    preview: doc.text.slice(0, 200)
  }));

  try {
    const queryVector = await embedQuery(env, message);
    const topSections = rankDocuments(
      queryVector,
      vectorStore.embeddings,
      documents,
      4
    );
    if (topSections.length) {
      const context = formatContextSections(topSections);
      const drafted = await runChatModel(env, message, context);
      if (drafted) {
        answer = drafted;
        sources = topSections.map((section) => ({
          source: section.doc.source,
          preview: section.doc.text.slice(0, 200)
        }));
      }
    } else {
      answer =
        "I couldn't find that in Ryan's knowledge base yet. Use the contact form and he'll follow up directly.";
    }
  } catch (error) {
    console.error("Chat worker error", error);
    answer =
      "The concierge hit a snag reaching the model. Please try again shortly or email ryankbrown@gmail.com.";
  }

  return Response.json({ answer, sources }, {
    headers: {
      "Access-Control-Allow-Origin": "*"
    }
  });
}

export default {
  async fetch(request, env) {
    if (request.method === "OPTIONS") {
      return new Response("OK", {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Headers": "Content-Type",
          "Access-Control-Allow-Methods": "POST,OPTIONS"
        }
      });
    }
    if (request.method === "POST") {
      return handleChat(request, env);
    }
    return new Response("Send a POST with {\"message\": \"...\"}", {
      status: 200,
      headers: {
        "Access-Control-Allow-Origin": "*"
      }
    });
  }
};
