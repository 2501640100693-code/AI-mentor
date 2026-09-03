from unittest.mock import MagicMock, patch

from app.brain.rag import ingest as ingest_mod
from app.brain.rag.retrieve import retrieve


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
    path.write_text(
        "Chapter one text.\n\nChapter two text.\n\nChapter three text.", encoding="utf-8"
    )

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


def test_retrieve_uses_and_filter_when_chapter():
    fake_col = MagicMock()
    fake_col.query.return_value = {"documents": [["chunk A", "chunk B"]]}

    class FakeClient:
        def get_or_create_collection(self, name):
            return fake_col

    with patch("app.brain.rag.retrieve.get_embedder", return_value=FakeModel()):
        with patch("chromadb.PersistentClient", return_value=FakeClient()):
            docs = retrieve("q", "doc-1", top_k=2, chapter_id="section_1")
    assert docs == ["chunk A", "chunk B"]
    where = fake_col.query.call_args.kwargs["where"]
    assert "$and" in where
    assert len(where["$and"]) == 2
