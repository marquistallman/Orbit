export interface User {
  id: string
  name: string
  email: string
  bio?: string
  avatar?: string
  timezone?: string
  language?: string
}

export interface AuthResponse {
  token: string
  user: User
}

export interface Transaction {
  id: string
  date: string
  category: string
  description: string
  amount: number
  type: 'income' | 'expense'
}

export interface Investment {
  id: string
  name: string
  value: number
  change: number
}

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

export interface AgentTask {
  id: string
  prompt: string
  status: 'pending' | 'running' | 'done' | 'error'
  progress: number
  steps: AgentStep[]
  createdAt: string
}

export interface AgentStep {
  id: string
  label: string
  status: 'done' | 'running' | 'waiting'
}

export interface App {
  id: string
  provider: string
  name: string
  connected: boolean
  lastSync?: string
  tokenStatus?: 'ok' | 'expiring' | 'error'
  dataProcessed?: string
}
