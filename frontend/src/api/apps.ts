const _BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001'

export const getApps = async () => {
  // REAL: GET /api/apps
  return []
}

export const connectApp = async (_provider: string) => {
  // REAL: POST /api/apps/connect
}

export const disconnectApp = async (_provider: string) => {
  // REAL: DELETE /api/apps/:provider
}
