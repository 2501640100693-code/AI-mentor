import json
import os
import re
from collections import defaultdict, deque

from app.brain.visual_generator import generate_visual
from app.llm import call_llm
from app.schemas import TeachingTurn


def parse_time_budget(budget_input: str) -> tuple[int, bool]:
    """Single source of truth. Returns (total_minutes, is_multi_day)."""
    s = str(budget_input).strip().lower()
    if re.fullmatch(r"\d+(\.\d+)?", s):
        minutes = float(s)
        return int(minutes), minutes > 1440

    per_day = re.search(
        r"(\d+(\.\d+)?)\s*(minute|minutes|min|m)\s*(?:/|a|per)\s*day",
        s,
    )
    week_num = re.search(r"(\d+(\.\d+)?)\s*(week|weeks)\b", s)
    day_num = re.search(r"(\d+(\.\d+)?)\s*(day|days)\b", s)
    hour_match = re.search(r"(\d+(\.\d+)?)\s*(hour|hours|hr)\b", s)
    min_match = re.search(r"(\d+(\.\d+)?)\s*(minute|minutes|min)\b", s)
    implied_weeks = 1.0 if re.search(r"\b(a|one)\s+week\b", s) else 0.0
    weeks = float(week_num.group(1)) if week_num else implied_weeks
    days = float(day_num.group(1)) if day_num else 0.0

    if per_day:
        daily = float(per_day.group(1))
        span_days = weeks * 7 + days
        if span_days <= 0:
            span_days = 1
        total = daily * span_days
        return int(total), True if span_days > 1 else total > 1440

    total = 0.0
    if weeks:
        total += weeks * 7 * 1440
    if days:
        total += days * 1440
    if hour_match:
        total += float(hour_match.group(1)) * 60
    elif min_match:
        total += float(min_match.group(1))

    if total == 0:
        return 20, False
    return int(total), total > 1440


def derive_interaction_density(budget: int) -> str:
    if budget <= 5:
        return "minimal"
    if budget <= 30:
        return "standard"
    return "full"


def _fallback_concepts(topic_or_text: str, learner_level: str) -> list[dict]:
    fallback = []
    for i in range(3):
        fallback.append(
            {
                "concept_id": f"fallback_concept_{i}",
                "name": f"{topic_or_text} — part {i + 1}",
                "prerequisite_ids": [],
                "target_depth": learner_level,
                "estimated_minutes": 10,
            }
        )
    return fallback


def _extract_json_array(text: str) -> list:
    text = text.strip()
    try:
        parsed = json.loads(text)
        if isinstance(parsed, list):
            return parsed
    except json.JSONDecodeError:
        pass
    match = re.search(r"\[.*\]", text, re.DOTALL)
    if match:
        return json.loads(match.group(0))
    raise ValueError("no JSON array")


def _has_cycle(concepts: list[dict]) -> bool:
    ids = {c["concept_id"] for c in concepts}
    graph = {c["concept_id"]: [p for p in c.get("prerequisite_ids", []) if p in ids] for c in concepts}
    visiting, visited = set(), set()

    def dfs(node: str) -> bool:
        if node in visiting:
            return True
        if node in visited:
            return False
        visiting.add(node)
        for prereq in graph.get(node, []):
            if dfs(prereq):
                return True
        visiting.remove(node)
        visited.add(node)
        return False

    return any(dfs(cid) for cid in ids)


def _validate_dag(concepts: list[dict]) -> list[dict]:
    ids = {str(c.get("concept_id", "")) for c in concepts if c.get("concept_id") is not None}
    cleaned = []
    for c in concepts:
        if not c.get("concept_id"):
            continue
        prereqs = [
            str(p) for p in c.get("prerequisite_ids", []) if str(p) in ids
        ]
        item = dict(c)
        item["concept_id"] = str(c["concept_id"])
        item["name"] = str(c.get("name") or item["concept_id"])
        item["prerequisite_ids"] = prereqs
        depth = c.get("target_depth", "beginner")
        # LLMs sometimes return numeric depth levels — coerce to string labels
        if isinstance(depth, (int, float)):
            depth = {1: "beginner", 2: "intermediate", 3: "advanced"}.get(
                int(depth), str(depth)
            )
        item["target_depth"] = str(depth or "beginner")
        try:
            item["estimated_minutes"] = int(c.get("estimated_minutes") or 10)
        except (TypeError, ValueError):
            item["estimated_minutes"] = 10
        cleaned.append(item)
    return cleaned


