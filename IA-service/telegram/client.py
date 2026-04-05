import os
import asyncio
from telethon import TelegramClient
from telethon.sessions import StringSession
from telethon.errors import SessionPasswordNeededError

API_ID   = int(os.getenv("TELEGRAM_API_ID", "0"))
API_HASH = os.getenv("TELEGRAM_API_HASH", "")

# Pending auth flows keyed by user_id
_pending: dict[str, dict] = {}


def _new_client(session_string: str = "") -> TelegramClient:
    return TelegramClient(StringSession(session_string), API_ID, API_HASH)


async def start_auth(user_id: str, phone: str) -> str:
    """Envía código al número. Devuelve phone_code_hash."""
    client = _new_client()
    await client.connect()
    result = await client.send_code_request(phone)
    _pending[user_id] = {
        "client": client,
        "phone": phone,
        "phone_code_hash": result.phone_code_hash,
    }
    return result.phone_code_hash


async def verify_code(user_id: str, code: str, password: str = None) -> str:
    """Verifica el código (y 2FA si aplica). Devuelve session string."""
    pending = _pending.get(user_id)
    if not pending:
        raise ValueError("No hay autenticación pendiente para este usuario")

    client: TelegramClient = pending["client"]
    try:
        await client.sign_in(
            pending["phone"],
            code,
            phone_code_hash=pending["phone_code_hash"],
        )
    except SessionPasswordNeededError:
        if not password:
            raise ValueError("2FA_REQUIRED")
        await client.sign_in(password=password)

    session_string = client.session.save()
    await client.disconnect()
    del _pending[user_id]
    return session_string


async def fetch_messages(session_string: str, dialogs_limit: int = 20, msgs_per_dialog: int = 5) -> list[dict]:
    """Trae mensajes recientes de todos los chats."""
    client = _new_client(session_string)
    await client.connect()

    messages = []
    try:
        async for dialog in client.iter_dialogs(limit=dialogs_limit):
            name = dialog.name or "Desconocido"
            chat_id = str(dialog.id)
            async for msg in client.iter_messages(dialog.entity, limit=msgs_per_dialog):
                if not msg.text:
                    continue
                messages.append({
                    "id":        f"tg_{chat_id}_{msg.id}",
                    "from":      name,
                    "chat_id":   chat_id,
                    "subject":   msg.text[:60] + ("..." if len(msg.text) > 60 else ""),
                    "preview":   msg.text[:120],
                    "body":      msg.text,
                    "date":      msg.date.isoformat(),
                    "source":    "telegram",
                    "read":      not (getattr(msg, "mentioned", False) or not msg.out),
                    "urgent":    False,
                    "outgoing":  msg.out,
                })
    finally:
        await client.disconnect()

    # Ordenar por fecha descendente
    messages.sort(key=lambda m: m["date"], reverse=True)
    return messages


async def send_message(session_string: str, chat_id: str, text: str) -> bool:
    """Envía un mensaje a un chat por su ID."""
    client = _new_client(session_string)
    await client.connect()
    try:
        await client.send_message(int(chat_id), text)
        return True
    finally:
        await client.disconnect()


def is_configured() -> bool:
    return API_ID != 0 and bool(API_HASH)
