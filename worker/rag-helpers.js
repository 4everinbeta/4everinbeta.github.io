export function cosineSimilarity(a, b) {
  if (!a || !b || a.length !== b.length) {
    return 0;
  }
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i += 1) {
    const av = a[i];
    const bv = b[i];
    dot += av * bv;
    normA += av * av;
    normB += bv * bv;
  }
  if (normA === 0 || normB === 0) {
    return 0;
  }
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

export function rankDocuments(queryVector, embeddings, docs, topK = 3) {
  if (!Array.isArray(embeddings) || embeddings.length === 0) {
    return [];
  }

  const count = Math.min(embeddings.length, docs.length);
  const scored = [];
  for (let i = 0; i < count; i += 1) {
    const score = cosineSimilarity(queryVector, embeddings[i]);
    scored.push({ score, doc: docs[i], index: i });
  }
  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, topK)
    .filter((entry) => entry.score > 0);
}

export function formatContextSections(sections) {
  if (!sections.length) {
    return "";
  }
  return sections
    .map(
      (section, idx) =>
        `Source ${idx + 1} (score ${section.score.toFixed(3)}):\n${section.doc.text}`
    )
    .join("\n\n");
}
