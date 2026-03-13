from typing import Dict, Any
from ai.model_client import ModelClient

class Tool:
    def __init__(self, name: str, description: str, function: callable):
        self.name = name
        self.description = description
        self.function = function

class ToolManager:
    def __init__(self):
        self.tools: Dict[str, Tool] = {}

    def add_tool(self, tool: Tool):
        self.tools[tool.name] = tool

    def get_tool(self, tool_id: str) -> Tool:
        return self.tools.get(tool_id)

    def list_tools(self) -> Dict[str, str]:
        return {tool.name: tool.description for tool in self.tools.values()}

# Example tools
def read_correos():
    return "Read emails"

def edit_documentos():
    return "Edit documents"

def execute_code():
    return "Execute code"

def simulate():
    return "Simulate"

# Initialize tool manager
tool_manager = ToolManager()
tool_manager.add_tool(Tool("read_correos", "Read emails", read_correos))
tool_manager.add_tool(Tool("edit_documentos", "Edit documents", edit_documentos))
tool_manager.add_tool(Tool("execute_code", "Execute code", execute_code))
tool_manager.add_tool(Tool("simulate", "Simulate", simulate))

# API endpoint to get tool ID
from fastapi import FastAPI, HTTPException

app = FastAPI()

@app.get("/agent/tools")
async def get_agent_tools():
    return tool_manager.list_tools()