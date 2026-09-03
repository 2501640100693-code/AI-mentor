from unittest.mock import patch

from app.brain.visual_generator import generate_visual


def test_none_returns_empty():
    assert generate_visual("none", "x", "r", "beginner") == ""


def test_mock_svg_for_diagram(monkeypatch):
    monkeypatch.setenv("MOCK_VIDEO", "true")
    out = generate_visual("diagram", "Ohm Law circuit", "Show V I R", "beginner")
    assert out.startswith("<svg")
    assert "MOCK VISUAL" in out


def test_equation_strips_dollars(monkeypatch):
    monkeypatch.setenv("MOCK_VIDEO", "false")
    with patch("app.brain.visual_generator.call_llm", return_value="$V=IR$"):
        out = generate_visual("equation", "Ohm's Law", "voltage", "beginner")
    assert "$" not in out
    assert out


def test_code_contains_fence(monkeypatch):
    monkeypatch.setenv("MOCK_VIDEO", "false")
    with patch(
        "app.brain.visual_generator.call_llm",
        return_value="```python\nprint('hi')\n```",
    ):
        out = generate_visual("code", "print", "demo", "beginner")
    assert "```" in out


def test_malformed_svg_returns_empty(monkeypatch):
    monkeypatch.setenv("MOCK_VIDEO", "false")
    with patch("app.brain.visual_generator.call_llm", return_value="not svg"):
        out = generate_visual("diagram", "x", "y", "beginner")
    assert out == ""
