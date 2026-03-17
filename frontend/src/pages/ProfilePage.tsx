import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { OrbitalBackground } from '../components/OrbitalBackground'

export default function ProfilePage() {
  const navigate = useNavigate()
  const { user, logout } = useAuthStore()

  const initials = user?.name?.split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase() ?? 'OP'

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
          <button style={styles.btnNav} onClick={() => navigate('/dashboard')}>← Dashboard</button>
          <button style={styles.btnNavGold} onClick={handleLogout}>Salir</button>
        </div>
      </nav>
      <div style={styles.main}>
        <div style={styles.card}>
          <div style={styles.cardTopLine} />
          <div style={{ textAlign: 'center', marginBottom: 28 }}>
            <div style={styles.avatar}>{initials}</div>
            <div style={styles.tag}>Operador activo</div>
            <h2 style={styles.name}>{user?.name ?? 'Usuario'}</h2>
            <p style={styles.since}>Miembro desde marzo 2026</p>
          </div>
          <div style={styles.fields}>
            {[
              { label: 'Correo', value: user?.email ?? '—' },
              { label: 'Nombre', value: user?.name ?? '—' },
              { label: 'Bio', value: user?.bio || 'Sin descripción' },
            ].map(({ label, value }) => (
              <div key={label} style={styles.field}>
                <span style={styles.fieldLabel}>{label}</span>
                <span style={{ fontSize: 13, color: value === 'Sin descripción' ? '#8A8070' : '#EDE6D6' }}>{value}</span>
              </div>
            ))}
          </div>
          <button style={styles.btnPrimary} onClick={() => navigate('/profile/edit')}>
            Editar perfil
          </button>
          <button style={styles.btnSecondary} onClick={handleLogout}>
            Cerrar sesión
          </button>
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
  main: { position: 'relative', zIndex: 5, flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 20px' },
  card: { width: '100%', maxWidth: 420, background: '#222222', border: '1px solid rgba(198,161,91,0.2)', borderRadius: 16, padding: '36px 32px', position: 'relative' },
  cardTopLine: { position: 'absolute', top: 0, left: 20, right: 20, height: 1, background: 'linear-gradient(90deg, transparent, #C6A15B, transparent)', opacity: 0.4 },
  avatar: { width: 64, height: 64, borderRadius: '50%', background: 'rgba(198,161,91,0.1)', border: '1px solid rgba(198,161,91,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, fontWeight: 600, color: '#C6A15B', margin: '0 auto 12px' },
  tag: { display: 'inline-block', padding: '3px 12px', background: 'rgba(46,64,87,0.3)', border: '1px solid rgba(46,64,87,0.6)', borderRadius: 20, fontSize: 11, color: '#7EA8C4', letterSpacing: '0.05em', marginBottom: 12 },
  name: { fontSize: 20, fontWeight: 600, color: '#C6A15B', marginBottom: 4 },
  since: { fontSize: 12, color: '#8A8070' },
  fields: { marginBottom: 24 },
  field: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid rgba(198,161,91,0.07)' },
  fieldLabel: { fontSize: 11, color: '#8A8070', textTransform: 'uppercase', letterSpacing: '0.08em' },
  btnPrimary: { width: '100%', padding: 12, background: 'transparent', border: '1px solid #C6A15B', borderRadius: 8, color: '#C6A15B', fontFamily: 'Space Grotesk, sans-serif', fontSize: 14, fontWeight: 500, letterSpacing: '0.08em', textTransform: 'uppercase', cursor: 'pointer', marginBottom: 10 },
  btnSecondary: { width: '100%', padding: 12, background: 'transparent', border: '1px solid rgba(46,64,87,0.8)', borderRadius: 8, color: '#7EA8C4', fontFamily: 'Space Grotesk, sans-serif', fontSize: 14, cursor: 'pointer' },
}