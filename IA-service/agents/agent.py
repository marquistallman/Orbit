from ai.model_client import call_model
from tools.tool_selector import select_tool
from tools.tool_executor import execute_tool
from agents.task_memory import create_task, finish_task
from utils.logger import logger


class Agent:

    def run(self, task: str):
        """
        Main entry point of the agent.
        Executes a task using the LLM and optional tools.
        """

        logger.info(f"Agent received task: {task}")

        # Create task in memory
        task_id = create_task(task)

        tool_used = None
        tool_result = None

        try:

            # -------------------------
            # TOOL SELECTION
            # -------------------------

            tool_used = select_tool(task)

            logger.info(f"Tool selected: {tool_used}")

            # -------------------------
            # TOOL EXECUTION
            # -------------------------

            if tool_used:

                logger.info(f"Executing tool: {tool_used}")

                tool_result = execute_tool(tool_used, {"task": task})

                logger.info(f"Tool result: {tool_result}")

            # -------------------------
            # PREPARE LLM MESSAGES
            # -------------------------

            messages = [
                {
                    "role": "system",
                    "content": "You are an AI assistant capable of solving tasks."
                }
            ]

            if tool_result:
                messages.append({
                    "role": "system",
                    "content": f"Tool result: {tool_result}"
                })

            messages.append({
                "role": "user",
                "content": task
            })

            # -------------------------
            # CALL LLM
            # -------------------------

            logger.info("Calling LLM")

            response = call_model(messages)

            logger.info(f"LLM response: {response}")

            result = {
                "task_id": task_id,
                "task": task,
                "tool_used": tool_used,
                "tool_result": tool_result,
                "response": response
            }

            # -------------------------
            # FINISH TASK
            # -------------------------

            finish_task(task_id, result)

            logger.info(f"Task completed: {task_id}")

            return result

        except Exception as e:

            logger.error(f"Agent error: {str(e)}")

            error_result = {
                "task_id": task_id,
                "task": task,
                "status": "error",
                "error": str(e)
            }

            finish_task(task_id, error_result)

            return error_result