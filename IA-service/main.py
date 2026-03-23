import os
from fastapi import FastAPI, Request, HTTPException, Depends, status
from fastapi.security import OAuth2PasswordBearer
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv
import requests
from ai.model_client import call_model
from agents.agent import tool_manager
from ai.memory import Memory
from jose import JWTError, jwt
from prometheus_fastapi_instrumentator import Instrumentator

load_dotenv()

app = FastAPI()

# Inicializar instrumentación de Prometheus
Instrumentator().instrument(app).expose(app)

# --- Configuración de Seguridad y CORS ---

SECRET_KEY = os.getenv("JWT_SECRET")
ALGORITHM = "HS256"

# Orígenes permitidos (tu frontend)
origins = [
    "http://localhost:5173",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token") # No la usaremos directamente, pero es necesaria para la dependencia

async def get_current_user(token: str = Depends(oauth2_scheme)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("email")
        if email is None:
            raise credentials_exception
        return payload
    except JWTError:
        raise credentials_exception

# --- Fin de Configuración de Seguridad ---

class AgentRequest(BaseModel):
    task: str

memory = Memory("memory.db")

@app.post("/agent/run")
async def run_agent(agent_request: AgentRequest, current_user: dict = Depends(get_current_user)):
    task = agent_request.task

    if not task:
        raise HTTPException(status_code=400, detail="Task is required")

    # Check memory
    memory_result = memory.get_memory(task)
    if memory_result:
        return memory_result

    # Simulate calling the LLM (OpenRouter)
    messages = [{"role": "user", "content": task}]
    result = call_model(messages)

    # Save to memory
    memory.save_memory(task, result)

    return {"result": result}

@app.get("/")
def health_check():
    return {"status": "IA-service is running"}

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