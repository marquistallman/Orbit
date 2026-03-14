from ai.model_client import call_model
from tools.tool_selector import select_tool
from tools.tool_executor import execute_tool


class Agent:

    def run(self, task: str):

        plan = self.plan_task(task)

        tool = self.select_tool(task)

        tool_result = None

        if tool:
            tool_result = self.execute_tool(tool, task)

        response = self.call_llm(task, tool_result)

        return {
            "task": task,
            "plan": plan,
            "tool_used": tool,
            "tool_result": tool_result,
            "response": response
        }

    # ---------------------

    def plan_task(self, task: str):

        messages = [
            {
                "role": "system",
                "content": "You are a planner AI. Break the task into steps."
            },
            {
                "role": "user",
                "content": task
            }
        ]

        return call_model(messages)

    # ---------------------

    def select_tool(self, task: str):

        return select_tool(task)

    # ---------------------

    def execute_tool(self, tool_id, task):

        payload = {
            "task": task
        }

        return execute_tool(tool_id, payload)

    # ---------------------

    def call_llm(self, task, tool_result=None):

        messages = [
            {
                "role": "system",
                "content": "You are an AI assistant that solves tasks."
            }
        ]

        if tool_result:
            messages.append(
                {
                    "role": "system",
                    "content": f"Tool result: {tool_result}"
                }
            )

        messages.append(
            {
                "role": "user",
                "content": task
            }
        )

        return call_model(messages)