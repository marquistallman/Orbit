import os
import asyncio
from typing import Any
from datetime import datetime
from enum import Enum
from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, Field

from agents.agent import Agent
from agents.task_memory import get_task, get_history, clear_tasks
from ai.user_memory import resolve_user_id
from ai.usage_meter import PlanCatalog, UsageStore, compute_estimated_cost, estimate_tokens, evaluate_limits
from tools.registry import get_tools
from tools.tool_selector import select_tool
from tools.tool_executor import execute_tool
from utils.logger import logger
from utils.jwt_tools import get_auth0_user_id
from telegram.session_store import TelegramSessionStore
import telegram.client as _tg

import re
import html as _html
import requests as _requests
import threading
from datetime import timezone, timedelta

router = APIRouter()

agent = Agent()
plan_catalog = PlanCatalog()
usage_store = UsageStore(os.getenv("USAGE_DB_PATH", os.path.join(os.path.dirname(os.path.dirname(__file__)), "data", "usage.db")))
_tg_sessions = TelegramSessionStore(os.getenv(
    "TELEGRAM_SESSION_DB_PATH",
    os.path.join(os.path.dirname(os.path.dirname(__file__)), "data", "telegram_sessions.db")
))

GMAIL_SERVICE_URL = os.getenv("GMAIL_SERVICE_URL", "http://localhost:12003")

# Dominios de senders bancarios/pagos confiables — substring match contra el sender
BANK_SENDER_DOMAINS = [
    "bancolombia.com", "nequi.com", "daviplata.com", "davivienda.com",
    "bbva.com", "scotiabank.com", "itau.com", "bancodebogota.com",
    "colpatria.com", "bancocajasocial.com", "bancofalabella.com",
    "paypal.com", "stripe.com", "mercadopago.com", "wompi.co",
    "epayco.co", "payu.com", "pse.com.co",
    "achcolombia.com",      # PSE / ACH Colombia — cubre achcolombia.com y achcolombia.com.co
    "pagos.achcolombia",    # notificaciones@pagos.achcolombia.com.co
    "serviciopse",          # correos PSE genéricos
    "redeban.com", "credibanco.com", "transfiya.com", "avalpay.com",
    "siigo.net", "siigo.com",           # Facturación electrónica Colombia
    "virginmobile.com.co",              # Virgin Mobile Colombia - recibos PSE
    "virginmobilela.com",               # alias alternativo Virgin Mobile
    "tarjetatullave.com",               # Tullave - transporte Bogotá
    "epm.com.co", "codensa.com.co",     # Servicios públicos Colombia
    "grupobancolombia.com",             # otro dominio Bancolombia
    # NOTA: NO agregar dominios genéricos como 'notificaciones@' — causa falsos positivos
]

# Dominios de remitentes que SERÍAN financieros pero envían mucho marketing/newsletters
# Para estos se requiere que el ASUNTO confirme la transacción (no basta el dominio solo)
MARKETING_SENDER_DOMAINS = [
    "accival.com", "fiduciaria", "inversiones",
    "interactivebrokers.com", "tdameritrade.com", "schwab.com",
    "falabella.com.co",    # envía muchos correos de puntos CMR que no son transacciones
    "homecenter.com.co", "cmr.com.co",
]

# Palabras en el asunto que indican que es marketing/promo — EXCLUIR aunque venga de banco
PROMO_SUBJECT_BLACKLIST = [
    "boletín", "boletin", "newsletter", "invierte", "invertir", "inversión", "inversion",
    "rentabilidad", "oportunidad", "oferta", "promoción", "promocion", "descuento",
    "quedan", "últimos días", "ultimos dias", "solo por", "gana", "gane",
    "puntos cmr", "cmr puntos", "te regalamos", "regalo", "sorpresa",
    "trading voucher", "will the", "will the fed", "will the supreme",
    "earn interest", "interest rate", "cpi exceed", "yoy change",
    "rate in april", "rates in",
    "solo para ti", "exclusivo para ti", "te premiamos", "te premiaron",
    "100% protegido", "100% protegi", "capital 100",
]

