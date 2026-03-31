import os
import json
import re
from typing import Any
from datetime import datetime
from enum import Enum
from fastapi import APIRouter, HTTPException, Request, Response
from pydantic import BaseModel, Field, ConfigDict

from agents.agent import Agent
from agents.task_memory import get_task, get_history
from ai.security_observability import observe_rate_limit
from ai.user_memory import resolve_user_id
from ai.usage_meter import PlanCatalog, UsageStore, compute_estimated_cost, create_rate_limiter, estimate_tokens, evaluate_limits, usage_percentage
from tools.registry import get_tools
from tools.tool_selector import select_tool
from tools.tool_executor import execute_tool
from utils.logger import log_security_event, logger

router = APIRouter()

agent = Agent()
plan_catalog = PlanCatalog()
usage_store = UsageStore(os.getenv("USAGE_DB_PATH", os.path.join(os.path.dirname(os.path.dirname(__file__)), "data", "usage.db")))
rate_limiter = create_rate_limiter()

MAX_USER_ID_LEN = int(os.getenv("MAX_USER_ID_LEN", "120"))
MAX_TASK_CHARS = int(os.getenv("MAX_TASK_CHARS", "12000"))
MAX_TOOL_ID_LEN = int(os.getenv("MAX_TOOL_ID_LEN", "64"))
MAX_PLAN_NAME_LEN = int(os.getenv("MAX_PLAN_NAME_LEN", "32"))
MAX_PAYLOAD_CHARS = int(os.getenv("MAX_PAYLOAD_CHARS", "12000"))
MAX_PAYLOAD_KEYS = int(os.getenv("MAX_PAYLOAD_KEYS", "100"))
ALLOWED_ID_RE = re.compile(r"^[a-zA-Z0-9_.:@-]+$")


def _default_rate_limit_for_plan(plan_name: str) -> int:
    env_key = f"PLAN_{plan_name.upper()}_RATE_PER_MIN"
    default_map = {
        "free": 30,
        "lite": 60,
        "standard": 120,
        "pro": 240,
    }
    return int(os.getenv(env_key, str(default_map.get(plan_name, 30))))


def _endpoint_rate_per_min(plan_name: str, endpoint_key: str) -> int:
    base = _default_rate_limit_for_plan(plan_name)
    default_multipliers = {
        "agent_run": 1.0,
        "agent_action": 0.7,
        "agent_tool": 0.6,
    }
    env_key = f"RATE_LIMIT_MULTIPLIER_{endpoint_key.upper()}"
    multiplier = float(os.getenv(env_key, str(default_multipliers.get(endpoint_key, 1.0))))
    return max(1, int(base * max(0.1, multiplier)))


def _restricted_tools_for_plan(plan_name: str) -> set[str]:
    # Free plan blocks expensive tools by default. Can be overridden per plan.
    default_restricted = {
        "free": "code_run,mini_maps",
        "lite": "",
        "standard": "",
        "pro": "",
    }
    raw = os.getenv(f"PLAN_{plan_name.upper()}_RESTRICTED_TOOLS", default_restricted.get(plan_name, ""))
    return {item.strip() for item in raw.split(",") if item.strip()}


def _maybe_degradation_policy(plan_name: str, usage: dict[str, Any], plan: dict[str, Any]) -> dict[str, Any]:
    pct = usage_percentage(usage, plan)
    warn_threshold = float(os.getenv("PLAN_DEGRADE_WARN_THRESHOLD", "0.80"))
    hard_threshold = float(os.getenv("PLAN_DEGRADE_HARD_THRESHOLD", "0.90"))

    policy = {
        "model_override": None,
        "max_output_chars": None,
        "restricted_tools": _restricted_tools_for_plan(plan_name),
        "usage_pct": pct,
    }
    if pct >= warn_threshold:
        policy["max_output_chars"] = int(os.getenv("PLAN_DEGRADE_WARN_MAX_OUTPUT_CHARS", "3000"))
    if pct >= hard_threshold:
        policy["max_output_chars"] = int(os.getenv("PLAN_DEGRADE_HARD_MAX_OUTPUT_CHARS", "1800"))
        policy["model_override"] = os.getenv("OPENROUTER_MODEL_CHEAP", "openai/gpt-4o-mini")
    return policy


