import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { loginRequest } from '../api/auth'
import { useAuthStore } from '../store/authStore'
import { OrbitalBackground } from '../components/OrbitalBackground'

export default function LoginPage() {
  const navigate = useNavigate()
  const setAuth = useAuthStore(s => s.setAuth)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({})
  const [authError, setAuthError] = useState('')
  const [loading, setLoading] = useState(false)

  const validate = () => {
    const e: typeof errors = {}
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) e.email = 'Correo inválido'
    if (!password || password.length < 6) e.password = 'Mínimo 6 caracteres'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSubmit = async (ev: React.FormEvent) => {
    ev.preventDefault()
    if (!validate()) return
    setLoading(true)
    setAuthError('')
    try {
      const { user, token } = await loginRequest(email, password)
      setAuth(user, token)
      navigate('/dashboard')
    } catch {
      setAuthError('Credenciales inválidas. Usa test@test.com / 123456')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={styles.page}>
      <OrbitalBackground />
      <nav style={styles.nav}>
        <div style={styles.logo}>
          <LogoIcon /> ORBIT
        </div>
      </nav>
      <div style={styles.main}>
        <div style={styles.card}>
          <div style={styles.cardTopLine} />
          <div style={styles.emblem}><Emblem /></div>
          <div style={styles.cardHeader}>
            <h1 style={styles.title}>Bienvenido</h1>
            <p style={styles.subtitle}>Accede a tu operador personal de IA</p>
          </div>
          <form onSubmit={handleSubmit}>
            {authError && (
              <div style={styles.alertError}>
                <span>⚠</span> {authError}
              </div>
            )}
            <div style={styles.formGroup}>
              <label style={styles.label}>Correo electrónico</label>
              <div style={styles.inputWrap}>
                <span style={styles.inputIcon}>✉</span>
                <input
                  style={{ ...styles.input, ...(errors.email ? styles.inputError : {}) }}
                  type="email"
                  placeholder="tu@correo.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSubmit(e as any)}
                />
              </div>
              {errors.email && <p style={styles.fieldError}>{errors.email}</p>}
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>Contraseña</label>
              <div style={styles.inputWrap}>
                <span style={styles.inputIcon}>⚿</span>
                <input
                  style={{ ...styles.input, ...(errors.password ? styles.inputError : {}) }}
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                />
              </div>
              {errors.password && <p style={styles.fieldError}>{errors.password}</p>}
            </div>
            <div style={styles.formRow}>
              <span style={{ fontSize: 12, color: '#8A8070' }}>
                <Link to="/forgot-password" style={styles.link}>¿Olvidaste tu contraseña?</Link>
              </span>
            </div>
            <button type="submit" style={styles.btnPrimary} disabled={loading}>
              {loading ? '⟳ Verificando...' : 'Iniciar sesión'}
            </button>
          </form>
          <p style={styles.footer}>
            ¿No tienes cuenta?{' '}
            <Link to="/register" style={styles.link}>Crear cuenta</Link>
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

function Emblem() {
  return (
    <svg width="56" height="56" viewBox="0 0 56 56" fill="none">
      <circle cx="28" cy="28" r="5" fill="#C6A15B"/>
      <circle cx="28" cy="28" r="11" stroke="#C6A15B" strokeWidth="0.8" fill="none" opacity="0.5"/>
      <circle cx="28" cy="28" r="18" stroke="#8C6A3E" strokeWidth="0.6" fill="none" opacity="0.35"/>
      <circle cx="28" cy="28" r="25" stroke="#C6A15B" strokeWidth="0.5" fill="none" opacity="0.15"/>
      <circle cx="39" cy="17" r="2" fill="#C6A15B" opacity="0.6"/>
      <circle cx="14" cy="34" r="1.5" fill="#8C6A3E" opacity="0.5"/>
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
  emblem: { display: 'flex', justifyContent: 'center', marginBottom: 20 },
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
  formRow: { display: 'flex', justifyContent: 'flex-end', marginBottom: 22 },
  alertError: { display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', background: 'rgba(192,57,43,0.08)', border: '1px solid rgba(192,57,43,0.25)', borderRadius: 8, fontSize: 12, color: '#E57373', marginBottom: 16 },
  btnPrimary: { width: '100%', padding: 12, background: 'transparent', border: '1px solid #C6A15B', borderRadius: 8, color: '#C6A15B', fontFamily: 'Space Grotesk, sans-serif', fontSize: 14, fontWeight: 500, letterSpacing: '0.08em', textTransform: 'uppercase', cursor: 'pointer' },
  link: { color: '#C6A15B', textDecoration: 'none', fontSize: 12 },
  footer: { marginTop: 22, textAlign: 'center', fontSize: 12, color: '#8A8070' },
}