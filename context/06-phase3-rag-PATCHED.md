# Phase 3 — RAG ingestion + retrieval (PATCHED — Windows Native)

## PATCH NOTES
- TESSERACT_CMD from .env for pytesseract on Windows.
- POST /api/brain/ingest HTTP route required.
- sentence-transformers device="cpu" mandatory.

---

## Paste this into Cursor:

```
At top of app/brain/rag/ingest.py:
  import os, pytesseract
  if os.getenv("TESSERACT_CMD"):
      pytesseract.pytesseract.tesseract_cmd = os.getenv("TESSERACT_CMD")

ingest_document(file_path, source_language="en") -> document_id:
  PDF/docx/pptx extraction, chapter tagging, OCR fallback with lang= eng/hin,
  chunk ~500 tokens, embed with SentenceTransformer(..., device="cpu"),
  store in Chroma PersistentClient ./chroma_data.

retrieve(query, document_id, top_k, chapter_id=None) -> list[str]:
  Same CPU model, Chroma where filter with $and when two conditions.

generate_grounded_explanation(concept, chunks, target_language) -> str:
  call_llm grounded prompt + verify_claims from hallucination_check (Phase 4).

app/brain/routes.py — ADD:
  POST /api/brain/ingest
  Accept UploadFile multipart (.pdf .docx .pptx .txt)
  Save temp file, call ingest_document(), return {"document_id": str}

tests/test_rag.py: mock embeddings, assert device="cpu" in SentenceTransformer init.

Verify:
- [ ] pytest tests/test_rag.py -v
- [ ] python -c "import pytesseract; print(pytesseract.get_tesseract_version())"
- [ ] tesseract --list-langs shows eng and hin
- [ ] POST ingest via Invoke-RestMethod or curl.exe with a real PDF
- [ ] chroma_data/ created; nvidia-smi shows Python NOT on GPU during ingest
```
