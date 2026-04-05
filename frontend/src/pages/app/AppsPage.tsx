import { useEffect, useState } from 'react'
import DashCard from '../../components/ui/DashCard'
import {
  getConnectedApps, getAvailableApps, getActivityLog, getAppsSummary,
  connectApp, disconnectApp, renewToken,
  type App, type ActivityLog, type AppsSummary,
} from '../../api/apps'
import { getTelegramStatus, telegramAuthStart, telegramAuthVerify, telegramLogout } from '../../api/messages'

function Label({ children }: { children: string }) {
  return (
    <div style={{ fontSize: 10, color: '#8C6A3E', textTransform: 'uppercase' as const, letterSpacing: 2, marginBottom: 12 }}>
      {children}
    </div>
  )
}

function StatusBadge({ status }: { status: App['status'] }) {
  const map = {
    connected:    { bg: 'rgba(74,154,89,0.14)',   color: '#4a9a59', label: '● Connected' },
    error:        { bg: 'rgba(154,74,74,0.14)',    color: '#9a4a4a', label: '● Error'     },
    expiring:     { bg: 'rgba(198,161,91,0.12)',   color: '#C6A15B', label: '⚠ Expiring'  },
    disconnected: { bg: 'rgba(140,106,62,0.1)',    color: '#8C6A3E', label: '○ Available' },
  }
  const s = map[status]
  return (
    <div style={{
      fontSize: 9, padding: '2px 8px', borderRadius: 10,
      background: s.bg, color: s.color,
      border: `1px solid ${s.color}55`,
    }}>{s.label}</div>
  )
}

function ActionButton({ status, appId, onAction }: {
  status: App['status']; appId: string; onAction: (id: string, action: string) => void
}) {
  const map = {
    connected:    { label: 'Disconnect', action: 'disconnect', color: '#9a4a4a', border: 'rgba(154,74,74,0.3)'    },
    error:        { label: 'Reconnect',  action: 'connect',    color: '#C6A15B', border: 'rgba(198,161,91,0.35)'  },
    expiring:     { label: 'Renew',      action: 'renew',      color: '#C6A15B', border: 'rgba(198,161,91,0.35)'  },
    disconnected: { label: 'Connect',    action: 'connect',    color: '#C6A15B', border: 'rgba(198,161,91,0.35)'  },
  }
  const b = map[status]
  return (
    <button onClick={() => onAction(appId, b.action)} style={{
      fontSize: 10, padding: '4px 10px', borderRadius: 5, cursor: 'pointer',
      border: `1px solid ${b.border}`, background: 'transparent',
      color: b.color, fontFamily: 'Questrial, sans-serif',
    }}>{b.label}</button>
  )
}

function UsageBar({ value, color }: { value: number; color: string }) {
  return (
    <div style={{ height: 3, background: 'rgba(198,161,91,0.1)', borderRadius: 2, marginTop: 6 }}>
      <div style={{
        width: `${value}%`, height: '100%', borderRadius: 2,
        background: color, transition: 'width 0.8s ease',
      }} />
    </div>
  )
}

const LOG_COLORS = { success: '#4a9a59', error: '#9a4a4a', warning: '#C6A15B', info: '#6a9ab0' }

const TG_APP: App = {
  id: 'telegram',
  name: 'Telegram',
  description: 'Mensajes personales MTProto',
  category: 'messaging',
  status: 'disconnected',
  meta: 'No conectado',
  usage: 0,
  color: '#5b9bd5',
  icon: '✈',
}

