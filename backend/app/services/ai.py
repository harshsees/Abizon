"""
CLAUDE ON AMAZON BEDROCK.

Called through Anthropic's SDK with the Bedrock Mantle client, which signs
requests with the same AWS credentials as everything else (the EC2 instance
role) — no Anthropic API key, one AWS bill.

This is the seam the AI CRM will be built on. What the CRM does has not been
decided, so this does one generic thing: a system prompt plus a user prompt in,
text out, with usage recorded.

Model: Claude Opus 5 (`anthropic.claude-opus-5`), overridable by BEDROCK_MODEL.
Thinking is adaptive by default on Opus 5, so it is left unset.

Refusals: Bedrock does not support the server-side `fallbacks` parameter, so the
SDK's client-side refusal-fallback middleware is used instead. If Opus 5
declines on policy grounds, the same request is retried once on Opus 4.8. A
fallback state is created per call, because it pins follow-ups to whichever
model accepted, and each job here is its own conversation.
"""

from __future__ import annotations

import logging
import time
from dataclasses import dataclass

from anthropic import (
    AnthropicBedrockMantle,
    APIConnectionError,
    APIStatusError,
    BetaFallbackState,
    BetaRefusalFallbackMiddleware,
    InternalServerError,
    RateLimitError,
)

from app.core.config import Settings

log = logging.getLogger(__name__)

FALLBACK_MODEL = "anthropic.claude-opus-4-8"


class AiError(Exception):
    code = "ai_error"


class RetryableAiError(AiError):
    """Throttling, overload, network. The worker backs off and tries again."""

    code = "ai_unavailable"


class AiRefused(AiError):
    code = "ai_refused"

    def __init__(self, category: str | None) -> None:
        self.category = category
        super().__init__(f"The model declined this request ({category or 'unspecified'}).")


@dataclass(frozen=True, slots=True)
class Completion:
    text: str
    model: str
    stop_reason: str | None
    input_tokens: int
    output_tokens: int
    latency_ms: int


class AiService:
    def __init__(self, settings: Settings) -> None:
        self._model = settings.bedrock_model
        self._max_tokens = settings.ai_max_output_tokens
        self._client = AnthropicBedrockMantle(
            aws_region=settings.effective_bedrock_region,
            middleware=[BetaRefusalFallbackMiddleware([{"model": FALLBACK_MODEL}])],
            # The worker's task time limit is 10 minutes; leave room for retries.
            timeout=240.0,
            max_retries=2,
        )

    def complete(self, *, prompt: str, system: str | None = None, max_tokens: int | None = None) -> Completion:
        started = time.perf_counter()
        params: dict[str, object] = {
            "model": self._model,
            "max_tokens": min(max_tokens or self._max_tokens, self._max_tokens),
            "messages": [{"role": "user", "content": prompt}],
        }
        if system:
            params["system"] = system

        try:
            with BetaFallbackState():
                message = self._client.beta.messages.create(**params)  # type: ignore[arg-type]
        except (RateLimitError, InternalServerError, APIConnectionError) as exc:
            raise RetryableAiError(type(exc).__name__) from exc
        except APIStatusError as exc:
            # 400/403/404: a bad request, model access not granted in the
            # Bedrock console, or a wrong model id. Retrying will not help.
            log.error("bedrock rejected request", extra={"status": exc.status_code})
            raise AiError(f"bedrock_{exc.status_code}") from exc

        latency_ms = int((time.perf_counter() - started) * 1000)

        if message.stop_reason == "refusal":
            details = getattr(message, "stop_details", None)
            raise AiRefused(getattr(details, "category", None))

        text = "".join(block.text for block in message.content if block.type == "text")
        return Completion(
            text=text,
            model=message.model,
            stop_reason=message.stop_reason,
            input_tokens=message.usage.input_tokens,
            output_tokens=message.usage.output_tokens,
            latency_ms=latency_ms,
        )
