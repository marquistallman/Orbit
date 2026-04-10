const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:12001'

export interface App {
  id: string
  name: string
  description: string
  category: string
  status: 'connected' | 'error' | 'expiring' | 'disconnected'
  meta: string
  usage: number
  color: string
  icon: string
}

export interface ActivityLog {
  id: string
  app: string
  message: string
  time: string
  type: 'success' | 'error' | 'warning' | 'info'
}

export interface AppsSummary {
  connected: number
  available: number
  errors: number
  uptime: number
}

import { useAuthStore } from '../store/authStore'

function authHeaders(): Record<string, string> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  
  const token = localStorage.getItem('token')
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }
  
  // Enviar userId como header adicional (fallback)
  // Primero intentar del localStorage (más confiable), luego del store
  let userId = localStorage.getItem('userId')
  
  if (!userId) {
    try {
      const user = useAuthStore.getState().user
      if (user?.id) {
        userId = user.id
      }
    } catch (e) {
      // Silently ignore if useAuthStore fails
    }
  }
  
  if (userId && userId !== '0') {
    headers['X-User-Id'] = userId
  }
  
  return headers
}

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, { headers: authHeaders() })
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`)
  return res.json()
}

async function del(path: string): Promise<void> {
  const res = await fetch(`${BASE_URL}${path}`, { method: 'DELETE', headers: authHeaders() })
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`)
}

async function post(path: string): Promise<void> {
  const res = await fetch(`${BASE_URL}${path}`, { method: 'POST', headers: authHeaders() })
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`)
}

export const getConnectedApps  = (): Promise<App[]>         => get('/api/apps/connected')
export const getAvailableApps  = (): Promise<App[]>         => get('/api/apps/available')
export const getActivityLog    = (): Promise<ActivityLog[]> => get('/api/apps/activity')
export const getAppsSummary    = (): Promise<AppsSummary>   => get('/api/apps/summary')

export const connectApp    = (_appId: string): Promise<void> => {
  // OAuth flow — redirect browser through auth-service
  window.location.href = `${BASE_URL}/oauth2/authorization/${_appId}`
  return Promise.resolve()
}

export const disconnectApp = (appId: string): Promise<void> => del(`/api/apps/${appId}/disconnect`)
export const renewToken    = (appId: string): Promise<void> => post(`/api/apps/${appId}/renew`)
