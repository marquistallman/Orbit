import os
from fastapi import FastAPI, Request, HTTPException
from pydantic import BaseModel
from dotenv import load_dotenv
import requests
from ai.model_client import ModelClient
from agents.agent import tool_manager
from ai.memory import Memory

load_dotenv()

app = FastAPI()

class AgentRequest(BaseModel):
    task: str

memory = Memory("memory.db")

@app.post("/agent/run")
async def run_agent(request: Request):
    data = await request.json()
    task = data.get("task")

    if not task:
        raise HTTPException(status_code=400, detail="Task is required")

    # Check memory
    memory_result = memory.get_memory(task)
    if memory_result:
        return memory_result

    # Simulate calling the LLM (OpenRouter)
    model_client = ModelClient()
    response = model_client.send_request(task)
    result = response["choices"][0]["message"]["content"]

    # Save to memory
    memory.save_memory(task, result)

    return {"result": result}

@app.get("/agent/status/{task_id}")
async def get_agent_status(task_id: str):
    # Simulate getting the status of a task
    return {"status": "completed", "task_id": task_id}

@app.get("/agent/history")
async def get_agent_history():
    # Simulate getting the history of tasks
    return {"history": ["task1", "task2", "task3"]}

@app.get("/agent/tools")
async def get_agent_tools():
    # Simulate getting the list of tools available
    return tool_manager.list_tools()