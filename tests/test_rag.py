from pathlib import Path
from unittest.mock import MagicMock, patch

from app.brain.rag import ingest as ingest_mod


class FakeModel:
    def __init__(self, *args, **kwargs):
        self.kwargs = kwargs

    def encode(self, chunks, convert_to_numpy=True):
        import numpy as np

        return np.zeros((len(chunks), 2))


def test_embedder_forced_cpu():
    captured = {}

    def fake_st(name, device=None, **kwargs):
        captured["name"] = name
        captured["device"] = device
        return FakeModel(device=device)

    ingest_mod._embedder = None
    with patch("sentence_transformers.SentenceTransformer", side_effect=fake_st):
        ingest_mod.get_embedder()
    ingest_mod._embedder = None
    assert captured["device"] == "cpu"
    assert "MiniLM" in captured["name"]


def test_txt_ingest_chapter_tags(tmp_path):
    path = tmp_path / "demo.txt"
    path.write_text("Chapter one text.\n\nChapter two text.\n\nChapter three text.", encoding="utf-8")

    fake_col = MagicMock()

    class FakeClient:
        def get_or_create_collection(self, name):
            return fake_col

    ingest_mod._embedder = FakeModel()
    with patch("chromadb.PersistentClient", return_value=FakeClient()):
        doc_id = ingest_mod.ingest_document(str(path))
    assert doc_id
    args = fake_col.add.call_args.kwargs
    chapter_ids = [m["chapter_id"] for m in args["metadatas"]]
    assert len(set(chapter_ids)) >= 1