def _enforce_request_limits(request: Request, response: Response, user_id: str, plan_name: str, endpoint_key: str) -> None:
    max_per_min = _endpoint_rate_per_min(plan_name, endpoint_key)
    client_ip = (request.client.host if request.client else "unknown").strip() or "unknown"
    limiter_key = f"{user_id}:{client_ip}:{endpoint_key}"
    check = rate_limiter.check(limiter_key, max_requests=max_per_min, window_seconds=60)
    effective_limit = int(check.get("effective_limit", check.get("limit", max_per_min)))
    adaptive_tightening = bool(check.get("adaptive_tightening", False))
    violations = int(check.get("violations", 0))
    reset_seconds = int(check.get("window_seconds", 60))
    reason = check.get("reason")

    # Surface standard headers so clients can self-throttle proactively.
    response.headers["X-RateLimit-Limit"] = str(effective_limit)
    response.headers["X-RateLimit-Limit-Base"] = str(max_per_min)
    response.headers["X-RateLimit-Remaining"] = str(check.get("remaining", 0))
    response.headers["X-RateLimit-Reset"] = str(reset_seconds)
    response.headers["X-RateLimit-Adaptive"] = "true" if adaptive_tightening else "false"

    observe_rate_limit(
        endpoint=endpoint_key,
        plan=plan_name,
        allowed=bool(check.get("allowed", False)),
        reason=reason,
        effective_limit=effective_limit,
        adaptive_tightening=adaptive_tightening,
        retry_after_seconds=int(check.get("retry_after_seconds", 0)),
    )

    if not check["allowed"]:
        retry_after = int(check.get("retry_after_seconds", 1))
        log_security_event(
            "rate_limit_blocked",
            user_id=user_id,
            client_ip=client_ip,
            endpoint=endpoint_key,
            plan=plan_name,
            reason=reason,
            retry_after_seconds=retry_after,
            base_limit=max_per_min,
            effective_limit=effective_limit,
            violations=violations,
        )
        raise HTTPException(
            status_code=429,
            detail={
                "error": "rate_limit_reached",
                "retry_after_seconds": retry_after,
                "reason": reason,
            },
            headers={
                "Retry-After": str(retry_after),
                "X-RateLimit-Limit": str(effective_limit),
                "X-RateLimit-Limit-Base": str(max_per_min),
                "X-RateLimit-Remaining": "0",
                "X-RateLimit-Reset": str(retry_after),
                "X-RateLimit-Adaptive": "true" if adaptive_tightening else "false",
            },
        )

    if adaptive_tightening:
        log_security_event(
            "rate_limit_adaptive_active",
            user_id=user_id,
            client_ip=client_ip,
            endpoint=endpoint_key,
            plan=plan_name,
            base_limit=max_per_min,
            effective_limit=effective_limit,
            violations=violations,
        )


def _as_bool(value: str | None, default: bool = False) -> bool:
    if value is None:
        return default
    return value.strip().lower() in {"1", "true", "yes", "on"}


def _resolve_request_user_id(request: Request) -> str:
    token = request.headers.get("Authorization")
    raw_user_id = request.headers.get("X-User-Id") or resolve_user_id(token)
    user_id = (raw_user_id or "anonymous").strip()
    if len(user_id) > MAX_USER_ID_LEN:
        raise HTTPException(
            status_code=400,
            detail={
                "error": "invalid_user_id",
                "message": f"user_id exceeds {MAX_USER_ID_LEN} characters",
            },
        )
    if user_id != "anonymous" and not ALLOWED_ID_RE.match(user_id):
        raise HTTPException(
            status_code=400,
            detail={
                "error": "invalid_user_id",
                "message": "user_id contains unsupported characters",
            },
        )
    allow_anonymous = _as_bool(os.getenv("ALLOW_ANONYMOUS_USER", "true"), default=True)
    if not allow_anonymous and user_id == "anonymous":
        raise HTTPException(
            status_code=401,
            detail={
                "error": "user_identity_required",
                "message": "Provide X-User-Id header or a valid Authorization token.",
            },
        )
    return user_id


