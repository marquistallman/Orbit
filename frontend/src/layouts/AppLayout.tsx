import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'

const NAV = [
  { to: '/app/apps',     label: 'Apps'      },
  { to: '/app/agent',    label: 'Agent'     },
  { to: '/app/documents', label: 'Docs'      },
  { to: '/app/labs',     label: 'Labs'      },
  { to: '/app/finance',  label: 'Finance'   },
  { to: '/app/messages', label: 'Messages'  },
  { to: '/app',          label: 'Dashboard' },
  { to: '/app/profile',  label: 'Profile'   },
]

export default function AppLayout() {
  const { logout } = useAuthStore()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/')
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: '#1a1a1a' }}>
      {/* Topbar */}
      <header style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 28px',
        height: 56,
        background: '#181818',
        borderBottom: '1px solid rgba(198,161,91,0.15)',
        flexShrink: 0,
      }}>
        {/* Logo */}
        <NavLink to="/app" style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none' }}>
          <svg width="28" height="28" viewBox="0 0 32 32" fill="none">
            <circle cx="16" cy="16" r="5" fill="#C6A15B"/>
            <ellipse cx="16" cy="16" rx="14" ry="6" stroke="#C6A15B" strokeWidth="1.2" fill="none" transform="rotate(-20 16 16)"/>
            <ellipse cx="16" cy="16" rx="14" ry="6" stroke="#8C6A3E" strokeWidth="0.8" fill="none" transform="rotate(50 16 16)" opacity="0.6"/>
            <circle cx="28" cy="13" r="2" fill="#C6A15B" opacity="0.8"/>
          </svg>
          <span style={{
            fontFamily: "'Questrial', sans-serif",
            fontSize: 16,
            fontWeight: 600,
            color: '#C6A15B',
            letterSpacing: 2,
          }}>rbit</span>
        </NavLink>

        {/* Nav */}
        <nav style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          {NAV.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/app'}
              style={({ isActive }) => ({
                padding: '6px 14px',
                fontSize: 12,
                fontWeight: 500,
                fontFamily: "'Questrial', sans-serif",
                color: isActive ? '#C6A15B' : '#8C6A3E',
                textDecoration: 'none',
                border: isActive ? '1px solid rgba(198,161,91,0.4)' : '1px solid transparent',
                borderRadius: 6,
                background: isActive ? 'rgba(198,161,91,0.06)' : 'transparent',
                transition: 'all 0.15s',
              })}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        {/* Logout */}
        <button
          onClick={handleLogout}
          style={{
            background: 'transparent',
            border: '1px solid rgba(198,161,91,0.4)',
            borderRadius: 6,
            padding: '6px 16px',
            fontSize: 12,
            fontFamily: "'Questrial', sans-serif",
            color: '#C6A15B',
            cursor: 'pointer',
            transition: 'all 0.15s',
          }}
          onMouseEnter={e => (e.currentTarget.style.background = 'rgba(198,161,91,0.1)')}
          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
        >
          Log out
        </button>
      </header>

      {/* Page */}
      <main style={{ flex: 1, overflow: 'auto' }}>
        <Outlet />
      </main>
    </div>
  )
}
