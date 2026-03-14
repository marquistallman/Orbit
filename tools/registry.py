TOOLS = {
    "gmail_read": {
        "description": "Read user emails",
        "endpoint": "http://localhost:9001/read"
    },
    "document_edit": {
        "description": "Edit documents",
        "endpoint": "http://localhost:9002/edit"
    },
    "code_run": {
        "description": "Run code simulations",
        "endpoint": "http://localhost:9003/run"
    }
}


def get_tools():

    return TOOLS


def get_tool(tool_id):

    return TOOLS.get(tool_id)