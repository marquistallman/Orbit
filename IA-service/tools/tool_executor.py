import requests
from tools.registry import TOOLS
from utils.logger import logger


def execute_tool(tool_id, payload):

    tool = TOOLS.get(tool_id)

    if not tool:
        logger.error(f"Tool not found: {tool_id}")
        return {"error": "Tool not found"}

    endpoint = tool["endpoint"]
    method = tool.get("method", "POST") # Default to POST

    logger.info(f"Calling tool {tool_id} at {endpoint} with {payload}")

    try:
        if method.upper() == "GET":
            response = requests.get(endpoint, params=payload)
        else:
            response = requests.post(endpoint, json=payload)
        
        result = response.json()

        logger.info(f"Tool response: {result}")

        return result

    except Exception as e:

        logger.error(f"Tool execution error: {str(e)}")

        return {"error": str(e)}
