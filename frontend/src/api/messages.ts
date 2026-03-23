const _IA_URL = import.meta.env.VITE_IA_URL || 'http://localhost:5000'

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

// MOCK data
const MOCK_MESSAGES: Message[] = [
  {
    id: '1', from: 'Carlos Pérez', email: 'carlos@empresa.com',
    subject: 'Q1 project review',
    preview: 'Hi Luis, I need you to review the report before Friday...',
    body: `Hola Luis,\n\nEspero que estés bien. Te escribo porque necesito que revises el informe del primer trimestre antes del viernes a más tardar. Encontré un posible error en la sección de métricas de conversión que podría afectar la presentación con el cliente.\n\nTe adjunto el documento actualizado. Por favor presta especial atención a las páginas 8 y 9.\n\nQuedo pendiente de tu respuesta.\n\nCarlos Pérez\nDirector de Producto`,
    date: 'Hoy, 14:20', source: 'gmail', read: false, urgent: true,
  },
  {
    id: '2', from: 'Ana Martínez', email: 'ana@empresa.com',
    subject: 'Thursday meeting 10am',
    preview: 'Can you confirm attendance for the Thursday meeting?',
    body: `Hola,\n\nQuería confirmar si puedes asistir a la reunión del jueves a las 10am. Será en la sala principal.\n\nSaludos,\nAna`,
    date: 'Hoy, 11:45', source: 'gmail', read: false, urgent: false,
  },
  {
    id: '3', from: 'Equipo Dev', email: 'dev@empresa.com',
    subject: 'Deploy completed ✓',
    preview: 'The production deploy was successful.',
    body: `El deploy a producción fue completado exitosamente a las 09:28.\n\nVersión: v2.4.1\nEntorno: Production\nEstado: OK`,
    date: 'Hoy, 09:30', source: 'slack', read: true, urgent: false,
  },
  {
    id: '4', from: 'Banco XYZ', email: 'notificaciones@banco.com',
    subject: 'Pending payment $340',
    preview: 'Your service bill is due tomorrow...',
    body: `Estimado cliente,\n\nLe recordamos que su factura por $340 vence mañana. Por favor realice el pago a tiempo para evitar recargos.\n\nBanco XYZ`,
    date: 'Ayer', source: 'gmail', read: false, urgent: true,
  },
  {
    id: '5', from: 'GitHub', email: 'noreply@github.com',
    subject: 'PR #42 approved and merged',
    preview: 'Your pull request was approved and merged.',
    body: `Your pull request #42 "Fix: auth token refresh" fue aprobado por 2 reviewers y mergeado en main.\n\nGracias por tu contribución.`,
    date: 'Ayer', source: 'slack', read: true, urgent: false,
  },
  {
    id: '6', from: 'Newsletter AI', email: 'news@aiweekly.com',
    subject: 'AI agent trends this week',
    preview: 'This week: new models, autonomous agents...',
    body: `Esta semana en IA:\n\n• Claude 4 supera benchmarks previos\n• Agentes autónomos en producción\n• Token Vault como estándar de seguridad\n\nLee más en nuestra web.`,
    date: '15 Mar', source: 'gmail', read: true, urgent: false,
  },
]

// GET messages — calls IA-service gmail_read tool
export const getMessages = async (): Promise<Message[]> => {
  // REAL — uncomment when IA-service is running:
  try {
    const res = await fetch(`${_IA_URL}/agent/action`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tool: 'gmail_read', payload: {} }),
    })
    const data = await res.json()
    return data.result?.messages || []
  } catch { return MOCK_MESSAGES }

  
}

// AI summary of a message
export const summarizeMessage = async (_messageId: string, _body: string): Promise<string> => {
  // REAL:
  // const res = await fetch(`${IA_URL}/agent/run`, {
  //   method: 'POST',
  //   headers: { 'Content-Type': 'application/json' },
  //   body: JSON.stringify({ task: `Summarize this email in 2 sentences: ${body}` }),
  // })
  // const data = await res.json()
  // return data.response || ''

  await new Promise(r => setTimeout(r, 800))
  return 'The sender requests an urgent review before Friday. Mentions a possible error in metrics and attaches the updated document.'
}

// AI reply suggestion
export const suggestReply = async (_body: string): Promise<string> => {
  // REAL:
  // const res = await fetch(`${IA_URL}/agent/run`, {
  //   method: 'POST',
  //   headers: { 'Content-Type': 'application/json' },
  //   body: JSON.stringify({ task: `Write a professional reply to this email: ${body}` }),
  // })
  // const data = await res.json()
  // return data.response || ''

  await new Promise(r => setTimeout(r, 1000))
  return 'Hola Carlos,\n\nGracias por avisarme. Revisaré el informe hoy mismo y te daré mi feedback antes del viernes.\n\nSaludos,\nLuis'
}
