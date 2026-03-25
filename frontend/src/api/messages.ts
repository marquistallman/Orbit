const _IA_URL = import.meta.env.VITE_IA_URL || 'http://localhost:5000'
const _GMAIL_URL = import.meta.env.VITE_GMAIL_URL || 'http://localhost:8082'

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
  actions?: ('accept' | 'reject')[]
}

const authHeaders = (): Record<string, string> => {
  const token = localStorage.getItem('token')
  return token ? { Authorization: `Bearer ${token}` } : {}
}

// Helper to map Gmail Service response to Message interface
const mapGmailToMessage = (e: any): Message => ({
  id: e.id || e.gmail_id,
  from: e.sender ? e.sender.split('<')[0].trim() : 'Unknown',
  email: e.sender && e.sender.includes('<') ? e.sender.match(/<(.+)>/)?.[1] || '' : e.sender,
  subject: e.subject || '(No Subject)',
  preview: e.snippet || '',
  body: e.body_html || e.snippet || '',
  date: e.received_at ? new Date(e.received_at).toLocaleDateString() : 'Unknown',
  source: 'gmail',
  read: true,
  urgent: false,
  actions: (e.subject || '').toLowerCase().includes('meeting') ? ['accept', 'reject'] : undefined
})

// GET messages — robust flow: IA -> Gmail -> Mock
export const getMessages = async (): Promise<Message[]> => {
  const userId = localStorage.getItem('userId')

  // 1. Try IA Service (Agent)
  try {
    const res = await fetch(`${_IA_URL}/agent/action`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        ...authHeaders()
      },
      body: JSON.stringify({ tool: 'gmail_read', payload: { userId } }),
    })
    
    const data = await res.json()
    if (!res.ok) {
      console.warn('IA Service tool failed, falling back to Gmail Service...', data.detail || data.error);
      throw new Error(data.detail || data.error || 'IA Service error');
    }
    
    // El agente puede devolver el resultado directamente como array o bajo una propiedad messages
    const messages = Array.isArray(data.result) ? data.result : (data.result?.messages || [])
    // Si el IA Service devuelve éxito pero 0 mensajes, forzamos el fallback para permitir la sincronización
    if (messages.length === 0) {
      console.log('IA Service returned 0 messages. Triggering fallback...');
      throw new Error('No messages found');
    }

    return messages.map(mapGmailToMessage)
  } catch (err) {
    // 2. Fallback to Gmail Service
    try {
      const token = localStorage.getItem('token')
      const userId = localStorage.getItem('userId')
      const res = await fetch(`${_GMAIL_URL}/emails?userId=${userId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (!res.ok) throw new Error('Gmail Service unavailable')
      let emails = await res.json()

      // 2.1. Auto-sync: Si no hay correos (primera vez), forzamos sincronización
      if (!emails || emails.length === 0) {
        console.log('Bandeja vacía. Sincronizando con Gmail...')
        try {
          await fetch(`${_GMAIL_URL}/emails/sync?userId=${userId}`, { headers: { 'Authorization': `Bearer ${token}` } })
          // Reintentamos leer después del sync
          const retry = await fetch(`${_GMAIL_URL}/emails?userId=${userId}`, { headers: { 'Authorization': `Bearer ${token}` } })
          if (retry.ok) emails = await retry.json()
        } catch (syncErr) { console.warn('Auto-sync failed:', syncErr) }
      }

      return (emails || []).map(mapGmailToMessage)
    } catch (finalError) {
      console.error('Failed to fetch messages from both IA and Gmail services:', finalError)
      throw finalError
    }
  }
}

// AI summary of a message
export const summarizeMessage = async (messageId: string, body: string): Promise<string> => {
  const res = await fetch(`${_IA_URL}/agent/run`, {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      ...authHeaders()
    },
    body: JSON.stringify({ task: `Summarize this email in 2 sentences: ${body}` }),
  })
  if (!res.ok) throw new Error('Error al generar resumen con IA')
  const data = await res.json()
  return data.response || 'No se pudo generar el resumen.'
}

// AI reply suggestion
export const suggestReply = async (body: string): Promise<string> => {
  const res = await fetch(`${_IA_URL}/agent/run`, {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      ...authHeaders()
    },
    body: JSON.stringify({ task: `Write a professional reply to this email: ${body}` }),
  })
  if (!res.ok) throw new Error('Error al generar sugerencia con IA')
  const data = await res.json()
  return data.response || 'No se pudo generar la sugerencia.'
}
