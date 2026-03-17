import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { registerRequest } from '../api/auth'
import { useAuthStore } from '../store/authStore'
import { OrbitalBackground } from '../components/OrbitalBackground'

export default function RegisterPage() {
  const navigate = useNavigate()
  const setAuth = useAuthStore(s => s.setAuth)
  const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '' })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)

  const validate = () => {
    const e: Record<string, string> = {}
    if (!form.name.trim()) e.name = 'Nombre requerido'
    if (!form.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = 'Correo inválido'
    if (!form.password || form.password.length < 6) e.password = 'Mínimo 6 caracteres'
    if (form.password !== form.confirm) e.confirm = 'Las contraseñas no coinciden'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSubmit = async (ev: React.FormEvent) => {
    ev.preventDefault()
    if (!validate()) return
    setLoading(true)
    try {
      const { user, token } = await registerRequest(form.name, form.email, form.password)
      setAuth(user, token)
      navigate('/dashboard')
    } catch {
      setErrors({ general: 'Error al crear cuenta. Intenta de nuevo.' })
    } finally {
      setLoading(false)
    }
  }

  const f = (field: string) => ({
    value: form[field as keyof typeof form],
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, [field]: e.target.value }),
    style: { ...styles.input, ...(errors[field] ? styles.inputError : {}) }
  })

  return (
    <div style={styles.page}>
      <OrbitalBackground />
      <nav style={styles.nav}>
        <div style={styles.logo}><LogoIcon /> ORBIT</div>
      </nav>
      <div style={styles.main}>
        <div style={styles.card}>
          <div style={styles.cardTopLine} />
          <div style={styles.cardHeader}>
            <h1 style={styles.title}>Crear cuenta</h1>
            <p style={styles.subtitle}>Únete a la red de operadores Orbit</p>
          </div>
          <form onSubmit={handleSubmit}>
            {errors.general && (
              <div style={styles.alertError}><span>⚠</span> {errors.general}</div>
            )}
            {[
              { field: 'name', label: 'Nombre completo', type: 'text', placeholder: 'Tu nombre', icon: '◎' },
              { field: 'email', label: 'Correo electrónico', type: 'email', placeholder: 'tu@correo.com', icon: '✉' },
              { field: 'password', label: 'Contraseña', type: 'password', placeholder: 'Mínimo 6 caracteres', icon: '⚿' },
              { field: 'confirm', label: 'Confirmar contraseña', type: 'password', placeholder: 'Repite tu contraseña', icon: '⚿' },
            ].map(({ field, label, type, placeholder, icon }) => (
              <div key={field} style={styles.formGroup}>
                <label style={styles.label}>{label}</label>
                <div style={styles.inputWrap}>
                  <span style={styles.inputIcon}>{icon}</span>
                  <input type={type} placeholder={placeholder} {...f(field)} />
                </div>
                {errors[field] && <p style={styles.fieldError}>{errors[field]}</p>}
              </div>
            ))}
            <button type="submit" style={styles.btnPrimary} disabled={loading}>
              {loading ? '⟳ Creando cuenta...' : 'Crear cuenta'}
            </button>
          </form>
          <p style={styles.footer}>
            ¿Ya tienes cuenta?{' '}
            <Link to="/login" style={styles.link}>Ingresar</Link>
          </p>
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
  nav: { position: 'relative', zIndex: 10, display: 'flex', alignItems: 'center', padding: '20px 32px', borderBottom: '1px solid rgba(198,161,91,0.2)' },
  logo: { display: 'flex', alignItems: 'center', gap: 10, fontSize: 18, fontWeight: 600, color: '#C6A15B', letterSpacing: '0.05em' },
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
  inputError: { borderColor: '#C0392B' },
  fieldError: { fontSize: 11, color: '#C0392B', marginTop: 5 },
  alertError: { display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', background: 'rgba(192,57,43,0.08)', border: '1px solid rgba(192,57,43,0.25)', borderRadius: 8, fontSize: 12, color: '#E57373', marginBottom: 16 },
  btnPrimary: { width: '100%', padding: 12, background: 'transparent', border: '1px solid #C6A15B', borderRadius: 8, color: '#C6A15B', fontFamily: 'Space Grotesk, sans-serif', fontSize: 14, fontWeight: 500, letterSpacing: '0.08em', textTransform: 'uppercase', cursor: 'pointer' },
  link: { color: '#C6A15B', textDecoration: 'none', fontSize: 12 },
  footer: { marginTop: 22, textAlign: 'center', fontSize: 12, color: '#8A8070' },
}