import requests
import os
from tools.registry import TOOLS
from tools.email_tool import generate_email
from tools.finance_tool import analyze_finance
from utils.logger import logger


HTTP_TIMEOUT_SECONDS = float(os.getenv("HTTP_TIMEOUT_SECONDS", "20"))


def execute_tool(tool_id, payload):

    if payload is None:
        payload = {}

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
        return {"error": f"Tool not found: {tool_id}"}

    endpoint = tool["endpoint"]

    logger.info(f"Calling tool {tool_id} at {endpoint} with payload {payload}")

    try:
        response = requests.post(endpoint, json=payload, timeout=HTTP_TIMEOUT_SECONDS)
        response.raise_for_status()

        try:
            return response.json()
        except ValueError:
            logger.error(f"Invalid JSON from tool {tool_id}: {response.text}")
            return {
                "error": "Invalid JSON response from tool",
                "tool": tool_id,
                "status_code": response.status_code,
                "raw_response": response.text
            }

    except requests.RequestException as e:
        logger.error(f"Tool execution error for {tool_id}: {str(e)}")
        return {"error": str(e), "tool": tool_id}