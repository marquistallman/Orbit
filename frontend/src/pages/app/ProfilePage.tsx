import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'
import DashCard from '../../components/ui/DashCard'
import SubtleBorderAnimation from '../../components/orbit/SubtleBorderAnimation'

const MOCK_STATS = {
  tasks: 247, apps: 4, success: 100,
  lastSession: 'Today, 14:30', activeDays: 14, agentExecuted: 38,
}

function Avatar({ name }: { name: string }) {
  const initials = name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
  return (
    <div style={{
      width: 70, height: 70, borderRadius: '50%',
      border: '2px solid rgba(198,161,91,0.5)',
      background: '#1B1B1B',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: 22, fontWeight: 600, color: '#C6A15B',
      flexShrink: 0,
      fontFamily: 'Questrial, sans-serif',
    }}>
      {initials}
    </div>
  )
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center',
      padding: '12px 0',
      borderBottom: '1px solid rgba(198,161,91,0.07)',
    }}>
      <span style={{ flex: 1, fontSize: 12, color: '#8C6A3E' }}>{label}</span>
      <span style={{ fontSize: 12, color: '#EDE6D6' }}>{value}</span>
    </div>
  )
}

function Input({
  label, value, onChange, type = 'text', span = false, textarea = false
}: {
  label: string; value: string; onChange: (v: string) => void
  type?: string; span?: boolean; textarea?: boolean
}) {
  const base: React.CSSProperties = {
    width: '100%', background: '#1B1B1B',
    border: '1px solid rgba(198,161,91,0.25)',
    borderRadius: 7, padding: '10px 14px',
    fontSize: 12, color: '#EDE6D6',
    fontFamily: 'Questrial, sans-serif',
    outline: 'none', resize: 'none' as const,
    boxSizing: 'border-box' as const,
  }
  return (
    <div style={{ gridColumn: span ? '1 / -1' : 'auto', display: 'flex', flexDirection: 'column', gap: 5 }}>
      <label style={{ fontSize: 10, color: '#8C6A3E', letterSpacing: 1 }}>{label}</label>
      {textarea
        ? <textarea value={value} onChange={e => onChange(e.target.value)} rows={3} style={base} />
        : <input type={type} value={value} onChange={e => onChange(e.target.value)} style={base} />
      }
    </div>
  )
}

