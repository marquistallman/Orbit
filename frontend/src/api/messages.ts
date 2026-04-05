const IA_URL = import.meta.env.VITE_IA_URL || 'http://localhost:12002'

export function formatEmailDate(isoString: string): string {
  if (!isoString) return ''
  try {
    const dt = new Date(isoString)
    const now = new Date()
    const dtDate = new Date(dt.getFullYear(), dt.getMonth(), dt.getDate())
    const todayDate = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const diffDays = Math.round((todayDate.getTime() - dtDate.getTime()) / 86400000)
    if (diffDays === 0) return `Hoy, ${dt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
    if (diffDays === 1) return 'Ayer'
    return dt.toLocaleDateString([], { day: 'numeric', month: 'short' })
  } catch {
    return isoString
  }
}

export interface Message {
  id: string
  from: string
  email: string
  chat_id?: string
  subject: string
  preview: string
  body: string
  date: string
  source: 'gmail' | 'telegram' | string
  read: boolean
  urgent: boolean
}

function authHeaders(): Record<string, string> {
  const token  = localStorage.getItem('token')
  const userId = localStorage.getItem('userId')
  return {
    'Content-Type': 'application/json',
    ...(token  ? { Authorization: `Bearer ${token}` } : {}),
    ...(userId ? { 'X-User-Id': userId }              : {}),
  }
}

export const getMessages = async (): Promise<Message[]> => {
  const res = await fetch(`${IA_URL}/messages`, { headers: authHeaders() })
  if (!res.ok) throw new Error(`Failed to fetch messages: ${res.status}`)
  const data = await res.json()
  return data.messages ?? []
}

export const summarizeMessage = async (_id: string, body: string): Promise<string> => {
  const res = await fetch(`${IA_URL}/agent/run`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ task: `Summarize this email in 2-3 sentences:\n\n${body}` }),
  })
  if (!res.ok) throw new Error('Failed to summarize')
  const data = await res.json()
  return data.response ?? ''
}

export const suggestReply = async (body: string): Promise<string> => {
  const res = await fetch(`${IA_URL}/agent/run`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ task: `Write a professional and concise reply to this email:\n\n${body}` }),
  })
  if (!res.ok) throw new Error('Failed to suggest reply')
  const data = await res.json()
  return data.response ?? ''
}

export const syncMessages = async (): Promise<number> => {
  const res = await fetch(`${IA_URL}/messages/sync`, {
    method: 'POST',
    headers: authHeaders(),
  })
  if (!res.ok) throw new Error(`Sync failed: ${res.status}`)
  const data = await res.json()
  return data.synced ?? 0
}

export const sendReply = async (to: string, subject: string, body: string): Promise<void> => {
  const res = await fetch(`${IA_URL}/messages/send`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ to, subject, body }),
  })
  if (!res.ok) throw new Error('Failed to send message')
}

// ── Telegram ──────────────────────────────────────────
export const getTelegramStatus = async (): Promise<{ configured: boolean; connected: boolean }> => {
  const res = await fetch(`${IA_URL}/telegram/status`, { headers: authHeaders() })
  if (!res.ok) return { configured: false, connected: false }
  return res.json()
}

export const telegramAuthStart = async (phone: string): Promise<void> => {
  const res = await fetch(`${IA_URL}/telegram/auth/start`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ phone }),
  })
  if (!res.ok) throw new Error(await res.text())
}

export const telegramAuthVerify = async (code: string, password?: string): Promise<void> => {
  const res = await fetch(`${IA_URL}/telegram/auth/verify`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ code, password: password ?? '' }),
  })
  if (!res.ok) {
    const detail = (await res.json()).detail
    throw new Error(detail)
  }
}

export const telegramSendMessage = async (chat_id: string, text: string): Promise<void> => {
  const res = await fetch(`${IA_URL}/telegram/send`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ chat_id, text }),
  })
  if (!res.ok) throw new Error('Failed to send Telegram message')
}

export const telegramLogout = async (): Promise<void> => {
  await fetch(`${IA_URL}/telegram/auth/logout`, { method: 'POST', headers: authHeaders() })
}
