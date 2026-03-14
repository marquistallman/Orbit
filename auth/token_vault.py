import requests
import os
from dotenv import load_dotenv

load_dotenv()

TOKEN_VAULT_URL = os.getenv("TOKEN_VAULT_URL")


def get_token(provider):

    try:
        response = requests.get(f"{TOKEN_VAULT_URL}/vault/token/{provider}")
        return response.json()
    except Exception:
        return None