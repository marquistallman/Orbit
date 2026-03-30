import json
import os
import sqlite3
import threading
import time
from datetime import datetime, timezone
from collections import deque
from typing import Any


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
        self.conn = sqlite3.connect(db_path, check_same_thread=False)
        self.conn.row_factory = sqlite3.Row
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


class RequestRateLimiter:
    """Simple in-memory sliding-window rate limiter keyed by user and endpoint."""

    def __init__(self):
        self._events: dict[str, deque[float]] = {}
        self._lock = threading.Lock()

    def check(self, key: str, max_requests: int, window_seconds: int) -> dict[str, Any]:
        now = time.time()
        with self._lock:
            q = self._events.setdefault(key, deque())
            while q and now - q[0] > window_seconds:
                q.popleft()

            if len(q) >= max_requests:
                retry_after = int(max(1, window_seconds - (now - q[0])))
                return {
                    "allowed": False,
                    "retry_after_seconds": retry_after,
                    "remaining": 0,
                }

            q.append(now)
            return {
                "allowed": True,
                "retry_after_seconds": 0,
                "remaining": max(0, max_requests - len(q)),
            }
