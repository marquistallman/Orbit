from typing import Any
from datetime import datetime
from enum import Enum
from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, Field

from agents.agent import Agent
from agents.task_memory import get_task, get_history
from ai.user_memory import resolve_user_id
from tools.registry import get_tools
from tools.tool_selector import select_tool
from tools.tool_executor import execute_tool
from utils.logger import logger

router = APIRouter()

agent = Agent()


class AgentRunRequest(BaseModel):
    task: str = Field(..., min_length=1)


class AgentActionRequest(BaseModel):
    tool: str = Field(..., min_length=1)
    payload: dict[str, Any] = Field(default_factory=dict)


class AgentToolRequest(BaseModel):
    tool_id: str = Field(..., min_length=1)
    payload: dict[str, Any] = Field(default_factory=dict)


class SelectToolRequest(BaseModel):
    task: str = Field(..., min_length=1)


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


# -------------------------
# RUN AGENT
# -------------------------

@router.post("/agent/run", response_model=AgentRunResponse)
def run_agent(data: AgentRunRequest, request: Request):
    token = request.headers.get("Authorization")
    user_id = request.headers.get("X-User-Id") or resolve_user_id(token)
    return agent.run(data.task, token=token, user_id=user_id)


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
def run_action(data: AgentActionRequest, request: Request):
    logger.info(f"--- Action Request: {data.tool} ---")
    token = request.headers.get("Authorization")
    
    result = execute_tool(data.tool, data.payload, headers={"Authorization": token} if token else None)
    
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
def run_tool(data: AgentToolRequest, request: Request):
    token = request.headers.get("Authorization")
    result = execute_tool(data.tool_id, data.payload, headers={"Authorization": token} if token else None)
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
    token = request.headers.get("Authorization")
    user_id = request.headers.get("X-User-Id") or resolve_user_id(token)
    return {"user_id": user_id, "items": agent.memory_store.list_memory(user_id)}


@router.delete("/agent/memory", response_model=MemoryClearResponse)
def clear_memory(request: Request):
    token = request.headers.get("Authorization")
    user_id = request.headers.get("X-User-Id") or resolve_user_id(token)
    deleted = agent.memory_store.clear_memory(user_id)
    return {"user_id": user_id, "deleted": deleted}
