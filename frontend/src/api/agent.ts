// Use explicit IA service URL in dev; fallback to nginx reverse-proxy path in dockerized frontend.
const BASE_URL = import.meta.env.VITE_IA_URL || 'http://localhost:5000'

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
  return token ? { Authorization: `Bearer ${token}` } : {}
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
