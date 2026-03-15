from fastapi import APIRouter
from agents.agent import Agent
from agents.task_memory import get_task, get_history
from tools.registry import get_tools
from tools.tool_executor import execute_tool

router = APIRouter()

agent = Agent()


# -------------------------
# RUN AGENT
# -------------------------

@router.post("/agent/run")
def run_agent(data: dict):

    task = data.get("task")

    return agent.run(task)


# -------------------------
# LIST TOOLS
# -------------------------

@router.get("/agent/tools")
def list_tools():

    return get_tools()


# -------------------------
# EXECUTE ACTION
# -------------------------

@router.post("/agent/action")
def run_action(data: dict):

    tool = data.get("tool")
    payload = data.get("payload")

    result = execute_tool(tool, payload)

    return {
        "tool": tool,
        "result": result
    }


# -------------------------
# EXECUTE TOOL DIRECTLY
# -------------------------

@router.post("/agent/tool")
def run_tool(data: dict):

    tool_id = data.get("tool_id")
    payload = data.get("payload")

    result = execute_tool(tool_id, payload)

    return result


# -------------------------
# TASK STATUS
# -------------------------

@router.get("/agent/status/{task_id}")
def get_status(task_id: str):

    task = get_task(task_id)

    return task


# -------------------------
# TASK HISTORY
# -------------------------

@router.get("/agent/history")
def history():

    return get_history()