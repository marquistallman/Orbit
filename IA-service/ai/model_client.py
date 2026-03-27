import os
import requests
from dotenv import load_dotenv
from utils.logger import logger

load_dotenv()

OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY")
OPENROUTER_MODEL = os.getenv("OPENROUTER_MODEL", "openai/gpt-4o-mini")
OPENROUTER_SITE_URL = os.getenv("OPENROUTER_SITE_URL", "")
OPENROUTER_APP_NAME = os.getenv("OPENROUTER_APP_NAME", "Orbit")
HTTP_TIMEOUT_SECONDS = float(os.getenv("HTTP_TIMEOUT_SECONDS", "20"))

URL = "https://openrouter.ai/api/v1/chat/completions"


def call_model(messages):

    if not OPENROUTER_API_KEY:
        logger.error("OPENROUTER_API_KEY is not configured")
        raise RuntimeError("OPENROUTER_API_KEY is not configured")

    logger.info(f"Sending request to OpenRouter: {messages}")

    headers = {
        "Authorization": f"Bearer {OPENROUTER_API_KEY}",
        "Content-Type": "application/json"
    }
    if OPENROUTER_SITE_URL:
        headers["HTTP-Referer"] = OPENROUTER_SITE_URL
    if OPENROUTER_APP_NAME:
        headers["X-Title"] = OPENROUTER_APP_NAME

    try:
        response = requests.post(
            URL,
            headers=headers,
            json={
                "model": OPENROUTER_MODEL,
                "messages": messages
            },
            timeout=HTTP_TIMEOUT_SECONDS
        )
        response.raise_for_status()
    except requests.RequestException as exc:
        logger.error(f"OpenRouter request failed: {str(exc)}")
        raise RuntimeError(f"OpenRouter request failed: {str(exc)}") from exc

    try:
        data = response.json()
    except ValueError as exc:
        logger.error(f"Invalid JSON from OpenRouter: {response.text}")
        raise RuntimeError("Invalid JSON response from OpenRouter") from exc

    choices = data.get("choices")
    if not choices or not isinstance(choices, list):
        logger.error(f"Unexpected OpenRouter payload: {data}")
        raise RuntimeError("OpenRouter response missing choices")

    message = choices[0].get("message", {})
    content = message.get("content")
    if not content:
        logger.error(f"OpenRouter response missing content: {data}")
        raise RuntimeError("OpenRouter response missing content")

    logger.info(f"OpenRouter response: {data}")

    return content