export default function AppsPage() {
  const [connected,  setConnected]  = useState<App[]>([])
  const [available,  setAvailable]  = useState<App[]>([])
  const [activity,   setActivity]   = useState<ActivityLog[]>([])
  const [summary,    setSummary]    = useState<AppsSummary | null>(null)
  const [loading,    setLoading]    = useState<string | null>(null)

  // Telegram state
  const [tgConnected, setTgConnected] = useState(false)
  const [tgModal, setTgModal]         = useState(false)
  const [tgStep, setTgStep]           = useState<'phone' | 'code' | '2fa'>('phone')
  const [tgPhone, setTgPhone]         = useState('')
  const [tgCode, setTgCode]           = useState('')
  const [tgPassword, setTgPassword]   = useState('')
  const [tgLoading, setTgLoading]     = useState(false)
  const [tgError, setTgError]         = useState('')

  useEffect(() => {
    getConnectedApps().then(setConnected)
    getAvailableApps().then(setAvailable)
    getActivityLog().then(setActivity)
    getAppsSummary().then(setSummary)
    getTelegramStatus().then(s => setTgConnected(s.connected))
  }, [])

  const tgApp: App = {
    ...TG_APP,
    status: tgConnected ? 'connected' : 'disconnected',
    meta: tgConnected ? 'Sesión MTProto activa' : 'No conectado',
  }

  const handleAction = async (appId: string, action: string) => {
    // Telegram uses IA-service, not Java auth-service
    if (appId === 'telegram') {
      if (action === 'connect') {
        setTgStep('phone')
        setTgError('')
        setTgPhone('')
        setTgCode('')
        setTgPassword('')
        setTgModal(true)
      } else if (action === 'disconnect') {
        setLoading('telegram')
        try {
          await telegramLogout()
          setTgConnected(false)
        } finally {
          setLoading(null)
        }
      }
      return
    }

    setLoading(appId)
    try {
      if (action === 'disconnect') {
        await disconnectApp(appId)
        setConnected(prev => prev.map(a => a.id === appId ? { ...a, status: 'disconnected' } : a))
      } else if (action === 'connect') {
        await connectApp(appId)
        const fromAvailable = available.find(a => a.id === appId)
        if (fromAvailable) {
          setConnected(prev => [...prev, { ...fromAvailable, status: 'connected', meta: 'Just connected', usage: 0 }])
          setAvailable(prev => prev.filter(a => a.id !== appId))
        } else {
          setConnected(prev => prev.map(a => a.id === appId ? { ...a, status: 'connected', meta: 'Reconnected' } : a))
        }
      } else if (action === 'renew') {
        await renewToken(appId)
        setConnected(prev => prev.map(a => a.id === appId ? { ...a, status: 'connected', meta: 'Token renewed' } : a))
      }
    } finally {
      setLoading(null)
    }
  }

  const handleTgSendCode = async () => {
    setTgLoading(true)
    setTgError('')
    try {
      await telegramAuthStart(tgPhone)
      setTgStep('code')
    } catch (e: unknown) {
      setTgError(e instanceof Error ? e.message : 'Error')
    } finally {
      setTgLoading(false)
    }
  }

  const handleTgVerify = async () => {
    setTgLoading(true)
    setTgError('')
    try {
      await telegramAuthVerify(tgCode, tgPassword || undefined)
      setTgConnected(true)
      setTgModal(false)
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Error'
      if (msg === '2FA_REQUIRED') {
        setTgStep('2fa')
      } else {
        setTgError(msg)
      }
    } finally {
      setTgLoading(false)
    }
  }

  // Build display lists: inject telegram
  const connectedDisplay = tgConnected ? [tgApp, ...connected] : connected
  const availableDisplay = tgConnected ? available : [tgApp, ...available]

  const tgSummaryCount = (summary?.connected ?? 0) + (tgConnected ? 1 : 0)

  return (
    <div style={{
      padding: '20px 24px',
      display: 'flex', flexDirection: 'column', gap: 14,
      height: 'calc(100vh - 56px)',
      background: '#1a1a1a',
      overflow: 'auto',
      boxSizing: 'border-box',
    }}>

      {/* Summary metrics */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10, flexShrink: 0 }}>
        {[
          { label: 'Connected', value: tgSummaryCount,             color: '#4a9a59' },
          { label: 'Available', value: summary?.available ?? 0,    color: '#C6A15B' },
          { label: 'Errors',    value: summary?.errors    ?? 0,    color: '#9a4a4a' },
          { label: 'Uptime',    value: `${summary?.uptime ?? 0}%`, color: '#C6A15B' },
        ].map(m => (
          <DashCard key={m.label} style={{ padding: '10px 14px' }} speed={0.00025}>
            <div style={{ fontSize: 9, color: '#8C6A3E', textTransform: 'uppercase' as const, letterSpacing: 1, marginBottom: 4 }}>{m.label}</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: m.color, lineHeight: 1 }}>{m.value}</div>
          </DashCard>
        ))}
      </div>

      {/* Connected apps */}
      <DashCard speed={0.0004} style={{ flexShrink: 0 }}>
        <Label>Connected apps</Label>
        {connectedDisplay.length === 0 ? (
          <div style={{ fontSize: 12, color: '#8C6A3E', textAlign: 'center' as const, padding: '20px 0' }}>
            No apps connected
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12 }}>
            {connectedDisplay.map(app => (
              <div key={app.id} style={{
                background: '#1e1e1e',
                border: '1px solid rgba(198,161,91,0.15)',
                borderRadius: 8, padding: 14,
                display: 'flex', flexDirection: 'column', gap: 10,
                opacity: loading === app.id ? 0.6 : 1,
                transition: 'opacity 0.2s',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{
                    width: 40, height: 40, borderRadius: 10, flexShrink: 0,
                    background: app.color + '22',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 18, color: app.color,
                  }}>{app.icon}</div>
                  <div>
                    <div style={{ fontSize: 13, color: '#EDE6D6', fontWeight: 500 }}>{app.name}</div>
                    <div style={{ fontSize: 10, color: '#8C6A3E' }}>{app.description}</div>
                  </div>
                </div>
                <div style={{ height: 1, background: 'rgba(198,161,91,0.08)' }} />
                <div style={{ fontSize: 10, color: app.status === 'error' ? '#9a4a4a' : app.status === 'expiring' ? '#C6A15B' : '#8C6A3E' }}>
                  {app.meta}
                </div>
                <UsageBar value={app.usage} color={app.color} />
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 }}>
                  <StatusBadge status={app.status} />
                  <ActionButton status={app.status} appId={app.id} onAction={handleAction} />
                </div>
              </div>
            ))}
          </div>
        )}
      </DashCard>

      {/* Available + Activity */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, flex: 1, minHeight: 0 }}>

        {/* Available to connect */}
        <DashCard speed={0.0003} style={{ overflow: 'auto' }}>
          <Label>Available to connect</Label>
          {availableDisplay.map((app, i) => (
            <div key={app.id} style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '10px 0',
              borderBottom: i < availableDisplay.length - 1 ? '1px solid rgba(198,161,91,0.07)' : 'none',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{
                  width: 34, height: 34, borderRadius: 8, flexShrink: 0,
                  background: app.color + '18',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 15, color: app.color,
                }}>{app.icon}</div>
                <div>
                  <div style={{ fontSize: 12, color: '#EDE6D6', fontWeight: 500 }}>{app.name}</div>
                  <div style={{ fontSize: 10, color: '#8C6A3E' }}>{app.description}</div>
                </div>
              </div>
              <ActionButton status="disconnected" appId={app.id} onAction={handleAction} />
            </div>
          ))}
          {availableDisplay.length === 0 && (
            <div style={{ fontSize: 12, color: '#8C6A3E', textAlign: 'center' as const, padding: '20px 0' }}>
              All apps connected
            </div>
          )}
        </DashCard>

        {/* Activity log */}
        <DashCard speed={0.0003} style={{ overflow: 'auto' }}>
          <Label>Recent activity</Label>
          {activity.map((log, i) => (
            <div key={log.id} style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '8px 0',
              borderBottom: i < activity.length - 1 ? '1px solid rgba(198,161,91,0.06)' : 'none',
            }}>
              <div style={{
                width: 6, height: 6, borderRadius: '50%',
                background: LOG_COLORS[log.type], flexShrink: 0,
              }} />
              <div style={{ flex: 1 }}>
                <span style={{ fontSize: 10, color: LOG_COLORS[log.type], marginRight: 5 }}>{log.app}</span>
                <span style={{ fontSize: 11, color: '#EDE6D6' }}>{log.message}</span>
              </div>
              <div style={{ fontSize: 10, color: '#8C6A3E', flexShrink: 0 }}>{log.time}</div>
            </div>
          ))}
        </DashCard>
      </div>

      {/* ── Telegram auth modal ── */}
      {tgModal && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)',
          backdropFilter: 'blur(2px)', zIndex: 60,
          display: 'grid', placeItems: 'center', padding: 18,
        }}>
          <div style={{
            width: 'min(380px, 94vw)', borderRadius: 14,
            border: '1px solid rgba(91,155,213,0.3)',
            background: '#1d1d1d', padding: 24, display: 'grid', gap: 14,
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: '#EDE6D6', fontSize: 15, fontWeight: 600 }}>
                {tgStep === 'phone' ? 'Conectar Telegram' : tgStep === 'code' ? 'Código de verificación' : 'Contraseña 2FA'}
              </span>
              <button onClick={() => { setTgModal(false); setTgStep('phone'); setTgError('') }}
                style={{ background: 'transparent', border: 'none', color: '#8C6A3E', cursor: 'pointer', fontSize: 16 }}>✕</button>
            </div>

            {tgStep === 'phone' && (
              <>
                <p style={{ fontSize: 11, color: '#8C6A3E', margin: 0 }}>
                  Ingresa tu número con código de país (ej: +573001234567)
                </p>
                <input
                  value={tgPhone} onChange={e => setTgPhone(e.target.value)}
                  placeholder="+57 300 123 4567"
                  style={{ background: '#2b2b2b', border: '1px solid rgba(91,155,213,0.25)', borderRadius: 8, padding: '10px 12px', color: '#EDE6D6', fontSize: 13, outline: 'none' }}
                />
              </>
            )}

            {tgStep === 'code' && (
              <>
                <p style={{ fontSize: 11, color: '#8C6A3E', margin: 0 }}>
                  Telegram envió un código a tu app. Ingrésalo aquí.
                </p>
                <input
                  value={tgCode} onChange={e => setTgCode(e.target.value)}
                  placeholder="12345"
                  style={{ background: '#2b2b2b', border: '1px solid rgba(91,155,213,0.25)', borderRadius: 8, padding: '10px 12px', color: '#EDE6D6', fontSize: 13, outline: 'none' }}
                />
              </>
            )}

            {tgStep === '2fa' && (
              <>
                <p style={{ fontSize: 11, color: '#8C6A3E', margin: 0 }}>
                  Tu cuenta tiene verificación en dos pasos. Ingresa tu contraseña de Telegram.
                </p>
                <input
                  type="password" value={tgPassword} onChange={e => setTgPassword(e.target.value)}
                  placeholder="Contraseña 2FA"
                  style={{ background: '#2b2b2b', border: '1px solid rgba(91,155,213,0.25)', borderRadius: 8, padding: '10px 12px', color: '#EDE6D6', fontSize: 13, outline: 'none' }}
                />
              </>
            )}

            {tgError && <p style={{ fontSize: 11, color: '#c47070', margin: 0 }}>⚠ {tgError}</p>}

            <button
              disabled={tgLoading}
              onClick={tgStep === 'phone' ? handleTgSendCode : handleTgVerify}
              style={{
                padding: '10px', borderRadius: 8, border: 'none',
                background: tgLoading ? 'rgba(91,155,213,0.3)' : '#5b9bd5',
                color: '#fff', fontSize: 13, fontWeight: 600, cursor: tgLoading ? 'not-allowed' : 'pointer',
                fontFamily: 'inherit',
              }}
            >
              {tgLoading ? 'Procesando...' : tgStep === 'phone' ? 'Enviar código' : 'Verificar'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
