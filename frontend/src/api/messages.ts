const IA_URL = import.meta.env.VITE_IA_URL || 'http://localhost:5000'

export interface Message {
  id: string
  from: string
  email: string
  subject: string
  preview: string
  body: string
  date: string
  source: 'gmail' | 'slack' | string
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

export const sendReply = async (to: string, subject: string, body: string): Promise<void> => {
  const res = await fetch(`${IA_URL}/messages/send`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ to, subject, body }),
  })
  if (!res.ok) throw new Error('Failed to send message')
}
