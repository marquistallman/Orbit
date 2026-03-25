import { Outlet } from 'react-router-dom'
import OrbitalBackground from '../components/orbit/OrbitalBackground'

export default function AuthLayout() {
  return (
    <div style={{
      position: 'relative',
      minHeight: '100vh',
      width: '100%',
      background: '#1a1a1a',
      display: 'flex',
      flexDirection: 'column',
    }}>
      <OrbitalBackground />

      {/* Topbar */}
      <header style={{
        position: 'relative',
        zIndex: 10,
        padding: '14px 28px',
        borderBottom: '1px solid rgba(198,161,91,0.2)',
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        background: 'rgba(26,26,26,0.7)',
        backdropFilter: 'blur(8px)',
      }}>
        <OrbitLogo />
      </header>

      {/* Page content */}
      <main style={{
        position: 'relative',
        zIndex: 10,
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '40px 20px',
      }}>
        <Outlet />
      </main>
    </div>
  )
}

export function OrbitLogo() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
        <circle cx="16" cy="16" r="5" fill="#C6A15B" />
        <ellipse cx="16" cy="16" rx="14" ry="6" stroke="#C6A15B" strokeWidth="1.2" fill="none" transform="rotate(-20 16 16)" />
        <ellipse cx="16" cy="16" rx="14" ry="6" stroke="#8C6A3E" strokeWidth="0.8" fill="none" transform="rotate(50 16 16)" opacity="0.6" />
        <circle cx="28" cy="13" r="2" fill="#C6A15B" opacity="0.8" />
      </svg>
      <span style={{
        fontFamily: "'Questrial', sans-serif",
        fontSize: 18,
        fontWeight: 600,
        color: '#C6A15B',
        letterSpacing: 2,
      }}>rbit</span>
    </div>
  )
}