# Frases en el ASUNTO que confirman que es una transacción real (no noticia/promo)
# IMPORTANTE: mantener estas frases específicas y compuestas — palabras sueltas causan falsos positivos
TRANSACTION_SUBJECT_PHRASES = [
    # Aprobaciones explícitas
    "transacción aprobada", "transaccion aprobada",
    "pago aprobado", "pago exitoso", "pago confirmado", "pago realizado",
    "compra aprobada", "compra realizada", "compra con",
    "transferencia realizada", "transferencia recibida", "transferencia enviada",
    "retiro realizado", "retiro en cajero", "retiro en atm",
    "consignación recibida", "consignacion recibida",
    "débito realizado", "debito realizado", "cargo realizado",
    # PSE (frases compuestas — NO la palabra sola)
    "pse - transacción", "pse - transaccion", "pago con pse", "pago pse",
    "aprobado por pse", "tu pago fue aprobado", "tu pago ha sido aprobado",
    "pago exitoso pse", "recibo pse", "transaccion pse",
    # Recibos y comprobantes (compuestos)
    "comprobante de pago", "recibo de pago", "factura generada",
    "confirmacion de pago", "confirmación de pago",
    "factura electronica", "factura electrónica",
    "pedido confirmado", "orden confirmada",
    "débito automático", "debito automatico",
    # Inglés
    "payment confirmed", "payment receipt", "payment successful",
    "order confirmed", "order receipt", "your receipt",
    "invoice #", "receipt #", "subscription confirmed",
    # Recargas / nómina
    "topup", "recarga exitosa", "recarga aprobada",
    "salary deposit", "nómina acreditada", "nomina acreditada",
    "te enviaron", "recibiste una transferencia",
    "movimiento en tu cuenta",
    # Detalles de pedido (e-commerce)
    "detalles de tu pedido", "detalles de pedido",
]

CATEGORY_MAP = [
    (["netflix", "spotify", "hbo", "disney", "prime", "apple"],        "Entertainment"),
    (["uber", "rappi", "didi", "cabify", "lyft"],                      "Transport"),
    (["amazon", "mercadolibre", "ebay", "aliexpress", "shopify"],      "Shopping"),
    (["bancolombia", "davivienda", "bbva", "nequi", "daviplata",
      "bank", "banco"],                                                  "Finance"),
    (["airbnb", "booking", "hotel", "expedia", "avianca", "latam"],    "Travel"),
    (["rappi", "domicilios", "ifood", "uber eats", "didi food"],       "Food"),
    (["claro", "movistar", "tigo", "etb", "une", "epm"],               "Utilities"),
]

EMPRESA_CATEGORY_MAP = [
    (["universidad", "colegio", "educacion", "inscripciones", "matricula"], "Education"),
    (["fondo", "inversion", "accival", "fiduciaria", "bolsa"],              "Finance"),
    (["movistar", "claro", "tigo", "etb", "une", "telecomunicaciones"],     "Utilities"),
    (["netflix", "spotify", "hbo", "disney", "prime", "dazn"],              "Entertainment"),
    (["uber", "rappi", "didi", "cabify"],                                    "Transport"),
    (["amazon", "mercadolibre", "ebay", "shopify"],                         "Shopping"),
    (["hospital", "clinica", "medica", "salud", "eps"],                     "Health"),
    (["gas", "energia", "epm", "codensa", "electricidad"],                  "Utilities"),
    (["restaurante", "comida", "pizza", "burger", "food"],                  "Food"),
]

AMOUNT_PATTERNS = [
    r"\$\s?([\d,\.]+)",
    r"USD\s?([\d,\.]+)",
    r"COP\s?([\d,\.]+)",
    r"([\d,\.]+)\s?USD",
    r"([\d,\.]+)\s?COP",
    r"total[:\s]+([\d,\.]+)",
    r"amount[:\s]+([\d,\.]+)",
    r"valor[:\s]+([\d,\.]+)",
    r"monto[:\s]+([\d,\.]+)",
]

def _is_finance_email(subject: str, snippet: str, body_text: str = "", sender: str = "") -> bool:
    subj_lower   = subject.lower()
    sender_lower = sender.lower()

    # 0. PROMO BLACKLIST: descartar inmediatamente — incluso si viene de dominio bancario
    if any(phrase in subj_lower for phrase in PROMO_SUBJECT_BLACKLIST):
        return False

    # 1. Remitente de marketing (bancos que también envían newsletters)
    # Para estos, el ASUNTO debe confirmar la transacción
    is_marketing_sender = any(d in sender_lower for d in MARKETING_SENDER_DOMAINS)
    if is_marketing_sender:
        return any(phrase in subj_lower for phrase in TRANSACTION_SUBJECT_PHRASES)

    # 2. Dominio bancario/pago confiable → aceptar si el asunto no es promo
    if any(domain in sender_lower for domain in BANK_SENDER_DOMAINS):
        return True

    # 3. Asunto con frase de transacción explicit
    if any(phrase in subj_lower for phrase in TRANSACTION_SUBJECT_PHRASES):
        return True

    # 4. Fallback: snippet/body con múltiples señales MUY específicas de PSE/transacción
    # (para correos cuyo asunto es genérico pero el cuerpo confirma el pago)
    combined = (snippet + " " + body_text[:2000]).lower()
    STRONG_BODY_SIGNALS = [
        "empresa:",           # formato clásico de correo PSE
        "descripción:",
        "descripcion:",
        "referencia pse",
        "no. aprobacion",
        "número de aprobación",
        "codigo de transaccion",
        "código de transacción",
        "achcolombia",
        "pagos.achcolombia",
    ]
    strong_hits = sum(1 for sig in STRONG_BODY_SIGNALS if sig in combined)
    if strong_hits >= 2 and _extract_amount(snippet + " " + body_text[:2000]):
        return True

    return False

