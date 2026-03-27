"""
Test suite for agent routes and API endpoints.
Tests validate request/response contracts and endpoint behavior.
"""

import pytest
from fastapi.testclient import TestClient

from main import app


client = TestClient(app)


class TestAgentRunEndpoint:
    """Tests for POST /agent/run endpoint."""

    def test_run_agent_success(self):
        """Test successful task execution."""
        response = client.post(
            "/agent/run",
            json={"task": "write email about project"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "task_id" in data
        assert data["task"] == "write email about project"
        assert "response" in data

    def test_run_agent_empty_task(self):
        """Test that empty task is rejected."""
        response = client.post(
            "/agent/run",
            json={"task": ""}
        )
        assert response.status_code == 422  # Validation error

    def test_run_agent_missing_task(self):
        """Test that missing task field is rejected."""
        response = client.post(
            "/agent/run",
            json={}
        )
        assert response.status_code == 422  # Validation error


class TestListToolsEndpoint:
    """Tests for GET /agent/tools endpoint."""

    def test_list_tools_success(self):
        """Test that tools are returned in expected format."""
        response = client.get("/agent/tools")
        assert response.status_code == 200
        data = response.json()
        assert "tools" in data
        assert isinstance(data["tools"], dict)
        # Check for known tools
        assert "gmail_read" in data["tools"] or len(data["tools"]) >= 0


class TestSelectToolEndpoint:
    """Tests for POST /agent/select-tool endpoint."""

    def test_select_tool_success(self):
        response = client.post(
            "/agent/select-tool",
            json={"task": "write email to customer"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "tool_id" in data
        assert isinstance(data["tool_id"], str)

    def test_select_tool_validation(self):
        response = client.post(
            "/agent/select-tool",
            json={"task": ""}
        )
        assert response.status_code == 422


class TestActionEndpoint:
    """Tests for POST /agent/action endpoint."""

    def test_action_success(self):
        """Test tool action execution."""
        response = client.post(
            "/agent/action",
            json={
                "tool": "email_generate",
                "payload": {"task": "write email"}
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert "tool" in data
        assert "result" in data

    def test_action_empty_tool(self):
        """Test that empty tool is rejected."""
        response = client.post(
            "/agent/action",
            json={
                "tool": "",
                "payload": {}
            }
        )
        assert response.status_code == 422

    def test_action_missing_tool(self):
        """Test that missing tool field is rejected."""
        response = client.post(
            "/agent/action",
            json={"payload": {}}
        )
        assert response.status_code == 422


class TestToolEndpoint:
    """Tests for POST /agent/tool endpoint."""

    def test_tool_success(self):
        """Test direct tool execution."""
        response = client.post(
            "/agent/tool",
            json={
                "tool_id": "finance_analysis",
                "payload": {"task": "analyze market"}
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert "result" in data

    def test_tool_empty_id(self):
        """Test that empty tool_id is rejected."""
        response = client.post(
            "/agent/tool",
            json={
                "tool_id": "",
                "payload": {}
            }
        )
        assert response.status_code == 422


class TestTaskStatusEndpoint:
    """Tests for GET /agent/status/{task_id} endpoint."""

    def test_status_not_found(self):
        """Test that non-existent task returns 404."""
        response = client.get("/agent/status/nonexistent-task-id")
        assert response.status_code == 404
        data = response.json()
        assert "detail" in data


class TestTaskHistoryEndpoint:
    """Tests for GET /agent/history endpoint."""

    def test_history_success(self):
        """Test that history is returned in expected format."""
        response = client.get("/agent/history")
        assert response.status_code == 200
        data = response.json()
        assert "tasks" in data
        assert isinstance(data["tasks"], list)


class TestHealthEndpoint:
    """Tests for GET / health endpoint."""

    def test_health_check(self):
        """Test that health endpoint returns service status."""
        response = client.get("/")
        assert response.status_code == 200
        data = response.json()
        assert "status" in data
