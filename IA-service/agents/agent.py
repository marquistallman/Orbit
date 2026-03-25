from ai.model_client import call_model
from tools.tool_selector import select_tool
from tools.tool_executor import execute_tool
from agents.task_memory import create_task, finish_task
from utils.logger import logger


class Agent:

    def run(self, task: str):

        logger.info(f"Agent received task: {task}")

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
            # SYSTEM PROMPT (MEJORADO)
            # -------------------------
            system_prompt = "You are an AI assistant."

            if "email" in task.lower():
                system_prompt = (
                    "You are an expert email writer. "
                    "Write clear, polite, well-structured emails."
                )

            elif "finance" in task.lower():
                system_prompt = (
                    "You are a financial analyst. "
                    "Provide clear insights, risks, and recommendations."
                )

            elif "document" in task.lower():
                system_prompt = (
                    "You generate structured content suitable for documents."
                )

            # -------------------------
            # PREPARE LLM MESSAGES
            # -------------------------
            messages = [
                {
                    "role": "system",
                    "content": system_prompt
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

            # -------------------------
            # AUTO CREATE DOC (si aplica)
            # -------------------------
            if tool_used == "document_edit":

                logger.info("Sending content to doc-service")

                doc_payload = {
                    "title": "Generated Document",
                    "content": response
                }

                doc_result = execute_tool("document_edit", doc_payload)

                tool_result = doc_result

            # -------------------------
            # FINAL RESULT
            # -------------------------
            result = {
                "task_id": task_id,
                "task": task,
                "tool_used": tool_used,
                "tool_result": tool_result,
                "response": response
            }

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