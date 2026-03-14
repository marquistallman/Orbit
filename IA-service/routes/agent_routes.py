from fastapi import APIRouter
from agents.agent import Agent
from tools.registry import get_tools

router = APIRouter()

agent = Agent()


@router.post("/agent/run")
def run_agent(data: dict):

    task = data.get("task")

    return agent.run(task)


@router.get("/agent/tools")
def list_tools():

    return get_tools()