from unittest.mock import patch

from app.brain.lesson_planner import (
    generate_concept_dag,
    parse_time_budget,
    schedule_by_time_budget,
)


def test_parse_time_budget_minutes():
    assert parse_time_budget("20 minutes") == (20, False)


def test_parse_time_budget_hour():
    assert parse_time_budget("1 hour") == (60, False)


def test_parse_time_budget_days():
    assert parse_time_budget("7 days") == (10080, True)


def test_parse_time_budget_week_phrase():
    minutes, multi = parse_time_budget("90 minutes a day for a week")
    assert multi is True
    assert minutes == 630


def test_parse_time_budget_min_per_day_slash():
    minutes, multi = parse_time_budget("90 min/day for a week")
    assert multi is True
    assert minutes == 630


def test_parse_time_budget_bare_int():
    assert parse_time_budget("45") == (45, False)


def test_parse_time_budget_garbage():
    assert parse_time_budget("garbage input") == (20, False)


def test_schedule_topological_and_budget():
    dag = [
        {
            "concept_id": "a",
            "name": "A",
            "prerequisite_ids": [],
            "target_depth": "beginner",
            "estimated_minutes": 10,
        },
        {
            "concept_id": "b",
            "name": "B",
            "prerequisite_ids": ["a"],
            "target_depth": "beginner",
            "estimated_minutes": 10,
        },
        {
            "concept_id": "c",
            "name": "C",
            "prerequisite_ids": ["a"],
            "target_depth": "beginner",
            "estimated_minutes": 10,
        },
        {
            "concept_id": "d",
            "name": "D",
            "prerequisite_ids": ["b", "c"],
            "target_depth": "beginner",
            "estimated_minutes": 10,
        },
        {
            "concept_id": "e",
            "name": "E",
            "prerequisite_ids": ["d"],
            "target_depth": "beginner",
            "estimated_minutes": 10,
        },
        {
            "concept_id": "f",
            "name": "F",
            "prerequisite_ids": ["e"],
            "target_depth": "beginner",
            "estimated_minutes": 10,
        },
    ]
    ordered = schedule_by_time_budget(dag, 40)
    ids = [c["concept_id"] for c in ordered]
    assert ids.index("a") < ids.index("b")
    assert ids.index("a") < ids.index("c")
    if "d" in ids:
        assert ids.index("b") < ids.index("d")
        assert ids.index("c") < ids.index("d")
    assert sum(c["estimated_minutes"] for c in ordered) <= 40


@patch("app.brain.lesson_planner.call_llm", return_value="not json at all")
def test_generate_concept_dag_fallback_independent(mock_llm):
    result = generate_concept_dag("Ohms Law", "beginner")
    assert len(result) == 3
    assert result[0]["concept_id"] != result[1]["concept_id"]
    assert id(result[0]) != id(result[1])
    assert id(result[1]) != id(result[2])