def generate_concept_dag(topic_or_text: str, learner_level: str) -> list[dict]:
    prompt = (
        f"Create a concept dependency graph for teaching '{topic_or_text}' "
        f"to a {learner_level} learner. Return ONLY a JSON array of objects with keys "
        "concept_id (string), name (string), prerequisite_ids (string array), "
        "target_depth (string: beginner|intermediate|advanced), "
        "estimated_minutes (integer). No cycles. 3-6 concepts."
    )
    raw = call_llm(prompt)
    concepts = None
    try:
        concepts = _extract_json_array(raw)
    except Exception:
        raw = call_llm(prompt + "\nReturn ONLY valid JSON. No prose.")
        try:
            concepts = _extract_json_array(raw)
        except Exception:
            return _fallback_concepts(topic_or_text, learner_level)

    concepts = _validate_dag(concepts)
    if _has_cycle(concepts):
        raw = call_llm(prompt + "\nCRITICAL: no cycles, DAG only.")
        try:
            concepts = _validate_dag(_extract_json_array(raw))
        except Exception:
            return _fallback_concepts(topic_or_text, learner_level)
        if _has_cycle(concepts):
            return _fallback_concepts(topic_or_text, learner_level)
    return concepts


def schedule_by_time_budget(dag: list[dict], budget_minutes: int) -> list[dict]:
    ids = {c["concept_id"] for c in dag}
    by_id = {c["concept_id"]: c for c in dag}
    indegree = {cid: 0 for cid in ids}
    children = defaultdict(list)
    for c in dag:
        for p in c.get("prerequisite_ids", []):
            if p in ids:
                children[p].append(c["concept_id"])
                indegree[c["concept_id"]] += 1

    queue = deque([cid for cid, d in indegree.items() if d == 0])
    topo = []
    while queue:
        node = queue.popleft()
        topo.append(by_id[node])
        for child in children[node]:
            indegree[child] -= 1
            if indegree[child] == 0:
                queue.append(child)

    ordered = []
    used = 0
    for concept in topo:
        minutes = int(concept.get("estimated_minutes") or 10)
        if used + minutes > budget_minutes and ordered:
            continue
        ordered.append(concept)
        used += minutes
    if not ordered and topo:
        ordered = [topo[0]]
    return ordered


STAGE_ORDER = [
    "understand",
    "plan",
    "explain",
    "demonstrate",
    "question",
    "evaluate",
    "adapt",
]

STAGE_INSTRUCTIONS = {
    "understand": "Introduce the concept and its importance.",
    "plan": "Outline what the student will learn about this concept.",
    "explain": "Explain the concept clearly with a helpful analogy.",
    "demonstrate": "Show a concrete example demonstrating the concept.",
    "question": "Ask a thought-provoking question to test understanding.",
    "evaluate": "Evaluate the student's progress on this concept.",
    "adapt": "Re-explain using a different approach or analogy.",
}


def choose_visual_type(concept_name: str, topic: str, level: str) -> str:
    if os.getenv("MOCK_LLM", "true").lower() == "true":
        lowered = f"{concept_name} {topic}".lower()
        if any(k in lowered for k in ("ohm", "circuit", "voltage", "current")):
            return "diagram"
        if any(k in lowered for k in ("code", "python", "algorithm")):
            return "code"
        return "equation"
    raw = call_llm(
        f"For teaching '{concept_name}' in '{topic}' at {level} level, which visual "
        "type is most appropriate? Reply with ONLY one word from: diagram, graph, "
        "code, timeline, equation, concept_map, none"
    ).strip().lower()
    valid = {"diagram", "graph", "code", "timeline", "equation", "concept_map", "none"}
    return raw if raw in valid else "none"


def set_turn_visual_content(
    turn: TeachingTurn,
    concept: str,
    level: str,
    subject_hint: str = "",
) -> TeachingTurn:
    """Populate turn.visual_content via generate_visual when visual_type != none."""
    if turn.visual_type == "none":
        turn.visual_content = ""
        return turn
    turn.visual_content = generate_visual(
        turn.visual_type,
        concept,
        turn.visual_reasoning or "",
        level,
        subject_hint,
    )
    return turn