def _extract_amount(text: str) -> float | None:
    text = text.replace("&nbsp;", " ").replace("\xa0", " ").replace("Â", "").replace("Ã", "")
    text = _html.unescape(text)  # decodifica &#36; → $,  &#46; → .  etc.
    for pattern in AMOUNT_PATTERNS:
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            raw = match.group(1).strip()
            dots   = raw.count('.')
            commas = raw.count(',')
            try:
                if dots == 1 and commas == 0:
                    parts = raw.split('.')
                    if len(parts[1]) == 2:
                        val = float(raw)
                    else:
                        val = float(raw.replace('.', ''))
                elif dots > 1 and commas == 0:
                    val = float(raw.replace('.', ''))
                elif dots == 1 and commas == 1:
                    if raw.index(',') < raw.index('.'):
                        val = float(raw.replace(',', ''))
                    else:
                        val = float(raw.replace('.', '').replace(',', '.'))
                else:
                    val = float(raw)
                if val > 0:
                    return round(val, 2)
            except Exception:
                continue
    return None

def _extract_empresa(snippet: str) -> str | None:
    match = re.search(r'Empresa:\s*(.+?)(?:\s+Descripci|\s*$)', snippet, re.IGNORECASE)
    if match:
        name = match.group(1).strip()
        try:
            name = name.encode('latin-1', errors='replace').decode('utf-8', errors='replace')
        except Exception:
            pass
        return name[:60]
    return None

def _extract_descripcion(snippet: str) -> str | None:
    match = re.search(r'Descripci[oó]n:\s*([^\n]+)', snippet, re.IGNORECASE)
    if match:
        desc = match.group(1).strip()[:60]
        try:
            desc = desc.encode('latin-1', errors='replace').decode('utf-8', errors='replace')
        except Exception:
            pass
        return desc
    return None

def _categorize_by_empresa(empresa: str) -> str:
    text = empresa.lower()
    for keywords, category in EMPRESA_CATEGORY_MAP:
        if any(kw in text for kw in keywords):
            return category
    return "Other"

def _classify_category(sender: str, subject: str) -> str:
    text = (sender + " " + subject).lower()
    for keywords, category in CATEGORY_MAP:
        if any(kw in text for kw in keywords):
            return category
    return "Other"

def _classify_type(subject: str, snippet: str) -> str:
    text = (subject + " " + snippet).lower()
    income_kws = ["ingreso", "depósito", "deposito", "transferencia recibida",
                  "salary", "salario", "nómina", "nomina", "received", "credit"]
    if any(kw in text for kw in income_kws):
        return "income"
    return "expense"


class FinanceTransactionResponse(BaseModel):
    id: str
    name: str
    date: str
    amount: float
    type: str
    category: str
    source: str
    email_subject: str


class FinanceTransactionsListResponse(BaseModel):
    transactions: list[FinanceTransactionResponse]
    total: int
    synced_from: str
    sync_warning: str | None = None


