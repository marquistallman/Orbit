import uuid
from datetime import datetime, timezone

tasks = {}


def create_task(task_text):
    task_id = str(uuid.uuid4())

    tasks[task_id] = {
        "task": task_text,
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


def get_history():

    return list(tasks.values())