import os
from unittest.mock import patch

from app import llm as llm_mod


def test_call_llm_mock_mode():
    os.environ["MOCK_LLM"] = "true"
    out = llm_mod.call_llm("hello world prompt")
    assert out.startswith("MOCK:")
    assert llm_mod.LAST_TIER_USED == "mock"


@patch.object(llm_mod, "_call_gemini", side_effect=ConnectionError("gemini down"))
@patch.object(llm_mod, "_call_claude", side_effect=ConnectionError("claude down"))
@patch.object(llm_mod, "_call_ollama", return_value="local ok")
def test_fallback_to_ollama(mock_ollama, mock_claude, mock_gemini):
    os.environ["MOCK_LLM"] = "false"
    os.environ.pop("GEMINI_API_KEY", None)
    result = llm_mod.call_llm("test prompt")
    assert result
    assert isinstance(result, str)
    os.environ["MOCK_LLM"] = "true"