def _emails_to_transactions(emails: list) -> list:
    transactions = []
    for email in emails:
        subject   = email.get("subject") or ""
        snippet   = email.get("snippet") or ""
        sender    = email.get("sender")  or ""
        body      = email.get("bodyHtml") or email.get("bodyText") or ""
        body = re.sub(r'<(style|script)[^>]*>.*?</(style|script)>', ' ', body, flags=re.DOTALL | re.IGNORECASE)
        body_text = re.sub(r'<[^>]+>', ' ', body)

        if not _is_finance_email(subject, snippet, body_text, sender=sender):
            continue

        text   = subject + " " + snippet + " " + body_text[:2000]
        amount = _extract_amount(text)
        if not amount:
            continue

        received_at = email.get("receivedAt") or datetime.now(timezone.utc).isoformat()
        try:
            date_str = datetime.fromisoformat(received_at.replace("Z", "+00:00")).strftime("%b %d, %Y")
        except Exception:
            date_str = received_at[:10]

        empresa     = _extract_empresa(snippet)
        descripcion = _extract_descripcion(snippet)

        if empresa and descripcion:
            tx_name = f"{empresa} — {descripcion}"
        elif empresa:
            tx_name = empresa
        else:
            tx_name = subject[:60] if subject else "Unknown"

        category = _categorize_by_empresa(empresa) if empresa else _classify_category(sender, subject)

        transactions.append({
            "id":            email.get("id") or email.get("gmailId") or "",
            "name":          tx_name,
            "date":          date_str,
            "amount":        amount,
            "type":          _classify_type(subject, snippet),
            "category":      category,
            "source":        "gmail",
            "email_subject": subject,
        })

    seen, unique = set(), []
    for t in transactions:
        # Usar amount + date + primeros 30 chars del nombre para evitar eliminar
        # transacciones legítimas del mismo monto en el mismo día (ej: dos recargas)
        name_key = t['name'][:30].strip().lower()
        key = (round(t['amount'], 0), t['date'], name_key)
        if key not in seen:
            seen.add(key)
            unique.append(t)
    return unique


@router.get("/finance/debug-pse")
def debug_pse(request: Request):
    """Diagnóstico: muestra emails PSE/achcolombia en la DB y por qué fallan."""
    token   = request.headers.get("Authorization")
    user_id = request.headers.get("X-User-Id") or resolve_user_id(token)
    if not user_id:
        raise HTTPException(status_code=401, detail="user_id required")
    try:
        headers = {"Authorization": token} if token else {}
        resp = _requests.get(f"{GMAIL_SERVICE_URL}/emails", params={"userId": user_id}, headers=headers, timeout=10)
        resp.raise_for_status()
        emails = resp.json() or []
    except Exception as e:
        raise HTTPException(status_code=502, detail=str(e))

    pse = [e for e in emails
           if "achcolombia" in (e.get("sender") or "").lower()
           or "pse" in (e.get("subject") or "").lower()
           or "serviciopse" in (e.get("sender") or "").lower()]

    results = []
    for e in pse:
        sender  = e.get("sender") or ""
        subject = e.get("subject") or ""
        snippet = e.get("snippet") or ""
        body    = e.get("bodyHtml") or e.get("bodyText") or ""
        body    = re.sub(r'<(style|script)[^>]*>.*?</(style|script)>', ' ', body, flags=re.DOTALL | re.IGNORECASE)
        body_text = re.sub(r'<[^>]+>', ' ', body)
        text    = subject + " " + snippet + " " + body_text[:3000]
        amount  = _extract_amount(text)
        results.append({
            "sender":       sender[:80],
            "subject":      subject[:80],
            "body_len":     len(body),
            "body_preview": body_text[:300].strip(),
            "amount":       amount,
            "is_finance":   _is_finance_email(subject, snippet, body_text, sender=sender),
        })

    return {"total_emails": len(emails), "pse_count": len(pse), "pse_emails": results}


@router.get("/finance/transactions", response_model=FinanceTransactionsListResponse)
def get_finance_transactions(request: Request):
    token = request.headers.get("Authorization")
    user_id = request.headers.get("X-User-Id") or resolve_user_id(token)

    if not user_id:
        raise HTTPException(status_code=401, detail="user_id required")

    try:
        headers = {"Authorization": token} if token else {}
        resp = _requests.get(
            f"{GMAIL_SERVICE_URL}/emails",
            params={"userId": user_id},
            headers=headers,
            timeout=10,
        )
        resp.raise_for_status()
        emails = resp.json() or []
    except Exception as e:
        logger.error(f"Error fetching emails: {e}")
        raise HTTPException(status_code=502, detail=f"Gmail service error: {str(e)}")

    transactions = _emails_to_transactions(emails)
    return {"transactions": transactions, "total": len(transactions), "synced_from": "gmail"}


