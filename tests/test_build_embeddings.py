import os
import unittest

import numpy as np

import build_embeddings as rag


class BuildEmbeddingsTests(unittest.TestCase):
    def setUp(self):
        os.environ[rag.FAKE_ENV_FLAG] = "1"

    def tearDown(self):
        os.environ.pop(rag.FAKE_ENV_FLAG, None)

    def test_chunk_text_respects_overlap(self):
        text = " ".join([f"word{i}" for i in range(1000)])
        chunks = rag.chunk_text(text)
        self.assertGreater(len(chunks), 1)
        self.assertTrue(all(chunk.startswith("word") for chunk in chunks))
        self.assertEqual(
            chunks[0].split()[rag.CHUNK_SIZE - rag.CHUNK_OVERLAP],
            chunks[1].split()[0],
        )

    def test_fake_embeddings_are_deterministic(self):
        texts = ["Alpha bravo", "Charlie delta"]
        model, vectors = rag.generate_embeddings(texts)
        self.assertEqual(model, "debug-fake-embeddings")
        self.assertEqual(vectors.shape, (2, rag.FAKE_DIMENSION))
        _, repeat = rag.generate_embeddings(texts)
        np.testing.assert_array_almost_equal(vectors, repeat)


if __name__ == "__main__":
    unittest.main()
