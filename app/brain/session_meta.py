import json


def read_session_meta(session) -> dict:
    """Safe read of session_meta_json. Never raises on None/missing/invalid."""
    raw = getattr(session, "session_meta_json", None)
    if raw is None or raw == "":
        return {}
    try:
        parsed = json.loads(raw)
    except (TypeError, ValueError, json.JSONDecodeError):
        return {}
    return parsed if isinstance(parsed, dict) else {}


def write_session_meta(session, meta: dict) -> None:
    session.session_meta_json = json.dumps(meta)
