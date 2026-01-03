import test from "node:test";
import assert from "node:assert/strict";

import {
  cosineSimilarity,
  rankDocuments,
  formatContextSections
} from "./rag-helpers.js";

test("cosine similarity matches expected value", () => {
  const a = [1, 0, 0];
  const b = [0, 1, 0];
  const c = [1, 1, 0];

  assert.strictEqual(cosineSimilarity(a, b), 0);
  assert.ok(Math.abs(cosineSimilarity(a, c) - 1 / Math.sqrt(2)) < 1e-9);
});

test("rankDocuments returns top scoring docs only", () => {
  const query = [1, 0];
  const embeddings = [
    [1, 0],
    [0, 1],
    [-1, 0]
  ];
  const docs = [
    { id: "first", text: "First" },
    { id: "second", text: "Second" },
    { id: "third", text: "Third" }
  ];

  const ranked = rankDocuments(query, embeddings, docs, 2);
  assert.strictEqual(ranked.length, 1);
  assert.strictEqual(ranked[0].doc.id, "first");
});

test("formatContextSections stitches readable prompt", () => {
  const sections = [
    {
      score: 0.88,
      doc: { text: "Ryan led AI adoption." }
    }
  ];
  const context = formatContextSections(sections);
  assert.match(context, /Source 1/);
  assert.match(context, /0\.88/);
  assert.match(context, /Ryan led AI adoption/);
});
