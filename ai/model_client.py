import os
import requests
from dotenv import load_dotenv
from utils.logger import logger

load_dotenv()

OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY")

URL = "https://openrouter.ai/api/v1/chat/completions"


def call_model(messages):

    logger.info(f"Sending request to OpenRouter: {messages}")

    response = requests.post(
        URL,
        headers={
            "Authorization": f"Bearer {OPENROUTER_API_KEY}",
            "Content-Type": "application/json"
        },
        json={
            "model": "openai/gpt-4o-mini",
            "messages": messages
        }
    )

    data = response.json()

    logger.info(f"OpenRouter response: {data}")

    return data["choices"][0]["message"]["content"]
