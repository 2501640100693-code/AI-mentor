import os
import re

from app.llm import call_llm


def generate_visual(
    visual_type: str,
    concept: str,
    reasoning: str,
    level: str,
    subject_hint: str = "",
) -> str:
    if visual_type == "none":
        return ""

    # Offline / demo: mock SVG. FORCE_FALLBACK stays graceful (no raise).
    if os.getenv("MOCK_VIDEO", "true").lower() == "true":
        return (
            '<svg viewBox="0 0 600 200" xmlns="http://www.w3.org/2000/svg">'
            '<rect width="600" height="200" fill="#E3F2FD"/>'
            f'<text x="10" y="100" font-family="Arial,sans-serif" font-size="16" fill="#1A237E">'
            f"MOCK VISUAL: {concept}</text></svg>"
        )

    try:
        if visual_type == "equation":
            prompt = (
                f"Write a LaTeX expression representing: {concept}.\n"
                f"Context: {reasoning}\nLevel: {level}\n"
                "Return ONLY the LaTeX expression — no dollar signs, no backticks, no explanation."
            )
            return call_llm(prompt).strip().replace("$", "")

        if visual_type == "code":
            lang_hint = "python"
            sh = (subject_hint or "").lower()
            if "javascript" in sh or "js" in sh:
                lang_hint = "javascript"
            elif "java " in sh:
                lang_hint = "java"
            elif "c++" in sh or "cpp" in sh:
                lang_hint = "cpp"
            elif "c#" in sh or "csharp" in sh:
                lang_hint = "csharp"
            elif "rust" in sh:
                lang_hint = "rust"
            elif "go " in sh or "golang" in sh:
                lang_hint = "go"
            prompt = (
                f"Write a concise, well-commented {lang_hint} code example demonstrating: {concept}.\n"
                f"Level: {level}. Context: {reasoning}\n"
                f"Return ONLY the code inside a markdown fenced block like:\n```{lang_hint}\n# code\n```"
            )
            return call_llm(prompt).strip()

        # diagram | graph | timeline | concept_map -> SVG with validation + retry
        svg_prompt = f"""Generate an educational SVG diagram for the concept: {concept}.
Context: {reasoning}
Subject: {subject_hint or "general"}
Level: {level}
Type: {visual_type}

STRICT RULES:
1. Return ONLY valid SVG — start with <svg and end with </svg>.
2. Use viewBox="0 0 700 450"
3. Add xmlns="http://www.w3.org/2000/svg"
4. Use ONLY: rect, circle, ellipse, line, polyline, polygon, path, text, tspan, g
5. No external fonts, no <image>, no JavaScript
6. Fill colors: #E3F2FD #FFF9C4 #E8F5E9 #FCE4EC #F3E5F5 #FFFFFF #1A237E
7. Font: font-family="Arial, sans-serif"
8. All text inside <text> or <tspan>
"""
        svg = call_llm(svg_prompt).strip()
        if "<svg" not in svg:
            svg = call_llm(
                svg_prompt
                + "\n\nCRITICAL: Start your response with exactly '<svg' and end with '</svg>'."
            ).strip()
        match = re.search(r"<svg[\s\S]*?</svg>", svg)
        if not match:
            return ""
        svg = match.group(0)
        if not svg.endswith("</svg>"):
            return ""
        return svg
    except Exception:
        return ""
