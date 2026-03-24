from typing import Any
from datetime import datetime
from enum import Enum

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from agents.agent import Agent
from agents.task_memory import get_task, get_history
from tools.registry import get_tools
from tools.tool_executor import execute_tool

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


# -------------------------
# RUN AGENT
# -------------------------

@router.post("/agent/run", response_model=AgentRunResponse)
def run_agent(data: AgentRunRequest):
    return agent.run(data.task)


# -------------------------
# LIST TOOLS
# -------------------------

@router.get("/agent/tools", response_model=ToolsListResponse)
def list_tools():
    return {"tools": get_tools()}


# -------------------------
# EXECUTE ACTION
# -------------------------

@router.post("/agent/action", response_model=ActionResponse)
def run_action(data: AgentActionRequest):
    result = execute_tool(data.tool, data.payload)

    return {
        "tool": data.tool,
        "result": result
    }


@router.post("/agent/tool", response_model=ToolResponse)
def run_tool(data: AgentToolRequest):
    result = execute_tool(data.tool_id, data.payload)
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