import uuid
from datetime import datetime, timezone

tasks = {}


def create_task(task_text, user_id: str | None = None):
    task_id = str(uuid.uuid4())

    tasks[task_id] = {
        "task_id": task_id,
        "task": task_text,
        "user_id": user_id,
        "status": "running",
        "result": None,
        "created_at": datetime.now(timezone.utc).isoformat()
    }

    return task_id


def finish_task(task_id, result):
    if task_id in tasks:
        tasks[task_id]["status"] = "completed"
        tasks[task_id]["result"] = result


def get_task(task_id):
    return tasks.get(task_id)


def get_history(user_id: str | None = None):
    if user_id:
        return [t for t in tasks.values() if t.get("user_id") == user_id]
    return list(tasks.values())


def clear_tasks(user_id: str | None = None):
    global tasks
    if user_id:
        to_delete = [k for k, v in tasks.items() if v.get("user_id") == user_id]
        for k in to_delete:
            del tasks[k]
        return len(to_delete)
    count = len(tasks)
    tasks = {}
    return count
