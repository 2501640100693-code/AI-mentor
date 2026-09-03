from unittest.mock import patch

from app.brain.assessment import grade_answer, generate_report_card
from app.schemas import QuestionBlock


def test_mcq_exact_match_no_llm():
    q = QuestionBlock(
        prompt="Pick one",
        type="mcq",
        expected_answer_key="b",
        options=["a", "b", "c"],
    )
    with patch("app.brain.assessment.call_llm") as mocked:
        ok, _ = grade_answer(q, "B")
        assert ok is True
        ok2, _ = grade_answer(q, "a")
        assert ok2 is False
        mocked.assert_not_called()


@patch(
    "app.brain.assessment.call_llm",
    return_value="LABEL: CORRECT\nFEEDBACK: Same idea, different words.",
)
def test_short_answer_paraphrase_counts_correct(mock_llm):
    q = QuestionBlock(
        prompt="State Ohm's law",
        type="short_answer",
        expected_answer_key="V = I R",
    )
    ok, feedback = grade_answer(q, "voltage equals current times resistance")
    assert ok is True
    assert "different" in feedback.lower() or "same" in feedback.lower() or feedback
    mock_llm.assert_called_once()


def test_report_card_empty_lesson():
    card = generate_report_card("no-such-student-phase7", "no-such-lesson-phase7")
    assert card.score_percent == 0.0
    assert card.strong_areas == []
    assert card.weak_areas == []
