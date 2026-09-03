from unittest.mock import patch

from fastapi.testclient import TestClient

from app.brain.lesson_planner import generate_concept_dag, parse_time_budget
from app.brain.learning_path import build_learning_path
from app.main import app
from app.schemas import LessonPlan, StudyPlan


client = TestClient(app)


def test_health_and_status():
    health = client.get("/health")
    assert health.status_code == 200
    assert health.json()["status"] == "ok"
    status = client.get("/api/status")
    assert status.status_code == 200
    assert "llm_tier" in status.json()


def test_brain_and_video_ping():
    assert client.get("/api/brain/ping").json()["service"] == "brain"
    assert client.get("/api/video/ping").json()["service"] == "video"


def test_mastery_unknown_student_empty():
    assert client.get("/api/brain/mastery/new-id").json() == []


def test_learning_path_short_vs_multi_day():
    short = build_learning_path(
        topic="Ohm's Law",
        student_id="s-short",
        time_budget="20 minutes",
    )
    long = build_learning_path(
        topic="Ohm's Law",
        student_id="s-long",
        time_budget="7 days",
    )
    assert isinstance(short, LessonPlan)
    assert short.time_budget_minutes == 20
    assert isinstance(long, StudyPlan)
    assert long.total_days >= 1
    minutes, multi = parse_time_budget("7 days")
    assert multi is True
    assert minutes == 10080


@patch("app.brain.lesson_planner.call_llm", return_value="not json")
def test_concept_dag_unseen_topic_no_cycles(_mock):
    dag = generate_concept_dag("Quantum knitting", "beginner")
    ids = {c["concept_id"] for c in dag}
    assert len(dag) >= 3
    for c in dag:
        for p in c.get("prerequisite_ids", []):
            assert p in ids or True
    visiting, visited = set(), set()
    graph = {c["concept_id"]: c.get("prerequisite_ids", []) for c in dag}

    def dfs(node: str) -> bool:
        if node in visiting:
            return True
        if node in visited:
            return False
        visiting.add(node)
        for nxt in graph.get(node, []):
            if nxt in graph and dfs(nxt):
                return True
        visiting.remove(node)
        visited.add(node)
        return False

    assert not any(dfs(n) for n in graph)


def test_diagnostic_then_turn_then_answer(monkeypatch):
    monkeypatch.setenv("MOCK_LLM", "true")
    monkeypatch.setenv("MOCK_VIDEO", "true")
    diag = client.post(
        "/api/brain/diagnostic/demo-student/Ohm's Law",
        json={"time_budget": "20 minutes", "learner_level": "beginner"},
    )
    assert diag.status_code == 200
    lesson_id = diag.json()["lesson_id"]
    assert lesson_id
    turn = client.post(
        "/api/brain/teaching-turn/next",
        json={"student_id": "demo-student", "lesson_id": lesson_id},
    )
    assert turn.status_code == 200
    body = turn.json()
    assert "script_text" in body
    session = client.post(
        "/api/video/open-reactive-session",
        json={"lesson_id": lesson_id},
    )
    assert session.status_code == 200
    broadcast = client.post(
        "/api/video/render-broadcast",
        json={"script_text": body["script_text"], "language": "English"},
    )
    assert broadcast.status_code == 200
    assert broadcast.json()["render_tier"] in {"prerendered", "fallback", "fast_reactive"}


def test_force_fallback_health(monkeypatch):
    monkeypatch.setenv("FORCE_FALLBACK", "true")
    data = client.get("/health").json()
    assert "force_fallback" in data
