import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'
import { updateProfile } from '../../api/profile'
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
  const { user, updateUser } = useAuthStore()

  const [name, setName]               = useState(user?.username || '')
  const [currentPassword, setCurrent] = useState('')
  const [newPassword, setNew]         = useState('')
  const [saving, setSaving]           = useState(false)
  const [error, setError]             = useState('')
  const [success, setSuccess]         = useState(false)

  const handleSave = async () => {
    setSaving(true)
    setError('')
    setSuccess(false)
    try {
      const payload: { username?: string; currentPassword?: string; newPassword?: string } = {}
      if (name.trim() && name.trim() !== user?.username) payload.username = name.trim()
      if (newPassword) {
        payload.currentPassword = currentPassword
        payload.newPassword = newPassword
      }
      if (Object.keys(payload).length === 0) {
        navigate('/app/profile')
        return
      }
      const updated = await updateProfile(payload)
      updateUser({ username: updated.username })
      setSuccess(true)
      setTimeout(() => navigate('/app/profile'), 800)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error al guardar')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={{
      padding: '20px 24px', background: '#1a1a1a',
      height: 'calc(100vh - 56px)', overflowY: 'auto',
    }}>
      <DashCard speed={0.0004} style={{ marginBottom: 14, padding: '18px 22px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
          <Avatar name={name || user?.username || '?'} />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 20, fontWeight: 600, color: '#EDE6D6', marginBottom: 4 }}>Edit Profile</div>
            <div style={{ fontSize: 12, color: '#8C6A3E' }}>
              Update your personal information. Changes are reflected across the platform.
            </div>
          </div>
          <div style={{ width: 70, height: 70, borderRadius: '50%', border: '1px solid rgba(198,161,91,0.1)', flexShrink: 0 }} />
        </div>
      </DashCard>

      <DashCard speed={0.0003} style={{ marginBottom: 14, padding: '18px 22px' }}>
        <div style={{ fontSize: 10, color: '#C6A15B', textTransform: 'uppercase' as const, letterSpacing: 2, marginBottom: 16 }}>
          Personal Information
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <Input label="Name" value={name} onChange={setName} />
          <Input label="Email (read-only)" value={user?.email || ''} onChange={() => {}} type="email" />
        </div>
      </DashCard>

      <DashCard speed={0.0003} style={{ marginBottom: 14, padding: '18px 22px' }}>
        <div style={{ fontSize: 10, color: '#C6A15B', textTransform: 'uppercase' as const, letterSpacing: 2, marginBottom: 16 }}>
          Change Password
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <Input label="Current Password" value={currentPassword} onChange={setCurrent} type="password" />
          <Input label="New Password"     value={newPassword}     onChange={setNew}     type="password" />
        </div>
        <div style={{ fontSize: 10, color: '#8C6A3E', marginTop: 8 }}>
          Leave blank to keep your current password.
        </div>
      </DashCard>

      {error && (
        <div style={{ fontSize: 12, color: '#c47070', marginBottom: 10, padding: '8px 14px', background: 'rgba(154,74,74,0.1)', borderRadius: 6, border: '1px solid rgba(154,74,74,0.3)' }}>
          ⚠ {error}
        </div>
      )}

      <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
        <button onClick={() => navigate('/app/profile')} style={{
          background: 'none', border: '1px solid rgba(198,161,91,0.2)',
          borderRadius: 6, color: '#8C6A3E', cursor: 'pointer',
          fontFamily: 'Questrial, sans-serif', fontSize: 12, padding: '9px 22px',
        }}>Cancel</button>
        <button onClick={handleSave} disabled={saving} style={{
          background: success ? 'rgba(74,154,89,0.15)' : 'rgba(198,161,91,0.1)',
          border: `1px solid ${success ? '#4a9a59' : '#C6A15B'}`,
          borderRadius: 6, color: success ? '#4a9a59' : '#C6A15B', cursor: saving ? 'not-allowed' : 'pointer',
          fontFamily: 'Questrial, sans-serif', fontSize: 12, padding: '9px 22px', fontWeight: 600,
          opacity: saving ? 0.7 : 1, transition: 'all 0.3s',
        }}>
          {success ? '✓ Saved' : saving ? 'Saving...' : 'Save changes'}
        </button>
      </div>
    </div>
  )
}
