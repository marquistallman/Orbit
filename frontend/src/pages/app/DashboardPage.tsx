import { useEffect, useRef, useState } from 'react'
import DashCard from '../../components/ui/DashCard'
import OrbitalNucleus from '../../components/orbit/OrbitalNucleus'
import { getConnectedApps, App } from '../../api/apps'
import { getMessages, formatEmailDate, getTelegramStatus, type Message } from '../../api/messages'

const IA_URL = import.meta.env.VITE_IA_URL || 'http://localhost:12002'

interface AgentTask {
  task: string
  status: 'running' | 'completed' | 'error'
  created_at?: string | null
}

const STATUS_MAP: Record<string, { label: string; bg: string; color: string }> = {
  completed: { label: 'Done',   bg: 'rgba(74,154,89,0.14)',   color: '#4a9a59' },
  running:   { label: 'Active', bg: 'rgba(106,180,200,0.14)', color: '#6ab4c8' },
  error:     { label: 'Error',  bg: 'rgba(154,74,74,0.14)',   color: '#9a4a4a' },
  default:   { label: 'Wait',   bg: 'rgba(198,161,91,0.12)',  color: '#C6A15B' },
}

const APP_STATUS_DOT: Record<string, string> = {
  connected:    '#4a9a59',
  error:        '#9a4a4a',
  expiring:     '#C6A15B',
  disconnected: '#555',
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

function PulseDot() {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    let f = 0, t = 0
    const run = () => {
      t += 0.04
      const s = 1 + Math.sin(t) * 0.4
      const o = 0.65 + Math.sin(t) * 0.35
      if (ref.current) {
        ref.current.style.transform = `scale(${s})`
        ref.current.style.opacity = String(o)
      }
      f = requestAnimationFrame(run)
    }
    run()
    return () => cancelAnimationFrame(f)
  }, [])
  return (
    <div style={{ position: 'relative', width: 10, height: 10, flexShrink: 0 }}>
      <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: 'rgba(198,161,91,0.2)' }} />
      <div ref={ref} style={{ position: 'absolute', inset: 1, borderRadius: '50%', background: '#C6A15B', transformOrigin: 'center' }} />
    </div>
  )
}

function Label({ children }: { children: string }) {
  return (
    <div style={{ fontSize: 10, color: '#8C6A3E', textTransform: 'uppercase' as const, letterSpacing: 2, marginBottom: 10 }}>
      {children}
    </div>
  )
}

