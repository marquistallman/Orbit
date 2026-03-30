// Use explicit IA service URL in dev; fallback to nginx reverse-proxy path in dockerized frontend.
const BASE_URL = import.meta.env.VITE_IA_SERVICE_URL || '/ai'

export interface AgentRunResponse {
  task_id: string
  task: string
  status: 'running' | 'completed' | 'error' | null
  tool_used: string | null
  tool_result: unknown
  response: string | null
  error: string | null
  created_at: string | null
}

export interface AgentStatusResponse {
  task: string
  status: 'running' | 'completed' | 'error'
  result: unknown
  created_at?: string | null
}

export interface AgentHistoryResponse {
  tasks: AgentStatusResponse[]
}

export interface AgentToolsResponse {
  tools: Record<string, { description: string; endpoint: string }>
}

// IA endpoints currently accept optional auth, but we forward JWT when available.
const authHeaders = (): Record<string, string> => {
  const token = localStorage.getItem('token')
  const headers: Record<string, string> = {}
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }
  // Also forward user ID for usage tracking
  const authStore = localStorage.getItem('orbit-auth')
  if (authStore) {
    try {
      const parsed = JSON.parse(authStore)
      if (parsed.state?.user?.id) {
        headers['X-User-Id'] = parsed.state.user.id
      }
    } catch {
      // Silently fail if can't parse
    }
  }
  return headers
}

export const runAgent = async (prompt: string): Promise<AgentRunResponse> => {
  const res = await fetch(`${BASE_URL}/agent/run`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders(),
    },
    body: JSON.stringify({ task: prompt }),
  })

  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`Error ejecutando agente (${res.status}): ${body || res.statusText}`)
  }

  return res.json()
}

export const getStatus = async (taskId: string): Promise<AgentStatusResponse> => {
  const res = await fetch(`${BASE_URL}/agent/status/${taskId}`, {
    headers: {
      ...authHeaders(),
    },
  })

  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`Error consultando estado (${res.status}): ${body || res.statusText}`)
  }

  return res.json()
}

export const getHistory = async (): Promise<AgentHistoryResponse> => {
  const res = await fetch(`${BASE_URL}/agent/history`, {
    headers: {
      ...authHeaders(),
    },
  })

  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`Error consultando historial (${res.status}): ${body || res.statusText}`)
  }

  return res.json()
}

export const getTools = async (): Promise<AgentToolsResponse> => {
  const res = await fetch(`${BASE_URL}/agent/tools`, {
    headers: {
      ...authHeaders(),
    },
  })

  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`Error consultando herramientas (${res.status}): ${body || res.statusText}`)
  }

  return res.json()
}

export interface AgentPlanResponse {
  user_id: string
  plan: string
  prompts_limit: number
  tokens_limit: number
  max_cost: number
  created_at: string
  updated_at: string
}

export interface AgentUsageResponse {
  user_id: string
  timestamp: string
  prompts_used: number
  tokens_used: number
  cost_used: number
  plan: string
  prompts_limit: number
  tokens_limit: number
  max_cost: number
}

export const getAgentPlan = async (): Promise<AgentPlanResponse> => {
  const res = await fetch(`${BASE_URL}/agent/plan`, {
    headers: {
      ...authHeaders(),
    },
  })

  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`Error consultando plan (${res.status}): ${body || res.statusText}`)
  }

  return res.json()
}

export const getAgentUsage = async (): Promise<AgentUsageResponse> => {
  const res = await fetch(`${BASE_URL}/agent/usage`, {
    headers: {
      ...authHeaders(),
    },
  })

  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`Error consultando uso (${res.status}): ${body || res.statusText}`)
  }

  return res.json()
}