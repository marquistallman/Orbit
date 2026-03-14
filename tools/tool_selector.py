def select_tool(task: str):

    task = task.lower()

    if "email" in task or "mail" in task:
        return "gmail_read"

    if "document" in task:
        return "document_edit"

    if "code" in task or "run" in task:
        return "code_run"

    return None