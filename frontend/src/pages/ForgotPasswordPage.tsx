import { useState } from 'react'
import { Link } from 'react-router-dom'
import { OrbitalBackground } from '../components/OrbitalBackground'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (ev: React.FormEvent) => {
    ev.preventDefault()
    if (!email) return
    setLoading(true)
    await new Promise(r => setTimeout(r, 1000))
    setLoading(false)
    setSent(true)
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
          {sent ? (
            <div style={{ textAlign: 'center', padding: '20px 0' }}>
              <div style={{ fontSize: 32, marginBottom: 16 }}>✦</div>
              <h2 style={styles.title}>Enlace enviado</h2>
              <p style={{ fontSize: 13, color: '#8A8070', marginBottom: 24 }}>
                Revisa tu bandeja de entrada en {email}
              </p>
              <Link to="/login" style={styles.link}>← Volver al inicio</Link>
            </div>
          ) : (
            <>
              <div style={styles.cardHeader}>
                <h1 style={styles.title}>Recuperar acceso</h1>
                <p style={styles.subtitle}>Te enviaremos un enlace de recuperación</p>
              </div>
              <form onSubmit={handleSubmit}>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Correo electrónico</label>
                  <div style={styles.inputWrap}>
                    <span style={styles.inputIcon}>✉</span>
                    <input
                      style={styles.input}
                      type="email"
                      placeholder="tu@correo.com"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                    />
                  </div>
                </div>
                <button type="submit" style={styles.btnPrimary} disabled={loading}>
                  {loading ? '⟳ Enviando...' : 'Enviar enlace'}
                </button>
              </form>
              <p style={styles.footer}>
                <Link to="/login" style={styles.link}>← Volver al inicio</Link>
              </p>
            </>
          )}
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
  btnPrimary: { width: '100%', padding: 12, background: 'transparent', border: '1px solid #C6A15B', borderRadius: 8, color: '#C6A15B', fontFamily: 'Space Grotesk, sans-serif', fontSize: 14, fontWeight: 500, letterSpacing: '0.08em', textTransform: 'uppercase', cursor: 'pointer' },
  link: { color: '#C6A15B', textDecoration: 'none', fontSize: 12 },
  footer: { marginTop: 22, textAlign: 'center', fontSize: 12, color: '#8A8070' },
}