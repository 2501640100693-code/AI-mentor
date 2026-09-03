"""Re-ingest demo content and pre-render broadcast segments against a live API."""
from __future__ import annotations

import argparse
from pathlib import Path

import httpx


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--url", default="http://localhost:8000")
    parser.add_argument("--topic", default="Ohm's Law")
    parser.add_argument("--student", default="warmup-student")
    parser.add_argument("--file", default="")
    args = parser.parse_args()
    base = args.url.rstrip("/")

    health = httpx.get(f"{base}/health", timeout=60.0)
    print("health:", health.json())

    document_id = None
    demo = Path(args.file) if args.file else Path("scripts/demo.txt")
    if demo.exists():
        with demo.open("rb") as f:
            files = {"file": (demo.name, f, "text/plain")}
            r = httpx.post(f"{base}/api/brain/ingest", files=files, timeout=120.0)
            r.raise_for_status()
            document_id = r.json().get("document_id")
            print("ingested:", document_id)

    diag = httpx.post(
        f"{base}/api/brain/diagnostic/{args.student}/{args.topic}",
        json={"document_id": document_id, "time_budget": "20 minutes"},
        timeout=120.0,
    )
    diag.raise_for_status()
    lesson_id = diag.json().get("lesson_id")
    print("lesson_id:", lesson_id)

    n = 0
    for i in range(3):
        turn = httpx.post(
            f"{base}/api/brain/teaching-turn/next",
            json={"student_id": args.student, "lesson_id": lesson_id},
            timeout=120.0,
        )
        turn.raise_for_status()
        script = turn.json().get("script_text", "Welcome to the lesson.")
        seg = httpx.post(
            f"{base}/api/video/render-broadcast",
            json={
                "script_text": script,
                "language": "English",
                "concept_id": turn.json().get("concept_id", f"c{i}"),
                "level": "beginner",
            },
            timeout=60.0,
        )
        seg.raise_for_status()
        n += 1

    status = httpx.get(f"{base}/api/status", timeout=30.0).json()

    print("\n===== WARM-UP SUMMARY =====")
    print(f"document_id : {document_id}")
    print(f"lesson_id   : {lesson_id}")
    print(f"segments    : {n} broadcast segments cached")
    print(f"llm_tier    : {status.get('llm_tier')}")
    print("Ready to demo.")


if __name__ == "__main__":
    main()
