from unittest.mock import MagicMock, patch

from app.brain.hallucination_check import verify_claims
from app.brain.misconceptions import (
    DEMO_MISCONCEPTIONS,
    diagnose_misconception,
    generate_and_cache_misconceptions,
)


def test_demo_bank_has_at_least_fifteen():
    assert 15 <= len(DEMO_MISCONCEPTIONS) <= 20
    ids = {m["concept_id"] for m in DEMO_MISCONCEPTIONS}
    assert "ohms_law" in ids


def test_diagnose_wrong_answer_matches(monkeypatch):
    import numpy as np

    monkeypatch.setattr(
        "app.brain.misconceptions.seed_demo_misconceptions", lambda: None
    )
    fake_model = MagicMock()
    fake_model.encode.return_value = np.array([[0.1, 0.2]])
    fake_col = MagicMock()
    # cosine distance 0.2 => similarity 0.8 >= 0.70
    fake_col.query.return_value = {
        "ids": [["misc-ohm-1"]],
        "distances": [[0.2]],
        "metadatas": [[{"concept_id": "ohms_law"}]],
    }
    with patch("app.brain.misconceptions.get_embedder", return_value=fake_model):
        with patch(
            "app.brain.misconceptions._misconception_collection", return_value=fake_col
        ):
            mid = diagnose_misconception(
                "voltage is the same as current", "ohms_law"
            )
    assert mid == "misc-ohm-1"


def test_diagnose_right_answer_below_threshold(monkeypatch):
    import numpy as np

    monkeypatch.setattr(
        "app.brain.misconceptions.seed_demo_misconceptions", lambda: None
    )
    fake_model = MagicMock()
    fake_model.encode.return_value = np.array([[0.1, 0.2]])
    fake_col = MagicMock()
    # cosine distance 0.5 => similarity 0.5 < 0.70
    fake_col.query.return_value = {
        "ids": [["misc-ohm-1"]],
        "distances": [[0.5]],
        "metadatas": [[{"concept_id": "ohms_law"}]],
    }
    with patch("app.brain.misconceptions.get_embedder", return_value=fake_model):
        with patch(
            "app.brain.misconceptions._misconception_collection", return_value=fake_col
        ):
            mid = diagnose_misconception("V equals I times R", "ohms_law")
    assert mid is None


def test_cold_start_generate_and_cache(monkeypatch):
    import numpy as np

    monkeypatch.setenv("MOCK_LLM", "true")
    fake_db = MagicMock()
    fake_db.query.return_value.filter_by.return_value.all.return_value = []
    fake_model = MagicMock()
    fake_model.encode.return_value = np.array([[0.0, 0.0]])
    fake_col = MagicMock()

    with patch("app.brain.misconceptions.get_db") as mock_get_db:
        mock_get_db.return_value.__enter__.return_value = fake_db
        mock_get_db.return_value.__exit__.return_value = False
        with patch("app.brain.misconceptions.get_embedder", return_value=fake_model):
            with patch(
                "app.brain.misconceptions._misconception_collection",
                return_value=fake_col,
            ):
                stored = generate_and_cache_misconceptions(
                    "Photosynthesis", "cold_start_concept"
                )
    assert len(stored) >= 1
    assert "misconception_id" in stored[0]
    fake_col.add.assert_called()


def test_verify_claims_flags_fabricated(monkeypatch):
    monkeypatch.setenv("MOCK_LLM", "false")
    fabricated = (
        "SUPPORTED: no\n"
        "UNSUPPORTED_CLAIMS: The moon is made of cheese | Electrons weigh 5kg"
    )
    with patch("app.brain.hallucination_check.call_llm", return_value=fabricated) as mock_llm:
        ok, flagged = verify_claims(
            "The moon is made of cheese.",
            ["Ohm's law states V = IR."],
        )
    assert ok is False
    assert len(flagged) >= 1
    mock_llm.assert_called()
    assert mock_llm.call_args.kwargs.get("prefer") == "gemini"


def test_verify_claims_supported():
    with patch(
        "app.brain.hallucination_check.call_llm",
        return_value="SUPPORTED: yes\nUNSUPPORTED_CLAIMS:",
    ) as mock_llm:
        ok, flagged = verify_claims("V = IR", ["Voltage equals current times resistance."])
    assert ok is True
    assert flagged == []
    assert mock_llm.call_args.kwargs.get("prefer") == "gemini"