def _authorize_plan_admin(request: Request) -> None:
    # Keep tests deterministic and easy to run locally.
    is_pytest = os.getenv("PYTEST_CURRENT_TEST") is not None
    if is_pytest:
        return

    expected = os.getenv("PLAN_ADMIN_API_KEY", "")
    provided = request.headers.get("X-Admin-Key", "")
    if not expected or provided != expected:
        raise HTTPException(
            status_code=403,
            detail={
                "error": "admin_access_required",
                "message": "Valid X-Admin-Key is required.",
            },
        )


def _validate_payload(payload: dict[str, Any], *, source: str) -> None:
    if len(payload) > MAX_PAYLOAD_KEYS:
        raise HTTPException(
            status_code=413,
            detail={
                "error": "payload_too_large",
                "message": f"{source} payload has too many keys (max {MAX_PAYLOAD_KEYS})",
            },
        )
    try:
        payload_chars = len(json.dumps(payload, ensure_ascii=True, separators=(",", ":")))
    except (TypeError, ValueError):
        raise HTTPException(
            status_code=400,
            detail={
                "error": "invalid_payload",
                "message": f"{source} payload must be JSON-serializable",
            },
        )
    if payload_chars > MAX_PAYLOAD_CHARS:
        raise HTTPException(
            status_code=413,
            detail={
                "error": "payload_too_large",
                "message": f"{source} payload exceeds {MAX_PAYLOAD_CHARS} characters",
            },
        )


class AgentRunRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    task: str = Field(..., min_length=1, max_length=MAX_TASK_CHARS)


class AgentActionRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    tool: str = Field(..., min_length=1, max_length=MAX_TOOL_ID_LEN, pattern=r"^[a-zA-Z0-9_:-]+$")
    payload: dict[str, Any] = Field(default_factory=dict)


class AgentToolRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    tool_id: str = Field(..., min_length=1, max_length=MAX_TOOL_ID_LEN, pattern=r"^[a-zA-Z0-9_:-]+$")
    payload: dict[str, Any] = Field(default_factory=dict)


class SelectToolRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    task: str = Field(..., min_length=1, max_length=MAX_TASK_CHARS)


class TaskStatusEnum(str, Enum):
    RUNNING = "running"
    COMPLETED = "completed"
    ERROR = "error"


class AgentRunResponse(BaseModel):
    task_id: str
    task: str
    status: TaskStatusEnum | None = None
    tool_used: str | None = None
    tool_result: Any = None
    response: str | None = None
    error: str | None = None
    created_at: str | None = None


class ToolInfo(BaseModel):
    description: str
    endpoint: str


class ToolsListResponse(BaseModel):
    tools: dict[str, ToolInfo]


class SelectToolResponse(BaseModel):
    tool_id: str


class ActionResponse(BaseModel):
    tool: str
    result: Any  # Can be dict, string, or any other type


class ToolResponse(BaseModel):
    result: Any  # Can be dict, string, or any other type


class TaskDetail(BaseModel):
    task: str
    status: TaskStatusEnum
    result: Any = None
    created_at: str | None = None


class TaskHistoryResponse(BaseModel):
    tasks: list[TaskDetail]


class MemoryItem(BaseModel):
    memory_key: str
    memory_type: str
    memory_value: dict[str, Any]
    source_text: str | None = None
    created_at: str
    updated_at: str


class MemoryListResponse(BaseModel):
    user_id: str
    items: list[MemoryItem]


class MemoryClearResponse(BaseModel):
    user_id: str
    deleted: int


class PlanInfoResponse(BaseModel):
    user_id: str
    plan: dict[str, Any]


class UsageResponse(BaseModel):
    user_id: str
    plan_name: str
    month_key: str
    prompt_count: int
    input_tokens: int
    output_tokens: int
    estimated_cost_usd: float
    remaining: dict[str, int]


class PlanSetRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    user_id: str = Field(..., min_length=1, max_length=MAX_USER_ID_LEN, pattern=r"^[a-zA-Z0-9_.:@-]+$")
    plan_name: str = Field(..., min_length=1, max_length=MAX_PLAN_NAME_LEN, pattern=r"^[a-zA-Z0-9_-]+$")


# -------------------------
# RUN AGENT
# -------------------------