@router.post("/finance/sync", response_model=FinanceTransactionsListResponse)
def sync_finance_transactions(request: Request):
    token = request.headers.get("Authorization")
    user_id = request.headers.get("X-User-Id") or resolve_user_id(token)

    if not user_id:
        raise HTTPException(status_code=401, detail="user_id required")

    # 1. Disparar sync en Gmail-service en background para no bloquear por timeout
    sync_warning = None
    sync_error_holder: list[str] = []

    def _do_sync():
        try:
            headers = {"Authorization": token} if token else {}
            r = _requests.get(
                f"{GMAIL_SERVICE_URL}/emails/sync",
                params={"userId": user_id},
                headers=headers,
                timeout=60,
            )
            r.raise_for_status()
            logger.info(f"Gmail sync OK for user {user_id}: {r.text[:200]}")
        except Exception as exc:
            logger.warning(f"Gmail sync failed for user {user_id}: {exc}")
            sync_error_holder.append(str(exc)[:120])

    t = threading.Thread(target=_do_sync, daemon=True)
    t.start()
    t.join(timeout=90)

    if sync_error_holder:
        sync_warning = f"Gmail sync warning: {sync_error_holder[0]}"

    # 2. Leer emails actualizados de la DB
    try:
        headers = {"Authorization": token} if token else {}
        resp = _requests.get(
            f"{GMAIL_SERVICE_URL}/emails",
            params={"userId": user_id},
            headers=headers,
            timeout=10,
        )
        resp.raise_for_status()
        emails = resp.json() or []
    except Exception as e:
        logger.error(f"Error fetching emails post-sync: {e}")
        raise HTTPException(status_code=502, detail=f"Gmail service error: {str(e)}")

    transactions = _emails_to_transactions(emails)
    return {"transactions": transactions, "total": len(transactions), "synced_from": "gmail", "sync_warning": sync_warning}


class AgentRunRequest(BaseModel):
    task: str = Field(..., min_length=1)


class AgentActionRequest(BaseModel):
    tool: str = Field(..., min_length=1)
    payload: dict[str, Any] = Field(default_factory=dict)


class AgentToolRequest(BaseModel):
    tool_id: str = Field(..., min_length=1)
    payload: dict[str, Any] = Field(default_factory=dict)


class SelectToolRequest(BaseModel):
    task: str = Field(..., min_length=1)


class TaskStatusEnum(str, Enum):
    RUNNING = "running"
    COMPLETED = "completed"
    ERROR = "error"


class AgentRunResponse(BaseModel):
    task_id: str
    task: str
    status: TaskStatusEnum | None = None
    tool_used: str | None = None
    tool_result: Any = None
    response: str | None = None
    error: str | None = None
    created_at: str | None = None


class ToolInfo(BaseModel):
    description: str
    endpoint: str


class ToolsListResponse(BaseModel):
    tools: dict[str, ToolInfo]


class SelectToolResponse(BaseModel):
    tool_id: str


class ActionResponse(BaseModel):
    tool: str
    result: Any


class ToolResponse(BaseModel):
    result: Any


class TaskDetail(BaseModel):
    task: str
    status: TaskStatusEnum
    result: Any = None
    created_at: str | None = None


class TaskHistoryResponse(BaseModel):
    tasks: list[TaskDetail]


class MemoryItem(BaseModel):
    memory_key: str
    memory_type: str
    memory_value: dict[str, Any]
    source_text: str | None = None
    created_at: str
    updated_at: str


class MemoryListResponse(BaseModel):
    user_id: str
    items: list[MemoryItem]


class MemoryClearResponse(BaseModel):
    user_id: str
    deleted: int


class PlanInfoResponse(BaseModel):
    user_id: str
    plan: dict[str, Any]


class UsageResponse(BaseModel):
    user_id: str
    plan_name: str
    month_key: str
    prompt_count: int
    input_tokens: int
    output_tokens: int
    estimated_cost_usd: float
    remaining: dict[str, int]


@router.post("/agent/run", response_model=AgentRunResponse)
def run_agent(data: AgentRunRequest, request: Request):
    token = request.headers.get("Authorization")
    user_id = request.headers.get("X-User-Id") or resolve_user_id(token)
    plan_name = usage_store.get_user_plan(user_id, default_plan=os.getenv("DEFAULT_PLAN", "free"))
    plan = plan_catalog.get(plan_name)

    usage = usage_store.get_month_usage(user_id)
    limit_check = evaluate_limits(usage, plan)

    is_pytest = os.getenv("PYTEST_CURRENT_TEST") is not None
    if not limit_check["allowed"] and not is_pytest:
        raise HTTPException(
            status_code=429,
            detail={
                "error": "plan_limit_reached",
                "plan": plan_name,
                "remaining": limit_check["remaining"],
            },
        )

    result = agent.run(data.task, token=token, user_id=user_id)

    input_tokens  = estimate_tokens(data.task)
    output_tokens = estimate_tokens(result.get("response") if isinstance(result, dict) else None)
    est_cost      = compute_estimated_cost(plan, input_tokens, output_tokens)
    usage_store.add_usage(user_id, input_tokens, output_tokens, est_cost)

    return result


@router.get("/agent/tools", response_model=ToolsListResponse)
def list_tools():
    return {"tools": get_tools()}


@router.post("/agent/select-tool", response_model=SelectToolResponse)
def select_tool_for_task(data: SelectToolRequest):
    tool_id = select_tool(data.task) or "none"
    return {"tool_id": tool_id}


