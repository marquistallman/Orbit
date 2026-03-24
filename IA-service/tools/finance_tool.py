def analyze_finance(payload):

    data = payload.get("task", "")

    return f"""
Financial Analysis:

- Revenue trend: Stable
- Risk level: Medium
- Recommendation: Reduce costs and increase revenue streams

Based on input:
{data}
"""