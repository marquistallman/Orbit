import { useEffect, useRef, useState } from 'react'
import DashCard from '../../components/ui/DashCard'
import OrbitalNucleus from '../../components/orbit/OrbitalNucleus'

const APPS = [
  { name: 'Gmail',    color: '#C6A15B' },
  { name: 'Calendar', color: '#6ab4c8' },
  { name: 'Finance',  color: '#8C6A3E' },
]

const TASKS = [
  { label: 'Summarize pending emails', status: 'Done',   color: '#4a9a59' },
  { label: 'Review weekly calendar',   status: 'Active', color: '#6ab4c8' },
  { label: 'Check payment status',     status: 'Wait',   color: '#C6A15B' },
  { label: 'Book team meeting',        status: 'Done',   color: '#4a9a59' },
  { label: 'Analyze monthly expenses', status: 'Active', color: '#6ab4c8' },
]

const APP_STATES = [
  { name: 'Gmail',           meta: '342 emails processed today', dot: '#4a9a59', label: 'sync ✓', labelColor: '#4a9a59' },
  { name: 'Google Calendar', meta: '8 events this week',         dot: '#4a9a59', label: 'sync ✓', labelColor: '#4a9a59' },
  { name: 'Finance',         meta: 'Token expires in 2h',        dot: '#C6A15B', label: 'renew',  labelColor: '#C6A15B' },
  { name: 'Slack',           meta: 'Authentication error',       dot: '#9a4a4a', label: 'error',  labelColor: '#9a4a4a' },
]

const BADGE: Record<string, { bg: string; color: string }> = {
  Done:   { bg: 'rgba(74,154,89,0.14)',   color: '#4a9a59' },
  Active: { bg: 'rgba(106,180,200,0.14)', color: '#6ab4c8' },
  Wait:   { bg: 'rgba(198,161,91,0.12)',  color: '#C6A15B' },
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
  const [metrics] = useState({ tasks: 0, emails: 0, events: 0, bookings: 0 })

  return (
    <div style={{
      padding: '20px 24px',
      display: 'grid',
      // Left col: nucleus + metrics stacked | Right col: summary top, tasks+apps bottom
      gridTemplateColumns: '1fr 1fr',
      gridTemplateRows: '1fr auto',
      gap: 16,
      height: 'calc(100vh - 56px)',
      background: '#1a1a1a',
      overflow: 'hidden',
    }}>

      {/* ── LEFT: Nucleus + Metrics stacked, metrics at bottom ── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, minHeight: 0 }}>

        {/* Orbital Nucleus — flex: 1 so it fills available space */}
        <DashCard style={{ padding: 16, flex: 1, minHeight: 0 }} speed={0.0004}>
          <Label>Orbital nucleus</Label>
          <div style={{ display: 'flex', gap: 12, height: 'calc(100% - 28px)' }}>

            {/* Canvas */}
            <div style={{ flex: 1, minWidth: 0, minHeight: 0 }}>
              <OrbitalNucleus />
            </div>

            {/* State + Apps panels */}
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
                {APPS.map(app => (
                  <div key={app.name} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                    <div style={{ width: 7, height: 7, borderRadius: '50%', background: app.color, flexShrink: 0 }} />
                    <span style={{ fontSize: 13, color: '#EDE6D6' }}>{app.name}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </DashCard>

        {/* Daily Metrics — pinned to bottom, fixed height */}
        <div style={{ flexShrink: 0 }}>
          <Label>Daily metrics</Label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10 }}>
            {[
              { label: 'Tasks',    value: metrics.tasks    },
              { label: 'Emails',   value: metrics.emails   },
              { label: 'Events',   value: metrics.events   },
              { label: 'Bookings', value: metrics.bookings },
            ].map(m => (
              <DashCard key={m.label} style={{ padding: '18px 8px', textAlign: 'center' as const }} speed={0.00025}>
                <div style={{ fontSize: 30, fontWeight: 700, color: '#C6A15B', lineHeight: 1 }}>{m.value}</div>
                <div style={{ fontSize: 10, color: '#8C6A3E', textTransform: 'uppercase' as const, letterSpacing: 1.5, marginTop: 8 }}>{m.label}</div>
              </DashCard>
            ))}
          </div>
        </div>
      </div>

      {/* ── RIGHT: Summary top + Tasks/Apps bottom ── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, minHeight: 0 }}>

        {/* Smart Summary */}
        <DashCard speed={0.0005} style={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
          <Label>Smart summary of the day</Label>
          <div style={{
            display: 'inline-block',
            fontSize: 10, color: '#4a9a59',
            background: 'rgba(74,154,89,0.12)',
            border: '1px solid rgba(74,154,89,0.22)',
            borderRadius: 10,
            padding: '3px 9px',
            marginBottom: 12,
          }}>
            Generated 8 minutes ago
          </div>
          <p style={{ fontSize: 15.5, color: '#EDE6D6', lineHeight: 1.85, opacity: 0.9 }}>
            You have <span style={{ color: '#C6A15B' }}>3 meetings</span> scheduled today, the next one at{' '}
            <span style={{ color: '#C6A15B' }}>3:00 PM</span> with the product team. There are{' '}
            <span style={{ color: '#C6A15B' }}>7 unread emails</span>, 2 of which were marked as urgent by the agent.{' '}
            A <span style={{ color: '#C6A15B' }}>$340 payment</span> is due tomorrow — it's recommended to schedule it now.{' '}
            The agent detected a <span style={{ color: '#C6A15B' }}>scheduling conflict</span> on Thursday that requires your attention.
          </p>
        </DashCard>

        {/* Recent Tasks + Apps State */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, flexShrink: 0, height: 360 }}>
          <DashCard speed={0.0004}>
            <Label>Recent Tasks</Label>
            {TASKS.map((t, i) => (
              <div key={t.label} style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '8px 0',
                borderBottom: i < TASKS.length - 1 ? '1px solid rgba(198,161,91,0.06)' : 'none',
              }}>
                <div style={{ width: 5, height: 5, borderRadius: '50%', background: t.color, flexShrink: 0 }} />
                <span style={{ flex: 1, fontSize: 11, color: '#EDE6D6' }}>{t.label}</span>
                <span style={{
                  fontSize: 9, padding: '2px 6px', borderRadius: 10, flexShrink: 0,
                  background: BADGE[t.status]?.bg,
                  color: BADGE[t.status]?.color,
                  border: `1px solid ${BADGE[t.status]?.color}40`,
                }}>{t.status}</span>
              </div>
            ))}
          </DashCard>

          <DashCard speed={0.0004}>
            <Label>Apps State</Label>
            {APP_STATES.map(app => (
              <div key={app.name} style={{
                background: '#1B1B1B',
                border: '1px solid rgba(198,161,91,0.1)',
                borderRadius: 6,
                padding: '8px 11px',
                marginBottom: 8,
                display: 'flex', alignItems: 'center', gap: 8,
              }}>
                <div style={{ width: 7, height: 7, borderRadius: '50%', background: app.dot, flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 11, color: '#EDE6D6', fontWeight: 500 }}>{app.name}</div>
                  <div style={{ fontSize: 9, color: '#8C6A3E', marginTop: 1 }}>{app.meta}</div>
                </div>
                <span style={{ fontSize: 9, color: app.labelColor, flexShrink: 0 }}>{app.label}</span>
              </div>
            ))}
          </DashCard>
        </div>
      </div>
    </div>
  )
}
