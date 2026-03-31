import os
from typing import Any

from fastapi import Response
from prometheus_client import CONTENT_TYPE_LATEST, Counter, Gauge, Histogram, generate_latest


METRICS_ENABLED = os.getenv("SECURITY_METRICS_ENABLED", "true").strip().lower() in {"1", "true", "yes", "on"}


rate_limit_checks_total = Counter(
    "orbit_rate_limit_checks_total",
    "Total number of rate limit checks by endpoint, plan and decision.",
    ["endpoint", "plan", "decision", "reason"],
)

rate_limit_throttles_total = Counter(
    "orbit_rate_limit_throttles_total",
    "Total number of requests rejected by the rate limiter.",
    ["endpoint", "plan", "reason"],
)

rate_limit_retry_after_seconds = Histogram(
    "orbit_rate_limit_retry_after_seconds",
    "Retry-After seconds returned when requests are throttled.",
    ["endpoint", "plan", "reason"],
    buckets=(1, 5, 10, 20, 30, 60, 120, 180, 300, 600),
)

rate_limit_effective_limit = Gauge(
    "orbit_rate_limit_effective_limit",
    "Current effective per-minute rate limit after adaptive tightening.",
    ["endpoint", "plan"],
)

rate_limit_adaptive_tightening = Gauge(
    "orbit_rate_limit_adaptive_tightening",
    "Whether adaptive tightening is active (1) or not (0).",
    ["endpoint", "plan"],
)

rate_limit_adaptive_tightening_events = Counter(
    "orbit_rate_limit_adaptive_tightening_events",
    "Total checks where adaptive tightening was active.",
    ["endpoint", "plan"],
)


def observe_rate_limit(
    *,
    endpoint: str,
    plan: str,
    allowed: bool,
    reason: str | None,
    effective_limit: int,
    adaptive_tightening: bool,
    retry_after_seconds: int,
) -> None:
    if not METRICS_ENABLED:
        return

    decision = "allowed" if allowed else "blocked"
    normalized_reason = reason or "none"

    rate_limit_checks_total.labels(
        endpoint=endpoint,
        plan=plan,
        decision=decision,
        reason=normalized_reason,
    ).inc()

    rate_limit_effective_limit.labels(endpoint=endpoint, plan=plan).set(max(1, int(effective_limit)))
    rate_limit_adaptive_tightening.labels(endpoint=endpoint, plan=plan).set(1 if adaptive_tightening else 0)
    if adaptive_tightening:
        rate_limit_adaptive_tightening_events.labels(endpoint=endpoint, plan=plan).inc()

    if not allowed:
        rate_limit_throttles_total.labels(
            endpoint=endpoint,
            plan=plan,
            reason=normalized_reason,
        ).inc()
        rate_limit_retry_after_seconds.labels(
            endpoint=endpoint,
            plan=plan,
            reason=normalized_reason,
        ).observe(max(0, int(retry_after_seconds)))


def prometheus_metrics_response() -> Response:
    return Response(content=generate_latest(), media_type=CONTENT_TYPE_LATEST)


def security_metrics_status() -> dict[str, Any]:
    return {"metrics_enabled": METRICS_ENABLED}