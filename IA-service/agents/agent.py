import os

from ai.model_client import call_model
from ai.user_memory import UserMemoryStore, resolve_user_id
from tools.tool_selector import select_tool
from tools.tool_executor import execute_tool
from agents.task_memory import create_task, finish_task
from utils.logger import logger


class Agent:

    def __init__(self):
        default_db = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data", "agent_memory.db")
        self.memory_store = UserMemoryStore(os.getenv("MEMORY_DB_PATH", default_db))

    def run(
        self,
        task: str,
        token: str = None,
        user_id: str | None = None,
        model_override: str | None = None,
        max_output_chars: int | None = None,
        blocked_tools: set[str] | None = None,
    ):

        logger.info(f"Agent received task: {task}")

        resolved_user_id = user_id or resolve_user_id(token)

        task_id = create_task(task)

        tool_used = None
        tool_result = None

        try:

            # -------------------------
            # TOOL SELECTION
            # -------------------------
            memory_updates = self.memory_store.extract_and_store(resolved_user_id, task)
            if memory_updates:
                logger.info(f"Memory updated for user={resolved_user_id}: {memory_updates}")

            tool_used = select_tool(task)
            logger.info(f"Tool selected: {tool_used}")

            if tool_used and blocked_tools and tool_used in blocked_tools:
                logger.info(f"Tool {tool_used} skipped due to plan restriction")
                tool_used = None

            # -------------------------
            # TOOL EXECUTION
            # -------------------------
            if tool_used:
                logger.info(f"Executing tool: {tool_used}")

                # Propagamos headers si tenemos un token
                headers = {"Authorization": token} if token else {}

                # Pasamos la tarea como payload base
                payload = {"task": task}
                # Nota: Si el agente necesita userId para herramientas en segundo plano,
                # se podría extraer del token JWT aquí mismo.
                
                tool_result = execute_tool(tool_used, payload, headers=headers)

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

            memory_context = self.memory_store.build_system_context(resolved_user_id)
            if memory_context:
                messages.append({
                    "role": "system",
                    "content": memory_context
                })

            for item in self.memory_store.list_memory(resolved_user_id):
                if item["memory_key"] == "preference:response_language" and item["memory_value"].get("language") == "es":
                    messages.append({
                        "role": "system",
                        "content": "Always respond in Spanish unless the user explicitly asks another language."
                    })
                    break

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

            response = call_model(messages, model=model_override)

            if max_output_chars and isinstance(response, str) and len(response) > max_output_chars:
                response = response[:max_output_chars].rstrip() + "\n\n[response_truncated_due_to_plan]"

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

                headers = {"Authorization": token} if token else {}
                doc_result = execute_tool("document_edit", doc_payload, headers=headers)

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