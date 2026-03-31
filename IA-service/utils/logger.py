import logging
import os
import json
from datetime import datetime, timezone

LOG_FOLDER = "logs"
LOG_FILE = "logs/api_log.txt"

if not os.path.exists(LOG_FOLDER):
    os.makedirs(LOG_FOLDER)

logger = logging.getLogger("api_logger")
logger.setLevel(logging.INFO)

file_handler = logging.FileHandler(LOG_FILE)
formatter = logging.Formatter(
    "%(asctime)s - %(levelname)s - %(message)s"
)

file_handler.setFormatter(formatter)

logger.addHandler(file_handler)


def log_security_event(event_type: str, **fields):
    payload = {
        "event_type": event_type,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        **fields,
    }
    logger.info(json.dumps(payload, ensure_ascii=True, separators=(",", ":")))
