from fastapi import FastAPI
from routes.agent_routes import router as agent_router

app = FastAPI(
    title="AI Agent Service",
    version="1.0"
)

app.include_router(agent_router)


@app.get("/")
def health():
    return {"status": "AI agent service running"}