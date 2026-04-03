import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'
import DashCard from '../../components/ui/DashCard'

function Avatar({ name }: { name: string }) {
  const initials = name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
  return (
    <div style={{
      width: 70, height: 70, borderRadius: '50%',
      border: '2px solid rgba(198,161,91,0.5)',
      background: '#1B1B1B',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: 22, fontWeight: 600, color: '#C6A15B', flexShrink: 0,
    }}>
      {initials}
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

export default function EditProfilePage() {
  const navigate = useNavigate()
  const { user } = useAuthStore()

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
  const fullName = `${form.firstName} ${form.lastName}`.trim()

  const handleSave = () => {
    // TODO: connect to auth-service PUT /api/auth/profile
    navigate('/app/profile')
  }

  return (
    <div style={{
      padding: '20px 24px', background: '#1a1a1a',
      height: 'calc(100vh - 56px)', overflowY: 'auto',
    }}>
      {/* Header */}
      <DashCard speed={0.0004} style={{ marginBottom: 14, padding: '18px 22px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
          <Avatar name={fullName} />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 20, fontWeight: 600, color: '#EDE6D6', marginBottom: 4 }}>
              Edit Profile
            </div>
            <div style={{ fontSize: 12, color: '#8C6A3E' }}>
              Update your personal information. The changes will be reflected across the entire platform.
            </div>
          </div>
          <div style={{ width: 70, height: 70, borderRadius: '50%', border: '1px solid rgba(198,161,91,0.1)', flexShrink: 0 }} />
        </div>
      </DashCard>

      {/* Personal info */}
      <DashCard speed={0.0003} style={{ marginBottom: 14, padding: '18px 22px' }}>
        <div style={{ fontSize: 10, color: '#C6A15B', textTransform: 'uppercase' as const, letterSpacing: 2, marginBottom: 16 }}>
          Personal Information
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <Input label="Name"        value={form.firstName}   onChange={set('firstName')} />
          <Input label="Last Name"   value={form.lastName}    onChange={set('lastName')} />
          <Input label="Email"       value={form.email}       onChange={set('email')} type="email" span />
          <Input label="Description" value={form.description} onChange={set('description')} span textarea />
          <Input label="Timezone"    value={form.timezone}    onChange={set('timezone')} />
          <Input label="Language"    value={form.language}    onChange={set('language')} />
        </div>
      </DashCard>

      {/* Password */}
      <DashCard speed={0.0003} style={{ marginBottom: 14, padding: '18px 22px' }}>
        <div style={{ fontSize: 10, color: '#C6A15B', textTransform: 'uppercase' as const, letterSpacing: 2, marginBottom: 16 }}>
          Password
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <Input label="Current Password" value={form.password}    onChange={set('password')}    type="password" />
          <Input label="New Password"     value={form.newPassword} onChange={set('newPassword')} type="password" />
        </div>
      </DashCard>

      {/* Actions */}
      <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
        <button onClick={() => navigate('/app/profile')} style={{
          background: 'none', border: '1px solid rgba(198,161,91,0.2)',
          borderRadius: 6, color: '#8C6A3E', cursor: 'pointer',
          fontFamily: 'Questrial, sans-serif', fontSize: 12, padding: '9px 22px',
        }}>Cancel</button>
        <button onClick={handleSave} style={{
          background: 'rgba(198,161,91,0.1)', border: '1px solid #C6A15B',
          borderRadius: 6, color: '#C6A15B', cursor: 'pointer',
          fontFamily: 'Questrial, sans-serif', fontSize: 12, padding: '9px 22px',
          fontWeight: 600,
        }}>Save changes</button>
      </div>
    </div>
  )
}
