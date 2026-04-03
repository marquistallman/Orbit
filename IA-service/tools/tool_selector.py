def select_tool(task: str):

    task = task.lower()

    # 🔥 DIFERENCIAR EMAILS

    # leer correos
    if "read email" in task or "inbox" in task:
        return "gmail_read"

    # escribir correos
    if "write email" in task or "create email" in task or "send email" in task:
        return "email_generate"

    # -------------------------
    # DOCUMENTOS
    # -------------------------
    if "document" in task or "word" in task:
        return "document_edit"

    if "excel" in task or "spreadsheet" in task or "xlsx" in task:
        return "excel_edit"

    # -------------------------
    # MINI MAPS
    # -------------------------
    if "mini map" in task or "map" in task or "route" in task or "location" in task:
        return "mini_maps"

    # -------------------------
    # CÓDIGO
    # -------------------------
    if "code" in task or "run" in task:
        return "code_run"

    # -------------------------
    # FINANCE
    # -------------------------
    if "finance" in task or "financial" in task:
        return "finance_analysis"

    return None