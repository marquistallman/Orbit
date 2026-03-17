import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { updateProfileRequest } from '../api/auth'
import { OrbitalBackground } from '../components/OrbitalBackground'

export default function EditProfilePage() {
  const navigate = useNavigate()
  const { user, updateUser } = useAuthStore()
  const [form, setForm] = useState({ name: user?.name ?? '', email: user?.email ?? '', bio: user?.bio ?? '' })
  const [loading, setLoading] = useState(false)
  const [saved, setSaved] = useState(false)

  const handleSubmit = async (ev: React.FormEvent) => {
    ev.preventDefault()
    setLoading(true)
    try {
      await updateProfileRequest(form)
      updateUser(form)
      setSaved(true)
      setTimeout(() => navigate('/profile'), 1000)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={styles.page}>
      <OrbitalBackground />
      <nav style={styles.nav}>
        <div style={styles.logo}><LogoIcon /> ORBIT</div>
        <button style={styles.btnNav} onClick={() => navigate('/profile')}>← Perfil</button>
      </nav>
      <div style={styles.main}>
        <div style={styles.card}>
          <div style={styles.cardTopLine} />
          <div style={styles.cardHeader}>
            <h1 style={styles.title}>Editar perfil</h1>
            <p style={styles.subtitle}>Actualiza tu información</p>
          </div>
          {saved && (
            <div style={styles.alertSuccess}>✦ Cambios guardados correctamente</div>
          )}
          <form onSubmit={handleSubmit}>
            {[
              { field: 'name', label: 'Nombre', type: 'text', icon: '◎' },
              { field: 'email', label: 'Correo electrónico', type: 'email', icon: '✉' },
            ].map(({ field, label, type, icon }) => (
              <div key={field} style={styles.formGroup}>
                <label style={styles.label}>{label}</label>
                <div style={styles.inputWrap}>
                  <span style={styles.inputIcon}>{icon}</span>
                  <input
                    style={styles.input}
                    type={type}
                    value={form[field as keyof typeof form]}
                    onChange={e => setForm({ ...form, [field]: e.target.value })}
                  />
                </div>
              </div>
            ))}
            <div style={styles.formGroup}>
              <label style={styles.label}>Bio</label>
              <textarea
                style={{ ...styles.input, padding: '11px 12px', height: 80, resize: 'none' }}
                placeholder="Cuéntanos sobre ti..."
                value={form.bio}
                onChange={e => setForm({ ...form, bio: e.target.value })}
              />
            </div>
            <button type="submit" style={styles.btnPrimary} disabled={loading}>
              {loading ? '⟳ Guardando...' : 'Guardar cambios'}
            </button>
            <button type="button" style={styles.btnSecondary} onClick={() => navigate('/profile')}>
              Cancelar
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}

function LogoIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 28 28" fill="none">
      <circle cx="14" cy="14" r="3" fill="#C6A15B"/>
      <ellipse cx="14" cy="14" rx="11" ry="5" stroke="#C6A15B" strokeWidth="1" fill="none" opacity="0.6" transform="rotate(-30 14 14)"/>
      <ellipse cx="14" cy="14" rx="11" ry="5" stroke="#8C6A3E" strokeWidth="0.8" fill="none" opacity="0.4" transform="rotate(30 14 14)"/>
    </svg>
  )
}

const styles: Record<string, React.CSSProperties> = {
  page: { minHeight: '100vh', background: '#1B1B1B', position: 'relative', overflow: 'hidden', display: 'flex', flexDirection: 'column' },
  nav: { position: 'relative', zIndex: 10, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 32px', borderBottom: '1px solid rgba(198,161,91,0.2)' },
  logo: { display: 'flex', alignItems: 'center', gap: 10, fontSize: 18, fontWeight: 600, color: '#C6A15B', letterSpacing: '0.05em' },
  btnNav: { padding: '7px 18px', background: 'transparent', border: '1px solid rgba(198,161,91,0.2)', borderRadius: 8, color: '#8A8070', fontFamily: 'Space Grotesk, sans-serif', fontSize: 13, cursor: 'pointer' },
  main: { position: 'relative', zIndex: 5, flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 20px' },
  card: { width: '100%', maxWidth: 420, background: '#222222', border: '1px solid rgba(198,161,91,0.2)', borderRadius: 16, padding: '36px 32px', position: 'relative' },
  cardTopLine: { position: 'absolute', top: 0, left: 20, right: 20, height: 1, background: 'linear-gradient(90deg, transparent, #C6A15B, transparent)', opacity: 0.4 },
  cardHeader: { textAlign: 'center', marginBottom: 28 },
  title: { fontSize: 22, fontWeight: 600, color: '#C6A15B', letterSpacing: '0.04em', marginBottom: 6 },
  subtitle: { fontSize: 13, color: '#8A8070', fontWeight: 300 },
  formGroup: { marginBottom: 18 },
  label: { display: 'block', fontSize: 11, fontWeight: 500, color: '#8A8070', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 8 },
  inputWrap: { position: 'relative' },
  inputIcon: { position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#8A8070', fontSize: 14, pointerEvents: 'none' },
  input: { width: '100%', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(198,161,91,0.15)', borderRadius: 8, padding: '11px 12px 11px 36px', color: '#EDE6D6', fontFamily: 'Space Grotesk, sans-serif', fontSize: 14, outline: 'none' },
  alertSuccess: { padding: '10px 12px', background: 'rgba(198,161,91,0.08)', border: '1px solid rgba(198,161,91,0.25)', borderRadius: 8, fontSize: 12, color: '#C6A15B', marginBottom: 16, textAlign: 'center' },
  btnPrimary: { width: '100%', padding: 12, background: 'transparent', border: '1px solid #C6A15B', borderRadius: 8, color: '#C6A15B', fontFamily: 'Space Grotesk, sans-serif', fontSize: 14, fontWeight: 500, letterSpacing: '0.08em', textTransform: 'uppercase', cursor: 'pointer', marginBottom: 10 },
  btnSecondary: { width: '100%', padding: 12, background: 'transparent', border: '1px solid rgba(46,64,87,0.8)', borderRadius: 8, color: '#7EA8C4', fontFamily: 'Space Grotesk, sans-serif', fontSize: 14, cursor: 'pointer' },
}