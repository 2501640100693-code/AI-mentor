from app.brain.rag.ingest import get_embedder
from app.llm import call_llm


def retrieve(
    query: str,
    document_id: str,
    top_k: int = 4,
    chapter_id: str | None = None,
) -> list[str]:
    import chromadb

    model = get_embedder()
    q_emb = model.encode([query], convert_to_numpy=True).tolist()
    client = chromadb.PersistentClient(path="./chroma_data")
    collection = client.get_or_create_collection(name="documents")
    if chapter_id:
        where = {
            "$and": [
                {"document_id": {"$eq": document_id}},
                {"chapter_id": {"$eq": chapter_id}},
            ]
        }
    else:
        where = {"document_id": {"$eq": document_id}}
    result = collection.query(query_embeddings=q_emb, where=where, n_results=top_k)
    docs = result.get("documents") or []
    if docs:
        return docs[0]
    return []


def generate_grounded_explanation(
    concept: str, chunks: list[str], target_language: str
) -> str:
    if not chunks:
        return "This isn't in the uploaded material."
    context = "\n\n".join(chunks[:6])
    prompt = (
        f"Teach the concept '{concept}' in {target_language}. "
        "Ground EVERY factual claim ONLY in this source context:\n"
        f"{context}\n"
        "If the sources are insufficient, say so plainly. "
        "Sound like a warm teacher speaking out loud: plain sentences, no 'Certainly!', "
        "no bullet lists, no assistant filler."
    )
    text = call_llm(prompt)
    from app.brain.hallucination_check import verify_claims

    ok, flagged = verify_claims(text, chunks)
    if not ok:
        retry_prompt = (
            prompt
            + "\nDo NOT include these unsupported claims: "
            + "; ".join(flagged)
        )
        text2 = call_llm(retry_prompt)
        ok2, _ = verify_claims(text2, chunks)
        if ok2:
            return text2
        return "This isn't in the uploaded material."
    return text