export default function ProfilePage() {
  const navigate  = useNavigate()
  const { user }  = useAuthStore()
  const [form, setForm] = useState({
    firstName:   user?.username?.split(' ')[0] || 'Nicolas',
    lastName:    user?.username?.split(' ')[1] || 'Luis',
    email:       user?.email || 'luis@gmail.com',
    description: 'Frontend developer passionate about futuristic interfaces and autonomous agents.',
    timezone:    'UTC-5 (Bogotá)',
    language:    'English',
    password:    '',
    newPassword: '',
  })

  const set = (k: keyof typeof form) => (v: string) => setForm(f => ({ ...f, [k]: v }))

  const fullName    = `${form.firstName} ${form.lastName}`.trim()
  const memberSince = 'March 2026'

  const handleSave = () => {
      // TODO: connect to auth-service PUT /api/auth/profile
      navigate('/app/profile')
  }

  // ── View mode ──────────────────────────────────────────────
  return (
    <div style={{
      padding: '20px 24px', background: '#1a1a1a',
      height: 'calc(100vh - 56px)', overflowY: 'auto',
      display: 'flex', flexDirection: 'column', gap: 14,
    }}>
      {/* Profile header */}
      <DashCard speed={0.0004} style={{ padding: '18px 22px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
          <Avatar name={fullName} />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 20, fontWeight: 600, color: '#EDE6D6', marginBottom: 3 }}>{fullName}</div>
            <div style={{ fontSize: 12, color: '#C6A15B', marginBottom: 6 }}>{form.email}</div>
            <div style={{ fontSize: 12, color: '#8C6A3E', marginBottom: 6 }}>{form.description}</div>
            <div style={{ fontSize: 10, color: '#8C6A3E' }}>
              <span style={{ color: '#C6A15B', marginRight: 4 }}>—</span>
              Member since {memberSince}
            </div>
          </div>
          <button onClick={() => navigate('/app/profile/edit')} style={{
            background: 'none', border: '1px solid rgba(198,161,91,0.35)',
            borderRadius: 6, color: '#C6A15B', cursor: 'pointer',
            fontFamily: 'Questrial, sans-serif', fontSize: 12, padding: '8px 18px',
            flexShrink: 0,
          }}>Edit profile</button>
          <div style={{
            width: 70, height: 70, borderRadius: '50%',
            border: '1px solid rgba(198,161,91,0.08)',
            flexShrink: 0,
          }} />
        </div>
      </DashCard>

      {/* Account info + Activity */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>

        {/* Account Information */}
        <DashCard speed={0.0003} style={{ padding: '16px 20px' }}>
          <div style={{ fontSize: 10, color: '#C6A15B', textTransform: 'uppercase' as const, letterSpacing: 2, marginBottom: 4 }}>
            Account Information
          </div>
          <Field label="Full Name" value={fullName} />
          <Field label="Email"     value={form.email} />
          <Field label="Timezone"  value={form.timezone} />
          <Field label="Language"  value={form.language} />
          <Field label="Plan"      value="Operator Pro" />
        </DashCard>

        {/* Operator Activity */}
        <DashCard speed={0.0003} style={{ padding: '16px 20px' }}>
          <div style={{ fontSize: 10, color: '#C6A15B', textTransform: 'uppercase' as const, letterSpacing: 2, marginBottom: 12 }}>
            Operator Activity
          </div>

          {/* Stats row */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8, marginBottom: 16 }}>
            {[
              { value: MOCK_STATS.tasks,   label: 'Tasks'   },
              { value: MOCK_STATS.apps,    label: 'Apps'    },
              { value: `${MOCK_STATS.success}%`, label: 'Success' },
            ].map(s => (
              <div key={s.label} style={{
                border: '1px solid rgba(198,161,91,0.2)',
                borderRadius: 7, padding: '10px 8px', textAlign: 'center' as const,
              }}>
                <div style={{ fontSize: 22, fontWeight: 700, color: '#C6A15B', lineHeight: 1 }}>{s.value}</div>
                <div style={{ fontSize: 9, color: '#8C6A3E', textTransform: 'uppercase' as const, letterSpacing: 1, marginTop: 4 }}>{s.label}</div>
              </div>
            ))}
          </div>

          <div style={{ borderTop: '1px solid rgba(198,161,91,0.08)', paddingTop: 12 }}>
            <Field label="Last session"    value={MOCK_STATS.lastSession} />
            <Field label="Active days"     value={`${MOCK_STATS.activeDays} days`} />
            <Field label="Agent executed"  value={`${MOCK_STATS.agentExecuted} times`} />
          </div>
        </DashCard>
      </div>

      {/* Danger zone */}
      <div style={{
        border: '1px solid rgba(154,74,74,0.4)',
        borderRadius: 8, padding: '16px 20px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div>
          <div style={{ fontSize: 11, color: '#9a4a4a', marginBottom: 4, textTransform: 'uppercase' as const, letterSpacing: 1 }}>
            Danger zone
          </div>
          <div style={{ fontSize: 12, color: '#8C6A3E' }}>
            Delete account and all associated data permanently
          </div>
        </div>
        <button style={{
          background: 'none', border: '1px solid rgba(154,74,74,0.5)',
          borderRadius: 6, color: '#9a4a4a', cursor: 'pointer',
          fontFamily: 'Questrial, sans-serif', fontSize: 12, padding: '8px 18px',
          flexShrink: 0,
        }}>Delete account</button>
      </div>
    </div>
  )
}
