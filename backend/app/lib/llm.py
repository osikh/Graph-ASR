import re
import json
from openai import AsyncOpenAI
from app.config import cfg
import structlog

log = structlog.get_logger()


def _make_client() -> AsyncOpenAI:
    headers: dict[str, str] = {}
    if cfg.llm_provider == "openrouter":
        headers["HTTP-Referer"] = "https://graph-ars.local"
        headers["X-Title"] = "Graph-ARS"
    return AsyncOpenAI(base_url=cfg.resolved_base_url, api_key=cfg.resolved_api_key, default_headers=headers)


def _extract_json(raw: str) -> str:
    cleaned = re.sub(r"<think>.*?</think>", "", raw, flags=re.DOTALL).strip()
    fenced = re.search(r"```(?:json)?\s*([\s\S]*?)```", cleaned)
    if fenced:
        cleaned = fenced.group(1).strip()
    match = re.search(r"(\{[\s\S]*\}|\[[\s\S]*\])", cleaned)
    return match.group(1) if match else cleaned


async def _call(messages: list[dict], temperature: float, with_json_mode: bool) -> str:
    client = _make_client()
    kwargs: dict = {"model": cfg.llm_model, "messages": messages, "temperature": temperature}
    if with_json_mode and cfg.supports_json_mode:
        kwargs["response_format"] = {"type": "json_object"}
    resp = await client.chat.completions.create(**kwargs)
    return resp.choices[0].message.content or ""


async def complete(messages: list[dict], temperature: float = 0.3, json_mode: bool = True) -> str:
    raw = await _call(messages, temperature, json_mode)
    if not json_mode:
        return raw

    result = _extract_json(raw)
    try:
        json.loads(result)
        return result
    except json.JSONDecodeError:
        log.warning("llm.invalid_json_retrying", raw=raw[:200])

    # retry without the failed response in context — keeps tokens small
    retry_msgs = messages + [
        {"role": "user", "content": "Reply with ONLY a JSON object. Start with { and end with }. No markdown, no explanation, no other text."},
    ]
    retry_raw = await _call(retry_msgs, temperature, False)
    result = _extract_json(retry_raw)

    try:
        json.loads(result)
        return result
    except json.JSONDecodeError:
        log.error("llm.json_failed_both_attempts", raw_preview=raw[:300])
        raise ValueError(f"Model returned invalid JSON after 2 attempts. Preview: {raw[:200]}")