export default function DashboardPage() {
  const [connectedApps, setConnectedApps] = useState<App[]>([])
  const [tasks, setTasks] = useState<AgentTask[]>([])
  const [messages, setMessages] = useState<Message[]>([])
  const [summary, setSummary] = useState('')
  const [summaryLoading, setSummaryLoading] = useState(false)

  useEffect(() => {
    getConnectedApps().then(apps => {
      getTelegramStatus().then(s => {
        if (s.connected) {
          setConnectedApps([{
            id: 'telegram', name: 'Telegram', description: 'Mensajes personales MTProto',
            category: 'messaging', status: 'connected', meta: 'Sesión MTProto activa',
            usage: 0, color: '#5b9bd5', icon: '✈',
          }, ...apps])
        } else {
          setConnectedApps(apps)
        }
      }).catch(() => setConnectedApps(apps))
    }).catch(() => {})

    fetch(`${IA_URL}/agent/history`, { headers: authHeaders() })
      .then(r => r.ok ? r.json() : { tasks: [] })
      .then(data => setTasks((data.tasks ?? []).slice(0, 5)))
      .catch(() => {})

    getMessages().then(setMessages).catch(() => {})
  }, [])

  const handleGenerateSummary = async () => {
    setSummaryLoading(true)
    try {
      const appNames = connectedApps.map(a => a.name).join(', ') || 'none'
      const urgentEmails = messages.filter(m => m.urgent)
      const emailLines = messages.slice(0, 10).map(m =>
        `- [${formatEmailDate(m.date)}] ${m.urgent ? '⚠ ' : ''}${m.from}: "${m.subject}" — ${m.preview.slice(0, 80)}`
      ).join('\n')

      const task = [
        'Generate a concise, specific daily summary for an AI assistant dashboard. DO NOT use generic phrases like "review your inbox" or repeat counts. Focus on what actually matters based on the data below.',
        '',
        `Connected tools: ${appNames}`,
        `Tasks completed today: ${tasks.filter(t => t.status === 'completed').length}`,
        `Urgent emails: ${urgentEmails.length}`,
        '',
        `Recent emails (up to 10):`,
        emailLines || '(none)',
        '',
        'Instructions: mention specific senders, subjects, and action items you detect (e.g. meetings, deadlines, requests). Keep it under 4 sentences. No bullet lists.',
      ].join('\n')

      const res = await fetch(`${IA_URL}/agent/run`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ task }),
      })
      if (!res.ok) throw new Error('Failed')
      const data = await res.json()
      setSummary(data.response ?? data.result ?? '')
    } catch {
      setSummary('Could not generate summary. Please try again.')
    } finally {
      setSummaryLoading(false)
    }
  }

  const orbitalApps = connectedApps.map(a => ({ name: a.name, color: a.color }))

  return (
    <div style={{
      padding: '20px 24px',
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gridTemplateRows: '1fr auto',
      gap: 16,
      height: 'calc(100vh - 56px)',
      background: '#1a1a1a',
      overflow: 'auto',
    }}>

      {/* ── LEFT: Nucleus + Metrics ── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, minHeight: 0 }}>

        <DashCard style={{ padding: 16, flex: 1, minHeight: 0 }} speed={0.0004}>
          <Label>Orbital nucleus</Label>
          <div style={{ display: 'flex', gap: 12, height: 'calc(100% - 28px)' }}>
            <div style={{ flex: 1, minWidth: 0, minHeight: 0 }}>
              <OrbitalNucleus apps={orbitalApps} />
            </div>
            <div style={{ width: 160, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{
                background: '#1B1B1B',
                border: '1px solid rgba(198,161,91,0.22)',
                borderRadius: 7,
                padding: '10px 14px',
              }}>
                <div style={{ fontSize: 10, color: '#8C6A3E', textTransform: 'uppercase' as const, letterSpacing: 1.5, marginBottom: 8 }}>State</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <PulseDot />
                  <span style={{ fontSize: 13, color: '#C6A15B' }}>Active - waiting</span>
                </div>
              </div>
              <div style={{
                background: '#1B1B1B',
                border: '1px solid rgba(198,161,91,0.22)',
                borderRadius: 7,
                padding: '8px 12px',
              }}>
                <div style={{ fontSize: 10, color: '#8C6A3E', textTransform: 'uppercase' as const, letterSpacing: 1.5, marginBottom: 8 }}>Apps</div>
                {connectedApps.length === 0 ? (
                  <div style={{ fontSize: 11, color: '#555' }}>No apps connected</div>
                ) : connectedApps.map(app => (
                  <div key={app.id} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                    <div style={{ width: 7, height: 7, borderRadius: '50%', background: app.color, flexShrink: 0 }} />
                    <span style={{ fontSize: 13, color: '#EDE6D6' }}>{app.name}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </DashCard>

        {/* Daily Metrics */}
        <div style={{ flexShrink: 0 }}>
          <Label>Daily metrics</Label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10 }}>
            {[
              { label: 'Tasks',   value: tasks.length },
              { label: 'Emails',  value: messages.length },
              { label: 'Apps',    value: connectedApps.length },
              { label: 'Errors',  value: connectedApps.filter(a => a.status === 'error').length },
            ].map(m => (
              <DashCard key={m.label} style={{ padding: '18px 8px', textAlign: 'center' as const }} speed={0.00025}>
                <div style={{ fontSize: 30, fontWeight: 700, color: '#C6A15B', lineHeight: 1 }}>{m.value}</div>
                <div style={{ fontSize: 10, color: '#8C6A3E', textTransform: 'uppercase' as const, letterSpacing: 1.5, marginTop: 8 }}>{m.label}</div>
              </DashCard>
            ))}
          </div>
        </div>
      </div>

      {/* ── RIGHT: Summary + Tasks + Apps ── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, minHeight: 0, overflow: 'auto' }}>

        {/* Smart Summary */}
        <DashCard speed={0.0005} style={{ flexShrink: 0 }}>
          <Label>Smart summary of the day</Label>
          {!summary && !summaryLoading && (
            <div style={{ textAlign: 'center', padding: '18px 0' }}>
              <button
                onClick={handleGenerateSummary}
                style={{
                  background: 'rgba(198,161,91,0.12)',
                  border: '1px solid rgba(198,161,91,0.35)',
                  borderRadius: 8,
                  color: '#C6A15B',
                  fontSize: 13,
                  padding: '9px 22px',
                  cursor: 'pointer',
                  letterSpacing: 0.5,
                }}
              >
                Generate daily summary
              </button>
              <p style={{ fontSize: 11, color: '#555', marginTop: 8 }}>Uses AI to summarize your day</p>
            </div>
          )}
          {summaryLoading && (
            <div style={{ textAlign: 'center', padding: '18px 0', fontSize: 13, color: '#8C6A3E' }}>
              Generating summary…
            </div>
          )}
          {summary && !summaryLoading && (
            <>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <div style={{
                  display: 'inline-block',
                  fontSize: 10, color: '#4a9a59',
                  background: 'rgba(74,154,89,0.12)',
                  border: '1px solid rgba(74,154,89,0.22)',
                  borderRadius: 10,
                  padding: '3px 9px',
                }}>AI generated</div>
                <button
                  onClick={handleGenerateSummary}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#8C6A3E',
                    fontSize: 11,
                    cursor: 'pointer',
                    padding: '2px 6px',
                  }}
                >
                  Regenerate
                </button>
              </div>
              <p style={{ fontSize: 14, color: '#EDE6D6', lineHeight: 1.85, opacity: 0.9, whiteSpace: 'pre-wrap' }}>
                {summary}
              </p>
            </>
          )}
        </DashCard>

        {/* Recent Tasks + Apps State */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, flexShrink: 0 }}>
          <DashCard speed={0.0004}>
            <Label>Recent Tasks</Label>
            {tasks.length === 0 ? (
              <div style={{ fontSize: 11, color: '#555', padding: '8px 0' }}>No tasks yet</div>
            ) : tasks.map((t, i) => {
              const s = STATUS_MAP[t.status] ?? STATUS_MAP.default
              const label = t.task.length > 48 ? t.task.slice(0, 45) + '…' : t.task
              return (
                <div key={i} style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '8px 0',
                  borderBottom: i < tasks.length - 1 ? '1px solid rgba(198,161,91,0.06)' : 'none',
                }}>
                  <div style={{ width: 5, height: 5, borderRadius: '50%', background: s.color, flexShrink: 0 }} />
                  <span style={{ flex: 1, fontSize: 11, color: '#EDE6D6' }}>{label}</span>
                  <span style={{
                    fontSize: 9, padding: '2px 6px', borderRadius: 10, flexShrink: 0,
                    background: s.bg,
                    color: s.color,
                    border: `1px solid ${s.color}40`,
                  }}>{s.label}</span>
                </div>
              )
            })}
          </DashCard>

          <DashCard speed={0.0004}>
            <Label>Apps State</Label>
            {connectedApps.length === 0 ? (
              <div style={{ fontSize: 11, color: '#555', padding: '8px 0' }}>No apps connected</div>
            ) : connectedApps.map(app => (
              <div key={app.id} style={{
                background: '#1B1B1B',
                border: '1px solid rgba(198,161,91,0.1)',
                borderRadius: 6,
                padding: '8px 11px',
                marginBottom: 8,
                display: 'flex', alignItems: 'center', gap: 8,
              }}>
                <div style={{ width: 7, height: 7, borderRadius: '50%', background: APP_STATUS_DOT[app.status] ?? '#555', flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 11, color: '#EDE6D6', fontWeight: 500 }}>{app.name}</div>
                  <div style={{ fontSize: 9, color: '#8C6A3E', marginTop: 1 }}>{app.meta}</div>
                </div>
                <span style={{ fontSize: 9, color: APP_STATUS_DOT[app.status] ?? '#555', flexShrink: 0 }}>{app.status}</span>
              </div>
            ))}
          </DashCard>
        </div>
      </div>
    </div>
  )
}
