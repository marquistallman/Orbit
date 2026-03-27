const BASE_URL = 'http://localhost:8080'

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

const MOCK_CONNECTED: App[] = [
  { id: 'gmail',    name: 'Gmail',           description: 'Email & inbox',       category: 'productivity', status: 'connected', meta: '342 emails processed today', usage: 72, color: '#c47070', icon: '✉' },
  { id: 'gcal',     name: 'Google Calendar', description: 'Events & scheduling', category: 'productivity', status: 'connected', meta: '8 events this week',         usage: 45, color: '#6a9ab0', icon: '◷' },
  { id: 'finance',  name: 'Finance',         description: 'Banking & expenses',  category: 'finance',      status: 'expiring',  meta: 'Token expires in 2h',        usage: 88, color: '#C6A15B', icon: '$' },
  { id: 'slack',    name: 'Slack',           description: 'Team messaging',      category: 'communication',status: 'error',     meta: 'Authentication error',       usage: 0,  color: '#9a4a4a', icon: '#' },
]

const MOCK_AVAILABLE: App[] = [
  { id: 'gdrive', name: 'Google Drive', description: 'Files & documents', category: 'productivity', status: 'disconnected', meta: '', usage: 0, color: '#4a9a59', icon: '▶' },
  { id: 'notion', name: 'Notion',       description: 'Notes & wikis',     category: 'productivity', status: 'disconnected', meta: '', usage: 0, color: '#6a9ab0', icon: '☁' },
]

const MOCK_ACTIVITY: ActivityLog[] = [
  { id: '1', app: 'Gmail',    message: '12 new emails processed',   time: '14:32', type: 'success' },
  { id: '2', app: 'Calendar', message: 'Meeting reminder sent',     time: '13:15', type: 'info'    },
  { id: '3', app: 'Slack',    message: 'Authentication failed',     time: '12:48', type: 'error'   },
  { id: '4', app: 'Finance',  message: 'Token renewal needed',      time: '11:20', type: 'warning' },
  { id: '5', app: 'Gmail',    message: 'Daily summary generated',   time: '09:00', type: 'success' },
]

export const getConnectedApps  = async (): Promise<App[]>          => { await new Promise(r => setTimeout(r, 300)); return MOCK_CONNECTED }
export const getAvailableApps  = async (): Promise<App[]>          => { await new Promise(r => setTimeout(r, 300)); return MOCK_AVAILABLE }
export const getActivityLog    = async (): Promise<ActivityLog[]>  => { await new Promise(r => setTimeout(r, 300)); return MOCK_ACTIVITY }
export const getAppsSummary    = async (): Promise<AppsSummary>    => { await new Promise(r => setTimeout(r, 300)); return { connected: 4, available: 2, errors: 1, uptime: 98 } }

export const connectApp    = async (appId: string): Promise<void> => { await new Promise(r => setTimeout(r, 500)); console.log('connect', appId) }
export const disconnectApp = async (appId: string): Promise<void> => { await new Promise(r => setTimeout(r, 500)); console.log('disconnect', appId) }
export const renewToken    = async (appId: string): Promise<void> => { await new Promise(r => setTimeout(r, 500)); console.log('renew', appId) }
