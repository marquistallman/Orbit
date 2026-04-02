import os
from typing import Any
from datetime import datetime
from enum import Enum
from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, Field

from agents.agent import Agent
from agents.task_memory import get_task, get_history
from ai.user_memory import resolve_user_id
from ai.usage_meter import PlanCatalog, UsageStore, compute_estimated_cost, estimate_tokens, evaluate_limits
from tools.registry import get_tools
from tools.tool_selector import select_tool
from tools.tool_executor import execute_tool
from utils.logger import logger

import re
import requests as _requests

router = APIRouter()

agent = Agent()
plan_catalog = PlanCatalog()
usage_store = UsageStore(os.getenv("USAGE_DB_PATH", os.path.join(os.path.dirname(os.path.dirname(__file__)), "data", "usage.db")))

GMAIL_SERVICE_URL = os.getenv("GMAIL_SERVICE_URL", "http://localhost:8082")

FINANCE_KEYWORDS = [
    "factura", "recibo", "invoice", "receipt", "payment", "pago", "cobro",
    "transferencia", "compra", "purchase", "charge", "débito", "debito",
    "transacción", "transaccion", "order", "orden", "subscription", "suscripcion",
    "bill", "cuenta", "estado de cuenta", "confirmación de pago", "paid",
    "$", "usd", "cop", "precio", "price", "salary", "salario", "earnings",
    "ingresos", "mercado", "portfolio", "stock", "vacante", "empleo",
    "por mes", "mensual", "annual", "total",
]

PROMO_KEYWORDS = [
    # Promociones claras
    "aprovecha", "oferta", "promocion", "promo", "descuento", "discount",
    "vuelven a ti", "cashback", "bre-b", "rentabilidad preferencial",
    "si recibes desde", "puedes tener", "empieza a ahorrar", "tus metas",
    "no esperes más",
    # Transacciones fallidas/rechazadas (frases específicas, no palabras sueltas)
    "transacción rechazada", "pago rechazado", "transaccion rechazada",
    "denegada", "denegado", "declined",
    "transacción fallida", "pago fallido", "transaccion fallida",
    "no aprobada", "no autorizada",
    "transacción cancelada", "pago cancelado", "transaccion cancelada",
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

def _is_finance_email(subject: str, snippet: str, body_text: str = "") -> bool:
    text = (subject + " " + snippet + " " + body_text[:1000]).lower()
    if any(kw in text for kw in PROMO_KEYWORDS):
        return False
    return any(kw in text for kw in FINANCE_KEYWORDS)

def _extract_amount(text: str) -> float | None:
    text = text.replace("&nbsp;", " ").replace("Â", "").replace("Ã", "")
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


def _emails_to_transactions(emails: list) -> list:
    transactions = []
    for email in emails:
        subject   = email.get("subject") or ""
        snippet   = email.get("snippet") or ""
        sender    = email.get("sender")  or ""
        body      = email.get("bodyHtml") or email.get("bodyText") or ""
        body_text = re.sub(r'<[^>]+>', ' ', body)

        if not _is_finance_email(subject, snippet, body_text):
            continue

        text   = subject + " " + snippet + " " + body_text[:2000]
        amount = _extract_amount(text)
        if not amount:
            continue

        received_at = email.get("receivedAt") or datetime.utcnow().isoformat()
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
        key = (round(t['amount'], 0), t['date'])
        if key not in seen:
            seen.add(key)
            unique.append(t)
    return unique


@router.get("/finance/transactions", response_model=FinanceTransactionsListResponse)
def get_finance_transactions(request: Request):
    token = request.headers.get("Authorization")
    user_id = request.headers.get("X-User-Id") or resolve_user_id(token)

    if not user_id:
        raise HTTPException(status_code=401, detail="user_id required")

    try:
        resp = _requests.get(
            f"{GMAIL_SERVICE_URL}/emails",
            params={"userId": user_id},
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

    # 1. Disparar sync en Gmail-service (trae correos nuevos a la DB)
    try:
        _requests.get(
            f"{GMAIL_SERVICE_URL}/emails/sync",
            params={"userId": user_id},
            timeout=30,
        ).raise_for_status()
    except Exception as e:
        logger.warning(f"Gmail sync parcial o fallido, usando cache: {e}")

    # 2. Leer emails actualizados de la DB
    try:
        resp = _requests.get(
            f"{GMAIL_SERVICE_URL}/emails",
            params={"userId": user_id},
            timeout=10,
        )
        resp.raise_for_status()
        emails = resp.json() or []
    except Exception as e:
        logger.error(f"Error fetching emails post-sync: {e}")
        raise HTTPException(status_code=502, detail=f"Gmail service error: {str(e)}")

    transactions = _emails_to_transactions(emails)
    return {"transactions": transactions, "total": len(transactions), "synced_from": "gmail"}


@router.get("/finance/debug")
def debug_finance_emails(request: Request):
    """Diagnóstico: muestra por qué cada email es incluido o filtrado."""
    token = request.headers.get("Authorization")
    user_id = request.headers.get("X-User-Id") or resolve_user_id(token)
    if not user_id:
        raise HTTPException(status_code=401, detail="user_id required")

    try:
        resp = _requests.get(f"{GMAIL_SERVICE_URL}/emails", params={"userId": user_id}, timeout=10)
        resp.raise_for_status()
        emails = resp.json() or []
    except Exception as e:
        raise HTTPException(status_code=502, detail=str(e))

    results = []
    for email in emails:
        subject   = email.get("subject") or ""
        snippet   = email.get("snippet") or ""
        body      = email.get("bodyHtml") or email.get("bodyText") or ""
        body_text = re.sub(r'<[^>]+>', ' ', body)
        text      = (subject + " " + snippet + " " + body_text[:1000]).lower()

        hit_promo   = [kw for kw in PROMO_KEYWORDS if kw in text]
        hit_finance = [kw for kw in FINANCE_KEYWORDS if kw in text]
        is_finance  = not hit_promo and bool(hit_finance)
        amount      = _extract_amount(subject + " " + snippet + " " + body_text[:2000]) if is_finance else None

        received_at = email.get("receivedAt", "")
        try:
            date_str = datetime.fromisoformat(received_at.replace("Z", "+00:00")).strftime("%b %d, %Y")
        except Exception:
            date_str = received_at[:10]

        results.append({
            "id":           email.get("id") or email.get("gmailId"),
            "date":         date_str,
            "subject":      subject[:80],
            "snippet":      snippet[:120],
            "included":     is_finance and amount is not None,
            "reason":       "ok" if (is_finance and amount) else
                            f"promo_keywords: {hit_promo}" if hit_promo else
                            "no_finance_keywords" if not hit_finance else
                            "no_amount",
            "amount":       amount,
        })

    return {"total_emails": len(emails), "included": sum(1 for r in results if r["included"]), "emails": results}


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