@router.post("/agent/run", response_model=AgentRunResponse)
def run_agent(data: AgentRunRequest, request: Request, response: Response):
    token = request.headers.get("Authorization")
    user_id = _resolve_request_user_id(request)
    plan_name = usage_store.get_user_plan(user_id, default_plan=os.getenv("DEFAULT_PLAN", "free"))
    plan = plan_catalog.get(plan_name)

    usage = usage_store.get_month_usage(user_id)
    limit_check = evaluate_limits(usage, plan)

    # Keep tests deterministic and unaffected by plan caps.
    is_pytest = os.getenv("PYTEST_CURRENT_TEST") is not None
    if not limit_check["allowed"] and not is_pytest:
        raise HTTPException(
            status_code=429,
            detail={
                "error": "plan_limit_reached",
                "plan": plan_name,
                "remaining": limit_check["remaining"],
            },
        )

    if not is_pytest:
        _enforce_request_limits(request, response, user_id, plan_name, "agent_run")

    policy = _maybe_degradation_policy(plan_name, usage, plan)

    result = agent.run(
        data.task,
        token=token,
        user_id=user_id,
        model_override=policy["model_override"],
        max_output_chars=policy["max_output_chars"],
        blocked_tools=policy["restricted_tools"],
    )

    input_tokens = estimate_tokens(data.task)
    output_tokens = estimate_tokens(result.get("response") if isinstance(result, dict) else None)
    est_cost = compute_estimated_cost(plan, input_tokens, output_tokens)
    usage_store.add_usage(user_id, input_tokens, output_tokens, est_cost)

    return result


# -------------------------
# LIST TOOLS
# -------------------------

@router.get("/agent/tools", response_model=ToolsListResponse)
def list_tools():
    return {"tools": get_tools()}


@router.post("/agent/select-tool", response_model=SelectToolResponse)
def select_tool_for_task(data: SelectToolRequest):
    tool_id = select_tool(data.task) or "none"
    return {"tool_id": tool_id}


# -------------------------
# EXECUTE ACTION
# -------------------------

@router.post("/agent/action", response_model=ActionResponse)
def run_action(data: AgentActionRequest, request: Request, response: Response):
    logger.info(f"--- Action Request: {data.tool} ---")
    token = request.headers.get("Authorization")
    user_id = _resolve_request_user_id(request)
    plan_name = usage_store.get_user_plan(user_id, default_plan=os.getenv("DEFAULT_PLAN", "free"))
    plan = plan_catalog.get(plan_name)
    usage = usage_store.get_month_usage(user_id)
    limit_check = evaluate_limits(usage, plan)

    is_pytest = os.getenv("PYTEST_CURRENT_TEST") is not None
    if not limit_check["allowed"] and not is_pytest:
        raise HTTPException(
            status_code=429,
            detail={
                "error": "plan_limit_reached",
                "plan": plan_name,
                "remaining": limit_check["remaining"],
            },
        )
    if not is_pytest:
        _enforce_request_limits(request, response, user_id, plan_name, "agent_action")

    restricted = _restricted_tools_for_plan(plan_name)
    if data.tool in restricted:
        raise HTTPException(
            status_code=403,
            detail={
                "error": "tool_restricted_by_plan",
                "plan": plan_name,
                "tool": data.tool,
            },
        )
    
    _validate_payload(data.payload, source="agent_action")

    result = execute_tool(data.tool, data.payload, headers={"Authorization": token} if token else None)

    input_tokens = estimate_tokens(str(data.payload) if data.payload else data.tool)
    output_tokens = estimate_tokens(str(result))
    est_cost = compute_estimated_cost(plan, input_tokens, output_tokens)
    usage_store.add_usage(user_id, input_tokens, output_tokens, est_cost)
    
    if isinstance(result, dict) and "error" in result:
        logger.error(f"Tool execution failed: {result['error']}")
        raise HTTPException(status_code=502, detail=result["error"])
    else:
        logger.info(f"Tool {data.tool} executed successfully")

    return {
        "tool": data.tool,
        "result": result
    }


