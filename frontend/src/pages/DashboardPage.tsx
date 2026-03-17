import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { OrbitalBackground } from '../components/OrbitalBackground'

export default function DashboardPage() {
  const navigate = useNavigate()
  const { user, logout } = useAuthStore()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <div style={styles.page}>
      <OrbitalBackground />
      <nav style={styles.nav}>
        <div style={styles.logo}><LogoIcon /> ORBIT</div>
        <div style={{ display: 'flex', gap: 12 }}>
          <button style={styles.btnNav} onClick={() => navigate('/profile')}>Perfil</button>
          <button style={styles.btnNavGold} onClick={handleLogout}>Salir</button>
        </div>
      </nav>
      <div style={styles.main}>
        <div style={styles.container}>
          <div style={styles.hero}>
            <svg width="64" height="64" viewBox="0 0 64 64" fill="none" style={{ margin: '0 auto 16px' }}>
              <circle cx="32" cy="32" r="6" fill="#C6A15B"/>
              <circle cx="32" cy="32" r="14" stroke="#C6A15B" strokeWidth="0.8" fill="none" opacity="0.5"/>
              <circle cx="32" cy="32" r="22" stroke="#8C6A3E" strokeWidth="0.6" fill="none" opacity="0.35"/>
              <circle cx="32" cy="32" r="29" stroke="#C6A15B" strokeWidth="0.5" fill="none" opacity="0.15"/>
              <circle cx="46" cy="18" r="2.5" fill="#C6A15B" opacity="0.7"/>
              <circle cx="14" cy="42" r="2" fill="#8C6A3E" opacity="0.5"/>
            </svg>
            <h1 style={styles.heroTitle}>
              Bienvenido, {user?.name?.split(' ')[0] ?? 'Operador'}
            </h1>
            <p style={styles.heroSubtitle}>Tu operador de IA está listo</p>
          </div>

          <div style={styles.grid}>
            {[
              { label: 'Tareas activas', value: '0', color: '#C6A15B', bg: 'rgba(198,161,91,0.05)', border: 'rgba(198,161,91,0.12)' },
              { label: 'Apps conectadas', value: '0', color: '#7EA8C4', bg: 'rgba(46,64,87,0.15)', border: 'rgba(46,64,87,0.4)' },
              { label: 'Emails revisados', value: '0', color: '#C6A15B', bg: 'rgba(198,161,91,0.05)', border: 'rgba(198,161,91,0.12)' },
              { label: 'Reservas', value: '0', color: '#7EA8C4', bg: 'rgba(46,64,87,0.15)', border: 'rgba(46,64,87,0.4)' },
            ].map((item, i) => (
              <div key={i} style={{ ...styles.statCard, background: item.bg, border: `1px solid ${item.border}` }}>
                <div style={{ fontSize: 28, fontWeight: 600, color: item.color }}>{item.value}</div>
                <div style={styles.statLabel}>{item.label}</div>
              </div>
            ))}
          </div>

          <div style={styles.section}>
            <h2 style={styles.sectionTitle}>Agente IA</h2>
            <div style={styles.agentCard}>
              <div style={styles.agentDot} />
              <div>
                <p style={{ fontSize: 14, color: '#EDE6D6', fontWeight: 500 }}>Operador personal</p>
                <p style={{ fontSize: 12, color: '#8A8070', marginTop: 4 }}>Conecta tus apps para comenzar</p>
              </div>
            </div>
          </div>
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
  btnNavGold: { padding: '7px 18px', background: 'transparent', border: '1px solid #C6A15B', borderRadius: 8, color: '#C6A15B', fontFamily: 'Space Grotesk, sans-serif', fontSize: 13, cursor: 'pointer' },
  main: { position: 'relative', zIndex: 5, flex: 1, display: 'flex', justifyContent: 'center', padding: '40px 20px' },
  container: { width: '100%', maxWidth: 680 },
  hero: { textAlign: 'center', marginBottom: 40 },
  heroTitle: { fontSize: 28, fontWeight: 600, color: '#C6A15B', letterSpacing: '0.03em', marginBottom: 8 },
  heroSubtitle: { fontSize: 14, color: '#8A8070' },
  grid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 32 },
  statCard: { padding: '18px 16px', borderRadius: 12, textAlign: 'center' },
  statLabel: { fontSize: 11, color: '#8A8070', marginTop: 6, textTransform: 'uppercase', letterSpacing: '0.08em' },
  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 13, fontWeight: 500, color: '#8A8070', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 12 },
  agentCard: { display: 'flex', alignItems: 'center', gap: 14, padding: '16px 20px', background: '#222222', border: '1px solid rgba(198,161,91,0.15)', borderRadius: 12 },
  agentDot: { width: 10, height: 10, borderRadius: '50%', background: '#C6A15B', opacity: 0.6, flexShrink: 0 },
}