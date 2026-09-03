import uuid
from typing import Optional

from app.brain.rag.ingest import get_embedder
from app.db import Misconception, get_db
from app.llm import call_llm

DEMO_MISCONCEPTIONS = [
    {
        "concept_id": "ohms_law",
        "wrong_answer_pattern": "voltage is the same as current",
        "description": "Confuses voltage (potential difference) with current (flow of charge).",
    },
    {
        "concept_id": "ohms_law",
        "wrong_answer_pattern": "current increases when resistance increases",
        "description": "Inverts Ohm's law: I = V/R so higher R lowers current at fixed V.",
    },
    {
        "concept_id": "ohms_law",
        "wrong_answer_pattern": "ohm is a unit of current",
        "description": "Ohm is the unit of resistance, not current (ampere).",
    },
    {
        "concept_id": "ohms_law",
        "wrong_answer_pattern": "V = I + R",
        "description": "Uses addition instead of multiplication: V = I × R.",
    },
    {
        "concept_id": "resistance",
        "wrong_answer_pattern": "thicker wires have more resistance",
        "description": "Resistance decreases as cross-sectional area increases.",
    },
    {
        "concept_id": "resistance",
        "wrong_answer_pattern": "resistance is the same as resistivity",
        "description": "Resistivity is a material property; resistance also depends on geometry.",
    },
    {
        "concept_id": "resistance",
        "wrong_answer_pattern": "longer wires have less resistance",
        "description": "Resistance increases with length.",
    },
    {
        "concept_id": "current",
        "wrong_answer_pattern": "current is used up by the first bulb",
        "description": "In a series circuit current is the same throughout; charge is not 'used up'.",
    },
    {
        "concept_id": "current",
        "wrong_answer_pattern": "electrons move at the speed of light in a wire",
        "description": "Drift velocity is slow; the electric field propagates quickly.",
    },
    {
        "concept_id": "voltage",
        "wrong_answer_pattern": "voltage flows through the circuit",
        "description": "Voltage is a difference across points; current flows.",
    },
    {
        "concept_id": "voltage",
        "wrong_answer_pattern": "batteries store current",
        "description": "Batteries provide a potential difference (voltage), not stored current.",
    },
    {
        "concept_id": "series_parallel",
        "wrong_answer_pattern": "two bulbs in parallel are dimmer than one",
        "description": "Parallel branches share voltage; each can be as bright as a single bulb.",
    },
    {
        "concept_id": "series_parallel",
        "wrong_answer_pattern": "adding a resistor in parallel increases total resistance",
        "description": "Parallel paths decrease equivalent resistance.",
    },
    {
        "concept_id": "power",
        "wrong_answer_pattern": "power is voltage times resistance",
        "description": "Electrical power is P = VI or P = I²R, not VR.",
    },
    {
        "concept_id": "power",
        "wrong_answer_pattern": "watts measure current",
        "description": "Watt is the unit of power, not current.",
    },
    {
        "concept_id": "circuit",
        "wrong_answer_pattern": "a circuit works without a closed loop",
        "description": "Current needs a closed conducting path.",
    },
    {
        "concept_id": "circuit",
        "wrong_answer_pattern": "ground is a source of electrons",
        "description": "Ground is a reference potential, not an electron reservoir for DC circuits.",
    },
    {
        "concept_id": "ac_dc",
        "wrong_answer_pattern": "AC current always flows in one direction",
        "description": "AC reverses direction periodically; DC is unidirectional.",
    },
]


def _misconception_collection():
    import chromadb

    client = chromadb.PersistentClient(path="./chroma_data")
    return client.get_or_create_collection(name="misconceptions")


def seed_demo_misconceptions() -> None:
    with get_db() as db:
        existing = db.query(Misconception).count()
        if existing >= 10:
            return
        model = get_embedder()
        col = _misconception_collection()
        texts, ids, metas = [], [], []
        for item in DEMO_MISCONCEPTIONS:
            mid = str(uuid.uuid4())
            db.add(
                Misconception(
                    misconception_id=mid,
                    concept_id=item["concept_id"],
                    wrong_answer_pattern=item["wrong_answer_pattern"],
                    description=item["description"],
                    embedding_stored=True,
                )
            )
            texts.append(item["wrong_answer_pattern"])
            ids.append(mid)
            metas.append({"concept_id": item["concept_id"]})
        embeddings = model.encode(texts, convert_to_numpy=True).tolist()
        col.add(ids=ids, embeddings=embeddings, documents=texts, metadatas=metas)


def diagnose_misconception(student_answer: str, concept_id: str) -> Optional[str]:
    seed_demo_misconceptions()
    model = get_embedder()
    q = model.encode([student_answer], convert_to_numpy=True).tolist()
    col = _misconception_collection()
    try:
        result = col.query(
            query_embeddings=q,
            where={"concept_id": {"$eq": concept_id}},
            n_results=1,
            include=["distances", "metadatas"],
        )
    except Exception:
        result = col.query(query_embeddings=q, n_results=1, include=["distances"])
    ids = (result.get("ids") or [[]])[0]
    distances = (result.get("distances") or [[]])[0]
    if not ids:
        return None
    # Chroma distances are typically L2; convert roughly to similarity
    dist = distances[0] if distances else 1.0
    similarity = 1.0 / (1.0 + dist)
    if similarity >= 0.70:
        return ids[0]
    return None


def generate_and_cache_misconceptions(topic: str, concept_id: str) -> list[dict]:
    with get_db() as db:
        existing = db.query(Misconception).filter_by(concept_id=concept_id).all()
        if existing:
            return [
                {
                    "misconception_id": e.misconception_id,
                    "wrong_answer_pattern": e.wrong_answer_pattern,
                    "description": e.description,
                }
                for e in existing
            ]

    examples = "\n".join(
        f"- {m['wrong_answer_pattern']}: {m['description']}"
        for m in DEMO_MISCONCEPTIONS[:3]
    )
    prompt = (
        f"Topic: {topic}. Concept: {concept_id}.\n"
        f"Here are example misconceptions:\n{examples}\n"
        "Give 3 plausible wrong-answer patterns as JSON array of "
        '{"wrong_answer_pattern":"...","description":"..."}. ONLY JSON.'
    )
    raw = call_llm(prompt)
    import json
    import re

    try:
        match = re.search(r"\[.*\]", raw, re.DOTALL)
        items = json.loads(match.group(0) if match else raw)
    except Exception:
        items = [
            {
                "wrong_answer_pattern": f"common mix-up about {concept_id}",
                "description": f"A generic misunderstanding of {concept_id}.",
            }
        ]

    model = get_embedder()
    col = _misconception_collection()
    stored = []
    with get_db() as db:
        for item in items[:3]:
            mid = str(uuid.uuid4())
            pattern = item.get("wrong_answer_pattern", "")
            desc = item.get("description", "")
            db.add(
                Misconception(
                    misconception_id=mid,
                    concept_id=concept_id,
                    wrong_answer_pattern=pattern,
                    description=desc,
                    embedding_stored=True,
                )
            )
            emb = model.encode([pattern], convert_to_numpy=True).tolist()
            col.add(
                ids=[mid],
                embeddings=emb,
                documents=[pattern],
                metadatas=[{"concept_id": concept_id}],
            )
            stored.append(
                {
                    "misconception_id": mid,
                    "wrong_answer_pattern": pattern,
                    "description": desc,
                }
            )
    return stored
