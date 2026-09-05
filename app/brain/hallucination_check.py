from app.llm import call_llm


def verify_claims(
    generated_text: str, retrieved_chunks: list[str]
) -> tuple[bool, list[str]]:
    chunks = "\n---\n".join(retrieved_chunks[:6])
    prompt = (
        f"Given these source chunks:\n{chunks}\n\n"
        f"Does every factual claim in this text appear supported by the sources?\n"
        f"{generated_text}\n\n"
        "Respond with exactly:\nSUPPORTED: yes\nor\nSUPPORTED: no\n"
        "UNSUPPORTED_CLAIMS: <claim1> | <claim2>"
    )
    try:
        result = call_llm(prompt, prefer="gemini")
        lowered = result.lower()
        if "supported: yes" in lowered:
            return True, []
        flagged = []
        for line in result.splitlines():
            if line.upper().startswith("UNSUPPORTED_CLAIMS:"):
                rest = line.split(":", 1)[1]
                flagged = [c.strip() for c in rest.split("|") if c.strip()]
        return False, flagged
    except Exception:
        return False, ["verification_failed"]
