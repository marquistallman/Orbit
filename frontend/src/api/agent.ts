/**
 * API client for IA-service integration
 * Handles all communication with the AI agent backend
 */

const IA_SERVICE_URL = import.meta.env.VITE_IA_SERVICE_URL || "http://localhost:5000";

export interface AgentRunRequest {
  task: string;
}

export interface AgentRunResponse {
  task_id: string;
  task: string;
  status: string | null;
  tool_used: string | null;
  tool_result: string | null;
  response: string;
  error: string | null;
  created_at: string | null;
}

export interface AgentToolsResponse {
  tools: Record<string, { description: string; endpoint: string }>;
}

export interface AgentActionRequest {
  tool: string;
  payload: Record<string, unknown>;
}

export interface AgentActionResponse {
  action_id: string;
  tool: string;
  status: string;
  result: unknown;
}

export interface AgentTaskDetail {
  task_id: string;
  task: string;
  status: string;
  result: unknown;
}

export class AgentAPIError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public responseBody?: unknown
  ) {
    super(message);
    this.name = "AgentAPIError";
  }
}

/**
 * Execute a task with the AI agent
 * @param request - The task to execute
 * @returns Promise containing task result
 */
export async function runAgentTask(
  request: AgentRunRequest,
  token?: string
): Promise<AgentRunResponse> {
  const headers: HeadersInit = {
    "Content-Type": "application/json",
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  try {
    const response = await fetch(`${IA_SERVICE_URL}/agent/run`, {
      method: "POST",
      headers,
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new AgentAPIError(
        response.status,
        `Failed to run agent task: ${response.statusText}`,
        errorBody
      );
    }

    return await response.json();
  } catch (error) {
    if (error instanceof AgentAPIError) throw error;
    throw new Error(
      `Agent API error: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * List all available tools
 * @returns Promise containing list of tools
 */
export async function getAvailableTools(
  token?: string
): Promise<AgentToolsResponse> {
  const headers: HeadersInit = {};

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  try {
    const response = await fetch(`${IA_SERVICE_URL}/agent/tools`, {
      method: "GET",
      headers,
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new AgentAPIError(
        response.status,
        `Failed to fetch tools: ${response.statusText}`,
        errorBody
      );
    }

    return await response.json();
  } catch (error) {
    if (error instanceof AgentAPIError) throw error;
    throw new Error(
      `Agent API error: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Execute a specific action/tool
 * @param request - The action to execute
 * @returns Promise containing action result
 */
export async function executeAgentAction(
  request: AgentActionRequest,
  token?: string
): Promise<AgentActionResponse> {
  const headers: HeadersInit = {
    "Content-Type": "application/json",
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  try {
    const response = await fetch(`${IA_SERVICE_URL}/agent/action`, {
      method: "POST",
      headers,
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new AgentAPIError(
        response.status,
        `Failed to execute action: ${response.statusText}`,
        errorBody
      );
    }

    return await response.json();
  } catch (error) {
    if (error instanceof AgentAPIError) throw error;
    throw new Error(
      `Agent API error: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Get task status/details
 * @param taskId - The task ID to retrieve
 * @returns Promise containing task details
 */
export async function getTaskDetail(
  taskId: string,
  token?: string
): Promise<AgentTaskDetail> {
  const headers: HeadersInit = {};

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  try {
    const response = await fetch(
      `${IA_SERVICE_URL}/agent/task/${taskId}`,
      {
        method: "GET",
        headers,
      }
    );

    if (!response.ok) {
      const errorBody = await response.text();
      throw new AgentAPIError(
        response.status,
        `Failed to fetch task detail: ${response.statusText}`,
        errorBody
      );
    }

    return await response.json();
  } catch (error) {
    if (error instanceof AgentAPIError) throw error;
    throw new Error(
      `Agent API error: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Health check for IA-service
 */
export async function checkAgentHealth(): Promise<boolean> {
  try {
    const response = await fetch(`${IA_SERVICE_URL}/health`, {
      method: "GET",
    });
    return response.ok;
  } catch {
    return false;
  }
}
