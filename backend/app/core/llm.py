from __future__ import annotations

import json
import re
import time
from typing import Any, Optional, Type, TypeVar

import groq
from pydantic import BaseModel

from app.core import config

_client: groq.Groq | None = None

# Groq intermittently returns 429 (rate limit) and 5xx ("server busy") errors
# even on well-formed requests; retry those with backoff instead of failing
# the whole lesson step. A None status_code (connection/timeout errors) is
# also treated as retryable.
_RETRYABLE_STATUS_CODES = {429, 500, 502, 503, 504}
_MAX_ATTEMPTS = 6
_BASE_DELAY_SECONDS = 2.0

# A 429 whose *actual* required wait (per Groq's own rate-limit headers)
# exceeds this is not worth blindly retrying -- the backoff schedule above
# tops out around ~2 minutes total, so a multi-minute daily-quota wait would
# just make every retry fail too, leaving the request looking "stuck" for
# ~2 minutes before finally erroring. Past this threshold, fail immediately
# with a clear, specific message instead.
_FAST_FAIL_WAIT_SECONDS = 20.0


class LessonGenerationError(RuntimeError):
    """Raised when Groq can't serve a request and isn't going to any time
    soon (e.g. daily quota exhausted) -- carries the real wait time so the
    API layer can surface a clear, specific message instead of a generic
    500 / an indefinite-looking hang."""

    def __init__(self, message: str, retry_after_seconds: Optional[float] = None):
        super().__init__(message)
        self.retry_after_seconds = retry_after_seconds


def _parse_wait_seconds(response) -> Optional[float]:
    """Groq exposes how long until a rate limit clears via
    x-ratelimit-reset-tokens / x-ratelimit-reset-requests response headers,
    formatted like '3m31.248s' or '2.085s'. Parse whichever is larger (the
    actually-binding constraint) rather than guessing with blind backoff."""
    headers = getattr(response, "headers", None)
    if not headers:
        return None
    waits = []
    for key in ("x-ratelimit-reset-tokens", "x-ratelimit-reset-requests"):
        value = headers.get(key)
        if not value:
            continue
        match = re.match(r"(?:(\d+)m)?([\d.]+)s", value)
        if match:
            minutes = float(match.group(1) or 0)
            seconds = float(match.group(2) or 0)
            waits.append(minutes * 60 + seconds)
    return max(waits) if waits else None


def _is_schema_validation_failure(error: groq.APIStatusError) -> bool:
    """Under strict json_schema mode, the model itself occasionally produces
    a structurally malformed response (observed live: a nested field like
    visual_type hoisted to the top level) -- Groq rejects that with 400
    json_validate_failed. That's the model's own generation being wrong,
    not our request, so it's worth an immediate retry (a fresh sample often
    gets the structure right) rather than failing the whole lesson step."""
    if error.status_code != 400:
        return False
    body = getattr(error, "body", None) or {}
    return isinstance(body, dict) and body.get("error", {}).get("code") == "json_validate_failed"


def get_client() -> groq.Groq:
    global _client
    if _client is None:
        if not config.GROQ_API_KEY:
            raise RuntimeError(
                "GROQ_API_KEY is not set. Copy backend/.env.example to backend/.env "
                "and fill in your Groq API key from https://console.groq.com/keys"
            )
        _client = groq.Groq(api_key=config.GROQ_API_KEY)
    return _client


def _to_strict_schema(schema: Any) -> Any:
    """Groq's strict json_schema mode (mirroring OpenAI's Structured Outputs)
    requires every object to list ALL its properties in "required" (fields
    that are conceptually optional stay optional via a nullable type instead)
    and to set additionalProperties: false. Pydantic doesn't produce that
    shape by default, so rewrite it recursively; also drop "default" keys,
    which aren't part of the supported subset."""
    if isinstance(schema, dict):
        cleaned = {k: _to_strict_schema(v) for k, v in schema.items() if k != "default"}
        if cleaned.get("type") == "object" and "properties" in cleaned:
            cleaned["required"] = list(cleaned["properties"].keys())
            cleaned["additionalProperties"] = False
        return cleaned
    if isinstance(schema, list):
        return [_to_strict_schema(item) for item in schema]
    return schema


T = TypeVar("T", bound=BaseModel)


def structured_call(
    *,
    model: str,
    system: str,
    user: str,
    schema_model: Type[T],
    tool_name: str = "",
    tool_description: str = "",
    max_tokens: int = 2000,
) -> T:
    """Call Groq and force a JSON response matching schema_model's shape via
    strict json_schema mode, then parse the result back into that pydantic model."""
    client = get_client()

    schema = _to_strict_schema(schema_model.model_json_schema())
    schema_name = tool_name or schema_model.__name__

    response = None
    for attempt in range(_MAX_ATTEMPTS):
        try:
            response = client.chat.completions.create(
                model=model,
                messages=[
                    {"role": "system", "content": system},
                    {"role": "user", "content": user},
                ],
                response_format={
                    "type": "json_schema",
                    "json_schema": {
                        "name": schema_name,
                        "description": tool_description or f"Structured {schema_name} output.",
                        "schema": schema,
                        "strict": True,
                    },
                },
                max_tokens=max_tokens,
            )
            break
        except (groq.APIStatusError, groq.APIConnectionError) as e:
            status_code = getattr(e, "status_code", None)

            if status_code == 429:
                wait = _parse_wait_seconds(getattr(e, "response", None))
                if wait is not None and wait > _FAST_FAIL_WAIT_SECONDS:
                    minutes, seconds = divmod(int(wait), 60)
                    human = f"{minutes}m{seconds}s" if minutes else f"{seconds}s"
                    raise LessonGenerationError(
                        f"Groq's rate limit needs {human} to clear (likely the free-tier "
                        f"daily quota) -- not worth retrying now. Try again in a bit, or "
                        f"add billing at console.groq.com/settings/billing.",
                        retry_after_seconds=wait,
                    ) from e

            is_last_attempt = attempt == _MAX_ATTEMPTS - 1
            retryable = (
                status_code is None
                or status_code in _RETRYABLE_STATUS_CODES
                or (isinstance(e, groq.APIStatusError) and _is_schema_validation_failure(e))
            )
            if not retryable or is_last_attempt:
                raise
            time.sleep(_BASE_DELAY_SECONDS * (2**attempt))

    content = response.choices[0].message.content
    if not content:
        raise RuntimeError(f"Groq returned no content for schema '{schema_model.__name__}'.")

    data = json.loads(content)
    return schema_model.model_validate(data)
