"""
OpenAI-compatible LLM client.
Supports: LM Studio | llama.cpp | OpenRouter
All three expose the same /v1/chat/completions endpoint — only base_url and api_key differ.
"""
from openai import AsyncOpenAI
from app.config import cfg


def _make_client() -> AsyncOpenAI:
    extra_headers: dict[str, str] = {}

    # OpenRouter requires an identifying header
    if cfg.llm_provider == "openrouter":
        extra_headers["HTTP-Referer"] = "https://graph-ars.local"
        extra_headers["X-Title"] = "Graph-ARS"

    return AsyncOpenAI(
        base_url=cfg.resolved_base_url,
        api_key=cfg.resolved_api_key,
        default_headers=extra_headers,
    )


async def complete(
    messages: list[dict],
    temperature: float = 0.3,
    json_mode: bool = True,
) -> str:
    """
    Send a chat completion request and return the raw content string.
    json_mode=True instructs the model to respond with valid JSON.
    Note: llama.cpp requires 'grammar' for strict JSON; json_mode is best-effort for local models.
    """
    client = _make_client()

    kwargs: dict = {
        "model":       cfg.llm_model,
        "messages":    messages,
        "temperature": temperature,
    }
    if json_mode:
        kwargs["response_format"] = {"type": "json_object"}

    resp = await client.chat.completions.create(**kwargs)
    return resp.choices[0].message.content or ""