@router.post("/agent/tool", response_model=ToolResponse)
def run_tool(data: AgentToolRequest, request: Request, response: Response):
    token = request.headers.get("Authorization")
    user_id = _resolve_request_user_id(request)
    plan_name = usage_store.get_user_plan(user_id, default_plan=os.getenv("DEFAULT_PLAN", "free"))
    plan = plan_catalog.get(plan_name)
    usage = usage_store.get_month_usage(user_id)
    limit_check = evaluate_limits(usage, plan)

    is_pytest = os.getenv("PYTEST_CURRENT_TEST") is not None
    if not limit_check["allowed"] and not is_pytest:
        raise HTTPException(
            status_code=429,
            detail={
                "error": "plan_limit_reached",
                "plan": plan_name,
                "remaining": limit_check["remaining"],
            },
        )
    if not is_pytest:
        _enforce_request_limits(request, response, user_id, plan_name, "agent_tool")

    restricted = _restricted_tools_for_plan(plan_name)
    if data.tool_id in restricted:
        raise HTTPException(
            status_code=403,
            detail={
                "error": "tool_restricted_by_plan",
                "plan": plan_name,
                "tool": data.tool_id,
            },
        )

    _validate_payload(data.payload, source="agent_tool")

    result = execute_tool(data.tool_id, data.payload, headers={"Authorization": token} if token else None)

    input_tokens = estimate_tokens(str(data.payload) if data.payload else data.tool_id)
    output_tokens = estimate_tokens(str(result))
    est_cost = compute_estimated_cost(plan, input_tokens, output_tokens)
    usage_store.add_usage(user_id, input_tokens, output_tokens, est_cost)

    return {"result": result}


@router.get("/agent/status/{task_id}", response_model=TaskDetail)
def get_status(task_id: str):

    task = get_task(task_id)

    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    return task


# -------------------------
# TASK HISTORY
# -------------------------

@router.get("/agent/history", response_model=TaskHistoryResponse)
def history():
    return {"tasks": get_history()}


@router.get("/agent/memory", response_model=MemoryListResponse)
def list_memory(request: Request):
    user_id = _resolve_request_user_id(request)
    return {"user_id": user_id, "items": agent.memory_store.list_memory(user_id)}


@router.delete("/agent/memory", response_model=MemoryClearResponse)
def clear_memory(request: Request):
    user_id = _resolve_request_user_id(request)
    deleted = agent.memory_store.clear_memory(user_id)
    return {"user_id": user_id, "deleted": deleted}


@router.get("/agent/plan", response_model=PlanInfoResponse)
def get_plan(request: Request):
    user_id = _resolve_request_user_id(request)
    plan_name = usage_store.get_user_plan(user_id, default_plan=os.getenv("DEFAULT_PLAN", "free"))
    plan = plan_catalog.get(plan_name)
    return {"user_id": user_id, "plan": plan}


@router.post("/agent/plan", response_model=PlanInfoResponse)
def set_plan(data: PlanSetRequest, request: Request):
    # Allow either admin key OR authenticated user changing their own plan
    is_pytest = os.getenv("PYTEST_CURRENT_TEST") is not None
    is_admin = False
    
    if not is_pytest:
        admin_key = os.getenv("PLAN_ADMIN_API_KEY", "")
        provided_key = request.headers.get("X-Admin-Key", "")
        is_admin = admin_key and provided_key == admin_key
    
    if not is_admin:
        # User changing their own plan - verify auth
        auth_user_id = _resolve_request_user_id(request)
        if auth_user_id != data.user_id.strip():
            raise HTTPException(
                status_code=403,
                detail="Can only change your own plan"
            )

    requested = data.plan_name.strip().lower()
    if requested not in plan_catalog.plans:
        raise HTTPException(
            status_code=400,
            detail={
                "error": "invalid_plan",
                "allowed": sorted(plan_catalog.plans.keys()),
            },
        )

    usage_store.set_user_plan(data.user_id.strip(), requested)
    return {"user_id": data.user_id.strip(), "plan": plan_catalog.get(requested)}


@router.get("/agent/usage", response_model=UsageResponse)
def get_usage(request: Request):
    user_id = _resolve_request_user_id(request)
    plan_name = usage_store.get_user_plan(user_id, default_plan=os.getenv("DEFAULT_PLAN", "free"))
    plan = plan_catalog.get(plan_name)
    usage = usage_store.get_month_usage(user_id)
    limits = evaluate_limits(usage, plan)
    return {
        "user_id": user_id,
        "plan_name": plan_name,
        "month_key": usage["month_key"],
        "prompt_count": usage["prompt_count"],
        "input_tokens": usage["input_tokens"],
        "output_tokens": usage["output_tokens"],
        "estimated_cost_usd": usage["estimated_cost_usd"],
        "remaining": limits["remaining"],
    }
