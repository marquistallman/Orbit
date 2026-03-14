import requests
from tools.registry import TOOLS


def execute_tool(tool_id, payload):

    tool = TOOLS.get(tool_id)

    if not tool:
        return {"error": "Tool not found"}

    endpoint = tool["endpoint"]

    try:
        response = requests.post(endpoint, json=payload, timeout=20)
        return response.json()
    except Exception as e:
        return {"error": str(e)}