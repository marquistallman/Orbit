import os


# External tools (microservices) are configurable to work both in docker and local runs.
EXTERNAL_TOOLS = {
    "gmail_read": {
        "description": "Read user emails",
        "endpoint": os.getenv("GMAIL_SERVICE_URL", "http://gmail-service:8082") + "/emails",
        "method": "GET"
    },
    "document_edit": {
        "description": "Create or edit Word/PDF documents",
        "endpoint": os.getenv("DOC_SERVICE_URL", "http://doc-service:9002") + "/edit",
        "method": "POST"
    },
    "excel_edit": {
        "description": "Create or edit Excel workbooks",
        "endpoint": os.getenv("EXCEL_SERVICE_URL", "http://excel-service:9004") + "/edit",
        "method": "POST"
    },
    "code_run": {
        "description": "Run code simulations",
        "endpoint": os.getenv("CODE_SERVICE_URL", "http://code-service:9003") + "/run",
        "method": "POST"
    },
    "mini_maps": {
        "description": "Generate compact mini maps from coordinates",
        "endpoint": os.getenv("MINI_MAPS_SERVICE_URL", "http://mini-maps-service:9005") + "/map",
        "method": "POST"
    }
}


# Internal tools are listed as capabilities so they are visible to the frontend.
INTERNAL_TOOLS = {
    "email_generate": {
        "description": "Generate professional email drafts",
        "endpoint": "internal://email_generate"
    },
    "finance_analysis": {
        "description": "Analyze finance tasks and summarize insights",
        "endpoint": "internal://finance_analysis"
    }
}


def get_tools():

    return {**INTERNAL_TOOLS, **EXTERNAL_TOOLS}


def get_external_tools():

    return EXTERNAL_TOOLS


def get_tool(tool_id):

    return get_tools().get(tool_id)