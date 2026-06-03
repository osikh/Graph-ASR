"""
OpenAI-compatible LLM client.
Supports: LM Studio | llama.cpp | OpenRouter
"""
import re
import json
from openai import AsyncOpenAI
from app.config import cfg
import structlog

log = structlog.get_logger()


def _make_client() -> AsyncOpenAI:
    extra_headers: dict[str, str] = {}
    if cfg.llm_provider == "openrouter":
        extra_headers["HTTP-Referer"] = "https://graph-ars.local"
        extra_headers["X-Title"] = "Graph-ARS"

    return AsyncOpenAI(
        base_url=cfg.resolved_base_url,
        api_key=cfg.resolved_api_key,
        default_headers=extra_headers,
    )


def _extract_json(raw: str) -> str:
    """
    Clean model output down to a JSON string.
    Handles:
      - <think>...</think> blocks (Mellum, QwQ, DeepSeek-R1, etc.)
      - Markdown code fences  ```json ... ```  or  ``` ... ```
      - Leading/trailing prose around a JSON object/array
    """
    # strip thinking blocks (greedy=False so nested tags work)
    cleaned = re.sub(r"<think>.*?</think>", "", raw, flags=re.DOTALL).strip()

    # strip markdown code fences
    fenced = re.search(r"```(?:json)?\s*([\s\S]*?)```", cleaned)
    if fenced:
        cleaned = fenced.group(1).strip()

    # extract first {...} or [...] block in case there's surrounding prose
    match = re.search(r"(\{[\s\S]*\}|\[[\s\S]*\])", cleaned)
    if match:
        cleaned = match.group(1)

    return cleaned


async def complete(
    messages: list[dict],
    temperature: float = 0.3,
    json_mode: bool = True,
) -> str:
    """
    Call the model and return a clean JSON string ready for json.loads().
    Falls back to a plain call if the provider rejects response_format.
    """
    client = _make_client()
    kwargs: dict = {
        "model":       cfg.llm_model,
        "messages":    messages,
        "temperature": temperature,
    }

    # try with json_mode first; some local models reject the param — fall back silently
    if json_mode:
        try:
            kwargs["response_format"] = {"type": "json_object"}
            resp = await client.chat.completions.create(**kwargs)
        except Exception as e:
            log.warning("llm.json_mode_unsupported", error=str(e), falling_back=True)
            kwargs.pop("response_format")
            resp = await client.chat.completions.create(**kwargs)
    else:
        resp = await client.chat.completions.create(**kwargs)

    raw = resp.choices[0].message.content or ""
    result = _extract_json(raw) if json_mode else raw

    # validate it's parseable before returning — surface issues early
    if json_mode:
        try:
            json.loads(result)
        except json.JSONDecodeError as e:
            log.error("llm.invalid_json", raw=raw[:300], cleaned=result[:300], error=str(e))
            raise ValueError(f"Model returned unparseable JSON: {e}\n\nRaw output:\n{raw[:400]}") from e

    return result
