import json
import os
import sqlite3
import threading
import time
from datetime import datetime, timezone
from collections import deque
from typing import Any

try:
    import redis
except ImportError:  # pragma: no cover - optional dependency in some local setups
    redis = None


def _utc_now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _month_key(dt: datetime | None = None) -> str:
    now = dt or datetime.now(timezone.utc)
    return f"{now.year:04d}-{now.month:02d}"


def _ensure_db_dir(db_path: str) -> None:
    db_dir = os.path.dirname(os.path.abspath(db_path))
    if db_dir and not os.path.exists(db_dir):
        os.makedirs(db_dir, exist_ok=True)


def estimate_tokens(text: str | None) -> int:
    if not text:
        return 0
    # Simple and cheap heuristic: ~4 chars per token for mixed text.
    return max(1, len(text) // 4)


class PlanCatalog:
    def __init__(self):
        # Input/output prices per 1K tokens (USD). Can be tuned by env.
        p_in = float(os.getenv("PLAN_PRICE_INPUT_PER_1K", "0.001"))
        p_out = float(os.getenv("PLAN_PRICE_OUTPUT_PER_1K", "0.002"))

        self.plans: dict[str, dict[str, Any]] = {
            "free": {
                "name": "free",
                "monthly_prompts": int(os.getenv("PLAN_FREE_PROMPTS", "80")),
                "monthly_input_tokens": int(os.getenv("PLAN_FREE_INPUT_TOKENS", "120000")),
                "monthly_output_tokens": int(os.getenv("PLAN_FREE_OUTPUT_TOKENS", "60000")),
                "max_memory_items": int(os.getenv("PLAN_FREE_MAX_MEMORY_ITEMS", "30")),
                "memory_days": int(os.getenv("PLAN_FREE_MEMORY_DAYS", "30")),
                "context_items": int(os.getenv("PLAN_FREE_CONTEXT_ITEMS", "6")),
                "price_input_per_1k": p_in,
                "price_output_per_1k": p_out,
            },
            "lite": {
                "name": "lite",
                "monthly_prompts": int(os.getenv("PLAN_LITE_PROMPTS", "300")),
                "monthly_input_tokens": int(os.getenv("PLAN_LITE_INPUT_TOKENS", "360000")),
                "monthly_output_tokens": int(os.getenv("PLAN_LITE_OUTPUT_TOKENS", "150000")),
                "max_memory_items": int(os.getenv("PLAN_LITE_MAX_MEMORY_ITEMS", "80")),
                "memory_days": int(os.getenv("PLAN_LITE_MEMORY_DAYS", "60")),
                "context_items": int(os.getenv("PLAN_LITE_CONTEXT_ITEMS", "10")),
                "price_input_per_1k": p_in,
                "price_output_per_1k": p_out,
            },
            "standard": {
                "name": "standard",
                "monthly_prompts": int(os.getenv("PLAN_STANDARD_PROMPTS", "1500")),
                "monthly_input_tokens": int(os.getenv("PLAN_STANDARD_INPUT_TOKENS", "2700000")),
                "monthly_output_tokens": int(os.getenv("PLAN_STANDARD_OUTPUT_TOKENS", "1050000")),
                "max_memory_items": int(os.getenv("PLAN_STANDARD_MAX_MEMORY_ITEMS", "250")),
                "memory_days": int(os.getenv("PLAN_STANDARD_MEMORY_DAYS", "180")),
                "context_items": int(os.getenv("PLAN_STANDARD_CONTEXT_ITEMS", "20")),
                "price_input_per_1k": p_in,
                "price_output_per_1k": p_out,
            },
            "pro": {
                "name": "pro",
                "monthly_prompts": int(os.getenv("PLAN_PRO_PROMPTS", "6000")),
                "monthly_input_tokens": int(os.getenv("PLAN_PRO_INPUT_TOKENS", "13200000")),
                "monthly_output_tokens": int(os.getenv("PLAN_PRO_OUTPUT_TOKENS", "6000000")),
                "max_memory_items": int(os.getenv("PLAN_PRO_MAX_MEMORY_ITEMS", "800")),
                "memory_days": int(os.getenv("PLAN_PRO_MEMORY_DAYS", "365")),
                "context_items": int(os.getenv("PLAN_PRO_CONTEXT_ITEMS", "35")),
                "price_input_per_1k": p_in,
                "price_output_per_1k": p_out,
            },
        }

    def get(self, plan_name: str) -> dict[str, Any]:
        return self.plans.get(plan_name, self.plans["free"])


class UsageStore:
    def __init__(self, db_path: str):
        _ensure_db_dir(db_path)
        self.db_path = db_path
        self.conn = sqlite3.connect(db_path, check_same_thread=False, timeout=30.0)
        self.conn.row_factory = sqlite3.Row
        # Enable WAL mode for better concurrency and durability
        self.conn.execute("PRAGMA journal_mode=WAL")
        # Ensure fsync happens for data durability
        self.conn.execute("PRAGMA synchronous=FULL")
        # Set connection timeout for lock contention
        self.conn.execute("PRAGMA busy_timeout=30000")
        self._create_tables()

    def _create_tables(self) -> None:
        cur = self.conn.cursor()
        cur.execute(
            """
            CREATE TABLE IF NOT EXISTS user_plan (
                user_id TEXT PRIMARY KEY,
                plan_name TEXT NOT NULL,
                updated_at TEXT NOT NULL
            )
            """
        )
        cur.execute(
            """
            CREATE TABLE IF NOT EXISTS usage_monthly (
                user_id TEXT NOT NULL,
                month_key TEXT NOT NULL,
                prompt_count INTEGER NOT NULL DEFAULT 0,
                input_tokens INTEGER NOT NULL DEFAULT 0,
                output_tokens INTEGER NOT NULL DEFAULT 0,
                estimated_cost_usd REAL NOT NULL DEFAULT 0,
                updated_at TEXT NOT NULL,
                PRIMARY KEY (user_id, month_key)
            )
            """
        )
        self.conn.commit()

    def get_user_plan(self, user_id: str, default_plan: str = "free") -> str:
        cur = self.conn.cursor()
        cur.execute("SELECT plan_name FROM user_plan WHERE user_id = ?", (user_id,))
        row = cur.fetchone()
        return row["plan_name"] if row else default_plan

    def set_user_plan(self, user_id: str, plan_name: str) -> None:
        cur = self.conn.cursor()
        now = _utc_now()
        try:
            cur.execute(
                """
                INSERT INTO user_plan (user_id, plan_name, updated_at)
                VALUES (?, ?, ?)
                ON CONFLICT(user_id) DO UPDATE SET
                    plan_name=excluded.plan_name,
                    updated_at=excluded.updated_at
                """,
                (user_id, plan_name, now),
            )
            self.conn.commit()
            # Force checkpoint for WAL persistence
            self.conn.execute("PRAGMA wal_checkpoint(RESTART)")
        except sqlite3.Error as e:
            print(f"ERROR: Failed to set plan for {user_id}: {e}")
            self.conn.rollback()
            raise

    def get_month_usage(self, user_id: str, month_key: str | None = None) -> dict[str, Any]:
        mk = month_key or _month_key()
        cur = self.conn.cursor()
        cur.execute(
            """
            SELECT prompt_count, input_tokens, output_tokens, estimated_cost_usd, updated_at
            FROM usage_monthly
            WHERE user_id = ? AND month_key = ?
            """,
            (user_id, mk),
        )
        row = cur.fetchone()
        if not row:
            return {
                "user_id": user_id,
                "month_key": mk,
                "prompt_count": 0,
                "input_tokens": 0,
                "output_tokens": 0,
                "estimated_cost_usd": 0.0,
                "updated_at": None,
            }
        return {
            "user_id": user_id,
            "month_key": mk,
            "prompt_count": int(row["prompt_count"]),
            "input_tokens": int(row["input_tokens"]),
            "output_tokens": int(row["output_tokens"]),
            "estimated_cost_usd": float(row["estimated_cost_usd"]),
            "updated_at": row["updated_at"],
        }

    def add_usage(self, user_id: str, input_tokens: int, output_tokens: int, cost_usd: float) -> dict[str, Any]:
        mk = _month_key()
        now = _utc_now()
        cur = self.conn.cursor()
        try:
            cur.execute(
                """
                INSERT INTO usage_monthly (user_id, month_key, prompt_count, input_tokens, output_tokens, estimated_cost_usd, updated_at)
                VALUES (?, ?, 1, ?, ?, ?, ?)
                ON CONFLICT(user_id, month_key) DO UPDATE SET
                    prompt_count=prompt_count + 1,
                    input_tokens=input_tokens + excluded.input_tokens,
                    output_tokens=output_tokens + excluded.output_tokens,
                    estimated_cost_usd=estimated_cost_usd + excluded.estimated_cost_usd,
                    updated_at=excluded.updated_at
                """,
                (user_id, mk, input_tokens, output_tokens, cost_usd, now),
            )
            self.conn.commit()
            # Force checkpoint for WAL persistence
            self.conn.execute("PRAGMA wal_checkpoint(RESTART)")
        except sqlite3.Error as e:
            print(f"ERROR: Failed to add usage for {user_id}: {e}")
            self.conn.rollback()
            raise
        return self.get_month_usage(user_id, mk)


def compute_estimated_cost(plan: dict[str, Any], input_tokens: int, output_tokens: int) -> float:
    in_cost = (input_tokens / 1000.0) * float(plan["price_input_per_1k"])
    out_cost = (output_tokens / 1000.0) * float(plan["price_output_per_1k"])
    return round(in_cost + out_cost, 6)


def evaluate_limits(usage: dict[str, Any], plan: dict[str, Any]) -> dict[str, Any]:
    prompts_ok = usage["prompt_count"] < plan["monthly_prompts"]
    input_ok = usage["input_tokens"] < plan["monthly_input_tokens"]
    output_ok = usage["output_tokens"] < plan["monthly_output_tokens"]
    allowed = prompts_ok and input_ok and output_ok
    return {
        "allowed": allowed,
        "reason": None if allowed else "plan_limit_reached",
        "remaining": {
            "prompts": max(0, plan["monthly_prompts"] - usage["prompt_count"]),
            "input_tokens": max(0, plan["monthly_input_tokens"] - usage["input_tokens"]),
            "output_tokens": max(0, plan["monthly_output_tokens"] - usage["output_tokens"]),
        },
    }


def usage_percentage(usage: dict[str, Any], plan: dict[str, Any]) -> float:
    prompt_ratio = (usage["prompt_count"] / max(1, plan["monthly_prompts"])) if plan.get("monthly_prompts") else 0.0
    input_ratio = (usage["input_tokens"] / max(1, plan["monthly_input_tokens"])) if plan.get("monthly_input_tokens") else 0.0
    output_ratio = (usage["output_tokens"] / max(1, plan["monthly_output_tokens"])) if plan.get("monthly_output_tokens") else 0.0
    return max(prompt_ratio, input_ratio, output_ratio)


def _adaptive_effective_limit(max_requests: int, violations: int) -> tuple[int, bool]:
    if violations >= 6:
        factor = 0.25
    elif violations >= 4:
        factor = 0.4
    elif violations >= 2:
        factor = 0.6
    else:
        factor = 1.0
    effective = max(1, int(max_requests * factor))
    return effective, effective < max_requests


class RequestRateLimiter:
    """Simple in-memory sliding-window rate limiter keyed by user and endpoint."""

    def __init__(self):
        self._events: dict[str, deque[float]] = {}
        self._blocked_until: dict[str, float] = {}
        self._violations: dict[str, int] = {}
        self._lock = threading.Lock()

    def check(self, key: str, max_requests: int, window_seconds: int) -> dict[str, Any]:
        now = time.time()
        with self._lock:
            current_violations = max(0, int(self._violations.get(key, 0)))
            effective_limit, adaptive_tightening = _adaptive_effective_limit(max_requests, current_violations)
            blocked_until = self._blocked_until.get(key, 0.0)
            if blocked_until > now:
                retry_after = int(max(1, blocked_until - now))
                return {
                    "allowed": False,
                    "retry_after_seconds": retry_after,
                    "remaining": 0,
                    "reason": "cooldown_active",
                    "limit": max_requests,
                    "effective_limit": effective_limit,
                    "adaptive_tightening": adaptive_tightening,
                    "window_seconds": window_seconds,
                    "violations": current_violations,
                }

            q = self._events.setdefault(key, deque())
            while q and now - q[0] > window_seconds:
                q.popleft()

            if len(q) >= effective_limit:
                base_retry = int(max(1, window_seconds - (now - q[0])))
                violations = self._violations.get(key, 0) + 1
                self._violations[key] = violations
                effective_limit, adaptive_tightening = _adaptive_effective_limit(max_requests, violations)

                # Progressive cooldowns for repeated abuse within the same runtime.
                if violations >= 6:
                    cooldown = 300
                elif violations >= 4:
                    cooldown = 120
                elif violations >= 2:
                    cooldown = 30
                else:
                    cooldown = 0

                if cooldown > 0:
                    self._blocked_until[key] = now + cooldown
                    retry_after = max(base_retry, cooldown)
                    reason = "rate_limit_cooldown"
                else:
                    retry_after = base_retry
                    reason = "rate_limit_window"

                return {
                    "allowed": False,
                    "retry_after_seconds": retry_after,
                    "remaining": 0,
                    "reason": reason,
                    "limit": max_requests,
                    "effective_limit": effective_limit,
                    "adaptive_tightening": adaptive_tightening,
                    "window_seconds": window_seconds,
                    "violations": violations,
                }

            # Gradually heal violation count when requests stay within limits.
            if key in self._violations and self._violations[key] > 0:
                self._violations[key] -= 1

            healed_violations = max(0, int(self._violations.get(key, 0)))
            effective_limit, adaptive_tightening = _adaptive_effective_limit(max_requests, healed_violations)

            q.append(now)
            return {
                "allowed": True,
                "retry_after_seconds": 0,
                "remaining": max(0, effective_limit - len(q)),
                "reason": None,
                "limit": max_requests,
                "effective_limit": effective_limit,
                "adaptive_tightening": adaptive_tightening,
                "window_seconds": window_seconds,
                "violations": healed_violations,
            }


class RedisRequestRateLimiter:
    """Redis-backed rate limiter for multi-instance deployments."""

    def __init__(self, redis_client: Any, *, prefix: str = "orbit", violation_ttl_seconds: int = 3600):
        self._redis = redis_client
        self._prefix = prefix
        self._violation_ttl_seconds = max(60, int(violation_ttl_seconds))

    def _key(self, kind: str, base: str) -> str:
        return f"{self._prefix}:rate:{kind}:{base}"

    def check(self, key: str, max_requests: int, window_seconds: int) -> dict[str, Any]:
        violations = max(0, int(self._redis.get(self._key("viol", key)) or 0))
        effective_limit, adaptive_tightening = _adaptive_effective_limit(max_requests, violations)

        blocked_key = self._key("blocked", key)
        window_key = self._key("window", key)
        violation_key = self._key("viol", key)

        blocked_ttl = int(self._redis.ttl(blocked_key) or -1)
        if blocked_ttl > 0:
            return {
                "allowed": False,
                "retry_after_seconds": blocked_ttl,
                "remaining": 0,
                "reason": "cooldown_active",
                "limit": max_requests,
                "effective_limit": effective_limit,
                "adaptive_tightening": adaptive_tightening,
                "window_seconds": window_seconds,
                "violations": violations,
            }

        count = int(self._redis.incr(window_key))
        if count == 1:
            self._redis.expire(window_key, max(1, window_seconds))

        if count > effective_limit:
            base_retry = int(self._redis.ttl(window_key) or window_seconds)

            violations = int(self._redis.incr(violation_key))
            if violations == 1:
                self._redis.expire(violation_key, self._violation_ttl_seconds)

            effective_limit, adaptive_tightening = _adaptive_effective_limit(max_requests, violations)

            if violations >= 6:
                cooldown = 300
            elif violations >= 4:
                cooldown = 120
            elif violations >= 2:
                cooldown = 30
            else:
                cooldown = 0

            if cooldown > 0:
                self._redis.setex(blocked_key, cooldown, "1")
                retry_after = max(base_retry, cooldown)
                reason = "rate_limit_cooldown"
            else:
                retry_after = max(1, base_retry)
                reason = "rate_limit_window"

            return {
                "allowed": False,
                "retry_after_seconds": retry_after,
                "remaining": 0,
                "reason": reason,
                "limit": max_requests,
                "effective_limit": effective_limit,
                "adaptive_tightening": adaptive_tightening,
                "window_seconds": window_seconds,
                "violations": violations,
            }

        # Soften violation score while traffic stays within limits.
        v = int(self._redis.get(violation_key) or 0)
        if v > 0:
            new_v = self._redis.decr(violation_key)
            if int(new_v or 0) <= 0:
                self._redis.delete(violation_key)
            v = max(0, int(new_v or 0))

        effective_limit, adaptive_tightening = _adaptive_effective_limit(max_requests, v)

        return {
            "allowed": True,
            "retry_after_seconds": 0,
            "remaining": max(0, effective_limit - count),
            "reason": None,
            "limit": max_requests,
            "effective_limit": effective_limit,
            "adaptive_tightening": adaptive_tightening,
            "window_seconds": window_seconds,
            "violations": v,
        }


def create_rate_limiter() -> RequestRateLimiter | RedisRequestRateLimiter:
    backend = os.getenv("RATE_LIMIT_BACKEND", "memory").strip().lower()
    if backend != "redis":
        return RequestRateLimiter()

    if redis is None:
        print("WARNING: RATE_LIMIT_BACKEND=redis but redis package is not installed; using memory limiter")
        return RequestRateLimiter()

    redis_url = os.getenv("RATE_LIMIT_REDIS_URL", "redis://localhost:12008/0")
    prefix = os.getenv("RATE_LIMIT_REDIS_PREFIX", "orbit")
    socket_timeout = float(os.getenv("RATE_LIMIT_REDIS_SOCKET_TIMEOUT_SECONDS", "1.0"))
    violation_ttl_seconds = int(os.getenv("RATE_LIMIT_COOLDOWN_VIOLATION_TTL_SECONDS", "3600"))

    try:
        client = redis.Redis.from_url(redis_url, socket_timeout=socket_timeout, decode_responses=True)
        client.ping()
        print(f"INFO: Using Redis rate limiter ({redis_url})")
        return RedisRequestRateLimiter(
            client,
            prefix=prefix,
            violation_ttl_seconds=violation_ttl_seconds,
        )
    except Exception as exc:
        print(f"WARNING: Redis limiter unavailable ({exc}); using memory limiter")
        return RequestRateLimiter()
