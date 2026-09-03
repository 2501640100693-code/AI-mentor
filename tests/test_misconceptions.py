from app.brain.misconceptions import DEMO_MISCONCEPTIONS


def test_demo_bank_has_at_least_fifteen():
    assert len(DEMO_MISCONCEPTIONS) >= 15
    ids = {m["concept_id"] for m in DEMO_MISCONCEPTIONS}
    assert "ohms_law" in ids
