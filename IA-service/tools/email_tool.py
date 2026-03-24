def generate_email(payload):

    task = payload.get("task", "")

    return f"""
Subject: Request for Information

Dear Sir/Madam,

I hope this message finds you well.

I would like to request more information regarding {task}.

I appreciate your time and assistance.

Best regards,
[Your Name]
"""