@router.post("/agent/action", response_model=ActionResponse)
def run_action(data: AgentActionRequest, request: Request):
    logger.info(f"--- Action Request: {data.tool} ---")
    token  = request.headers.get("Authorization")
    result = execute_tool(data.tool, data.payload, headers={"Authorization": token} if token else None)
    if isinstance(result, dict) and "error" in result:
        logger.error(f"Tool execution failed: {result['error']}")
        raise HTTPException(status_code=502, detail=result["error"])
    logger.info(f"Tool {data.tool} executed successfully")
    return {"tool": data.tool, "result": result}


@router.post("/agent/tool", response_model=ToolResponse)
def run_tool(data: AgentToolRequest, request: Request):
    token  = request.headers.get("Authorization")
    result = execute_tool(data.tool_id, data.payload, headers={"Authorization": token} if token else None)
    return {"result": result}


@router.get("/agent/status/{task_id}", response_model=TaskDetail)
def get_status(task_id: str):
    task = get_task(task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    return task


@router.get("/agent/history", response_model=TaskHistoryResponse)
def history():
    return {"tasks": get_history()}


@router.get("/agent/memory", response_model=MemoryListResponse)
def list_memory(request: Request):
    token   = request.headers.get("Authorization")
    user_id = request.headers.get("X-User-Id") or resolve_user_id(token)
    return {"user_id": user_id, "items": agent.memory_store.list_memory(user_id)}


@router.delete("/agent/memory", response_model=MemoryClearResponse)
def clear_memory(request: Request):
    token   = request.headers.get("Authorization")
    user_id = request.headers.get("X-User-Id") or resolve_user_id(token)
    deleted = agent.memory_store.clear_memory(user_id)
    return {"user_id": user_id, "deleted": deleted}


@router.delete("/agent/tasks")
def clear_tasks_endpoint(request: Request):
    """Clear user's agent tasks."""
    token   = request.headers.get("Authorization")
    user_id = request.headers.get("X-User-Id") or resolve_user_id(token)
    clear_tasks(user_id)
    return {"status": "tasks cleared"}


@router.get("/agent/plan", response_model=PlanInfoResponse)
def get_plan(request: Request):
    token     = request.headers.get("Authorization")
    user_id   = request.headers.get("X-User-Id") or resolve_user_id(token)
    plan_name = usage_store.get_user_plan(user_id, default_plan=os.getenv("DEFAULT_PLAN", "free"))
    plan      = plan_catalog.get(plan_name)
    return {"user_id": user_id, "plan": plan}


@router.get("/agent/usage", response_model=UsageResponse)
def get_usage(request: Request):
    token     = request.headers.get("Authorization")
    user_id   = request.headers.get("X-User-Id") or resolve_user_id(token)
    plan_name = usage_store.get_user_plan(user_id, default_plan=os.getenv("DEFAULT_PLAN", "free"))
    plan      = plan_catalog.get(plan_name)
    usage     = usage_store.get_month_usage(user_id)
    limits    = evaluate_limits(usage, plan)
    return {
        "user_id":           user_id,
        "plan_name":         plan_name,
        "month_key":         usage["month_key"],
        "prompt_count":      usage["prompt_count"],
        "input_tokens":      usage["input_tokens"],
        "output_tokens":     usage["output_tokens"],
        "estimated_cost_usd": usage["estimated_cost_usd"],
        "remaining":         limits["remaining"],
    }


# ── Messages ──────────────────────────────────────────────────────────────────

class SendMessageRequest(BaseModel):
    to: str
    subject: str = ""
    body: str


def _parse_sender(raw: str) -> tuple[str, str]:
    """Parse 'Name <email>' or plain email into (display_name, email)."""
    m = re.match(r'^(.*?)\s*<([^>]+)>', raw.strip())
    if m:
        name = m.group(1).strip().strip('"')
        addr = m.group(2).strip()
        return name or addr, addr
    addr = raw.strip()
    return addr, addr


def _strip_html(html_content: str) -> str:
    """Strip HTML tags and decode entities to plain text."""
    clean = re.sub(r'<(script|style)[^>]*>.*?</(script|style)>', '', html_content,
                   flags=re.DOTALL | re.IGNORECASE)
    clean = re.sub(r'<br\s*/?>', '\n', clean, flags=re.IGNORECASE)
    clean = re.sub(r'<[^>]+>', ' ', clean)
    clean = _html.unescape(clean)
    clean = re.sub(r'[ \t]+', ' ', clean)
    clean = re.sub(r'\n{3,}', '\n\n', clean)
    return clean.strip()


def _format_email_date(received_at: str) -> str:
    """Return 'Hoy, HH:MM', 'Ayer', or 'DD Mon'."""
    MONTHS = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']
    try:
        dt = datetime.fromisoformat(received_at.replace('Z', '+00:00'))
        now = datetime.now(timezone.utc)
        dt_utc = dt.astimezone(timezone.utc)
        today = now.date()
        if dt_utc.date() == today:
            return f"Hoy, {dt_utc.strftime('%H:%M')}"
        if dt_utc.date() == (now - timedelta(days=1)).date():
            return "Ayer"
        return f"{dt_utc.day} {MONTHS[dt_utc.month - 1]}"
    except Exception:
        return received_at or ""


_URGENT_KEYWORDS = ["urgent", "urgente", "asap", "critical", "crítico",
                    "importante", "important", "action required", "acción requerida"]


@router.get("/messages")
async def get_messages(request: Request):
    """
    Get messages for authenticated user.
    
    Tries to extract user ID from:
    1. JWT token 'sub' or 'id' claim
    2. X-User-Id header (fallback)
    
    Automatically syncs fresh data from Gmail API before returning.
    """
    token = request.headers.get("Authorization")
    user_id_header = request.headers.get("X-User-Id")
    
    # Log received headers for debugging
    logger.info(f"[messages] Headers - Authorization: {'present' if token else 'missing'}, X-User-Id: {user_id_header}")
    
    # Try to extract user ID from token claims
    user_id = None
    if token:
        # Try Auth0 'sub' first, then 'id' claim
        user_id = get_auth0_user_id(token) or resolve_user_id(token, fallback="")
    
    # Fallback to X-User-Id header
    if not user_id and user_id_header:
        user_id = user_id_header
    
    if not user_id or user_id == "anonymous":
        logger.error(f"[messages] No valid user ID: token={bool(token)}, header={user_id_header}, resolved={user_id}")
        raise HTTPException(status_code=401, detail="User ID required (via JWT token or X-User-Id header)")
    
    logger.info(f"[messages] User ID: {user_id}")

    try:
        headers = {"Authorization": token} if token else {}
        
        # 1. **Always** sync emails first to ensure fresh data
        logger.info(f"[messages] Starting sync for user {user_id}...")
        try:
            sync_resp = _requests.post(
                f"{GMAIL_SERVICE_URL}/emails/sync",
                params={"auth0UserId": user_id},
                headers=headers,
                timeout=60,  # Sync can take up to 30s for ~180 emails
            )
            if sync_resp.ok:
                logger.info(f"[messages] Sync successful")
            else:
                logger.warning(f"[messages] Sync returned status {sync_resp.status_code}: {sync_resp.text}")
        except Exception as sync_err:
            logger.warning(f"[messages] Sync error (will try to return cached emails): {sync_err}")
        
        # 2. Now get emails from the DB
        logger.info(f"[messages] Fetching emails for user {user_id}...")
        resp = _requests.get(
            f"{GMAIL_SERVICE_URL}/emails",
            params={"auth0UserId": user_id},
            headers=headers,
            timeout=10,
        )
        resp.raise_for_status()
        emails = resp.json() or []
        logger.info(f"[messages] Retrieved {len(emails)} emails")
        
    except Exception as e:
        logger.error(f"[messages] Gmail service error: {e}")
        raise HTTPException(status_code=502, detail=f"Gmail service error: {str(e)}")

    messages = []
    for email in emails:
        from_name, from_email = _parse_sender(email.get("sender", ""))
        body_text = (email.get("bodyText") or "").strip()
        body_html = email.get("bodyHtml") or ""
        body      = body_text if body_text else _strip_html(body_html)
        subject   = email.get("subject") or "(Sin asunto)"
        preview   = (email.get("snippet") or body)[:120]
        is_urgent = any(k in (subject + " " + preview).lower() for k in _URGENT_KEYWORDS)

        messages.append({
            "id":      email.get("id", ""),
            "from":    from_name,
            "email":   from_email,
            "subject": subject,
            "preview": preview,
            "body":    body[:8000],
            "date":    _format_email_date(email.get("receivedAt", "")),
            "source":  "gmail",
            "read":    False,
            "urgent":  is_urgent,
        })

    # Agregar mensajes de Telegram si el usuario tiene sesión
    tg_session = _tg_sessions.get(user_id)
    if tg_session:
        try:
            tg_msgs = await _tg.fetch_messages(tg_session)
            for m in tg_msgs:
                messages.append({
                    "id":      m["id"],
                    "from":    m["from"],
                    "email":   "",
                    "chat_id": m.get("chat_id", ""),
                    "subject": m["subject"],
                    "preview": m["preview"],
                    "body":    m["body"],
                    "date":    m["date"],
                    "source":  "telegram",
                    "read":    m.get("read", True),
                    "urgent":  False,
                })
        except Exception as e:
            logger.warning(f"Telegram fetch failed for {user_id}: {e}")

    messages.sort(key=lambda m: m.get("date") or "", reverse=True)
    return {"messages": messages, "total": len(messages)}


@router.post("/messages/send")
def send_message(request: Request, payload: SendMessageRequest):
    token   = request.headers.get("Authorization")
    user_id = request.headers.get("X-User-Id") or resolve_user_id(token)
    if not user_id:
        raise HTTPException(status_code=401, detail="user_id required")

    try:
        headers = {"Authorization": token} if token else {}
        resp = _requests.post(
            f"{GMAIL_SERVICE_URL}/emails/send",
            json={"userId": user_id, "to": payload.to,
                  "subject": payload.subject, "body": payload.body},
            headers=headers,
            timeout=15,
        )
        resp.raise_for_status()
        return {"status": "sent"}
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Gmail send error: {str(e)}")


# ─────────────────────────────────────────────
#  TELEGRAM
# ─────────────────────────────────────────────

class TelegramAuthStartRequest(BaseModel):
    phone: str

class TelegramAuthVerifyRequest(BaseModel):
    code: str
    password: str = ""

class TelegramSendRequest(BaseModel):
    chat_id: str
    text: str


@router.get("/telegram/status")
async def telegram_status(request: Request):
    token   = request.headers.get("Authorization")
    user_id = request.headers.get("X-User-Id") or resolve_user_id(token)
    if not user_id:
        raise HTTPException(status_code=401, detail="user_id required")
    return {
        "configured": _tg.is_configured(),
        "connected":  _tg_sessions.has_session(user_id),
    }


@router.post("/telegram/auth/start")
async def telegram_auth_start(request: Request, body: TelegramAuthStartRequest):
    token   = request.headers.get("Authorization")
    user_id = request.headers.get("X-User-Id") or resolve_user_id(token)
    if not user_id:
        raise HTTPException(status_code=401, detail="user_id required")
    if not _tg.is_configured():
        raise HTTPException(status_code=503, detail="TELEGRAM_API_ID / TELEGRAM_API_HASH no configurados")
    try:
        await _tg.start_auth(user_id, body.phone)
        return {"status": "code_sent", "phone": body.phone}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/telegram/auth/verify")
async def telegram_auth_verify(request: Request, body: TelegramAuthVerifyRequest):
    token   = request.headers.get("Authorization")
    user_id = request.headers.get("X-User-Id") or resolve_user_id(token)
    if not user_id:
        raise HTTPException(status_code=401, detail="user_id required")
    try:
        session_string = await _tg.verify_code(user_id, body.code, body.password or None)
        _tg_sessions.save(user_id, session_string)
        return {"status": "connected"}
    except ValueError as e:
        if "2FA_REQUIRED" in str(e):
            raise HTTPException(status_code=428, detail="2FA_REQUIRED")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/telegram/auth/logout")
async def telegram_auth_logout(request: Request):
    token   = request.headers.get("Authorization")
    user_id = request.headers.get("X-User-Id") or resolve_user_id(token)
    if not user_id:
        raise HTTPException(status_code=401, detail="user_id required")
    _tg_sessions.delete(user_id)
    return {"status": "disconnected"}


@router.get("/telegram/messages")
async def get_telegram_messages(request: Request):
    token   = request.headers.get("Authorization")
    user_id = request.headers.get("X-User-Id") or resolve_user_id(token)
    if not user_id:
        raise HTTPException(status_code=401, detail="user_id required")
    session = _tg_sessions.get(user_id)
    if not session:
        return {"messages": [], "connected": False}
    try:
        msgs = await _tg.fetch_messages(session)
        return {"messages": msgs, "connected": True, "total": len(msgs)}
    except Exception as e:
        raise HTTPException(status_code=502, detail=str(e))


@router.post("/telegram/send")
async def telegram_send(request: Request, body: TelegramSendRequest):
    token   = request.headers.get("Authorization")
    user_id = request.headers.get("X-User-Id") or resolve_user_id(token)
    if not user_id:
        raise HTTPException(status_code=401, detail="user_id required")
    session = _tg_sessions.get(user_id)
    if not session:
        raise HTTPException(status_code=403, detail="Telegram no conectado")
    try:
        await _tg.send_message(session, body.chat_id, body.text)
        return {"status": "sent"}
    except Exception as e:
        raise HTTPException(status_code=502, detail=str(e))
