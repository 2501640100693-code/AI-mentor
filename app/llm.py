import os

from dotenv import load_dotenv
from tenacity import retry, stop_after_attempt, wait_fixed

load_dotenv()

LAST_TIER_USED: str = "none"


def _call_gemini(prompt: str, system: str) -> str:
    from google import genai
    from google.genai import types as genai_types

    key = os.getenv("GEMINI_API_KEY", "")
    if not key:
        raise ValueError("GEMINI_API_KEY not set")
    client = genai.Client(api_key=key)
    model_name = os.getenv("GEMINI_MODEL", "gemini-2.5-flash-lite")
    response = client.models.generate_content(
        model=model_name,
        contents=prompt,
        config=genai_types.GenerateContentConfig(
            system_instruction=system or "",
            temperature=0.7,
            max_output_tokens=2048,
        ),
    )
    return response.text or ""


def _call_ollama(prompt: str, system: str) -> str:
    import ollama

    model = os.getenv("LOCAL_LLM_MODEL", "qwen2.5:7b")
    full_prompt = f"System: {system}\n\nUser: {prompt}" if system else prompt
    response = ollama.generate(
        model=model,
        prompt=full_prompt,
        options={"temperature": 0.7, "num_predict": 2048},
    )
    return response["response"]


def _call_claude(prompt: str, system: str) -> str:
    import anthropic

    key = os.getenv("ANTHROPIC_API_KEY", "")
    if not key:
        raise ValueError("ANTHROPIC_API_KEY not set — Claude tier skipped silently")
    client = anthropic.Anthropic(api_key=key)
    message = client.messages.create(
        model="claude-sonnet-5",
        max_tokens=2048,
        system=system or "",
        messages=[{"role": "user", "content": prompt}],
    )
    text_blocks = [b.text for b in message.content if getattr(b, "type", None) == "text"]
    if not text_blocks:
        raise ValueError("Claude response contained no text block")
    return "".join(text_blocks)


@retry(stop=stop_after_attempt(3), wait=wait_fixed(1), reraise=True)
def _gemini_with_retry(prompt, system):
    return _call_gemini(prompt, system)


@retry(stop=stop_after_attempt(3), wait=wait_fixed(1), reraise=True)
def _ollama_with_retry(prompt, system):
    return _call_ollama(prompt, system)


@retry(stop=stop_after_attempt(3), wait=wait_fixed(1), reraise=True)
def _claude_with_retry(prompt, system):
    return _call_claude(prompt, system)


def call_llm(prompt: str, system: str | None = None, prefer: str = "gemini") -> str:
    global LAST_TIER_USED
    if os.getenv("MOCK_LLM", "true").lower() == "true":
        LAST_TIER_USED = "mock"
        return f"MOCK: {prompt[:50]}"

    tiers = [
        ("gemini", _gemini_with_retry),
        ("local", _ollama_with_retry),
        ("claude", _claude_with_retry),
    ]
    if prefer == "local":
        tiers = [
            ("local", _ollama_with_retry),
            ("gemini", _gemini_with_retry),
            ("claude", _claude_with_retry),
        ]
    system = system or ""
    for name, fn in tiers:
        try:
            result = fn(prompt, system)
            print(f"[LLM] Served by: {name}")
            LAST_TIER_USED = name
            return result
        except Exception as e:
            print(f"[LLM] Tier {name} failed: {type(e).__name__}: {e}")
    LAST_TIER_USED = "none"
    return "[LLM ERROR: all tiers failed — check logs]"
