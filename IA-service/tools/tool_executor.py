import requests
from tools.registry import TOOLS
from tools.email_tool import generate_email
from tools.finance_tool import analyze_finance
from utils.logger import logger


def execute_tool(tool_id, payload):

    # -------------------------
    # 🔥 TOOLS INTERNAS
    # -------------------------
    if tool_id == "email_generate":
        return generate_email(payload)

    if tool_id == "finance_analysis":
        return analyze_finance(payload)

    # -------------------------
    # 🔵 MICRO SERVICIOS
    # -------------------------
    tool = TOOLS.get(tool_id)

    if not tool:
        logger.error(f"Tool not found: {tool_id}")
        return {"error": "Tool not found"}

    endpoint = tool["endpoint"]

    logger.info(f"Calling tool {tool_id} at {endpoint}")

    try:
        response = requests.post(endpoint, json=payload)
        return response.json()

    except Exception as e:
        return {"error": str(e)}