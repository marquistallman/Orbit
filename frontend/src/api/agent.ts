const _BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001'

export const runAgent = async (_prompt: string) => {
  // REAL: POST /api/agent/run
  return { taskId: 'mock-task-id' }
}

export const getStatus = async (_taskId: string) => {
  // REAL: GET /api/agent/status/:taskId
  return { status: 'running', progress: 65 }
}

export const getHistory = async () => {
  // REAL: GET /api/agent/history
  return []
}

export const getTools = async () => {
  // REAL: GET /api/agent/tools
  return []
}
