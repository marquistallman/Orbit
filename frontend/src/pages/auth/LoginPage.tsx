import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import AuthCard from '../../components/ui/AuthCard'
import AuthInput from '../../components/ui/AuthInput'
import AuthButton from '../../components/ui/AuthButton'
import SocialButton from '../../components/ui/SocialButton'
import OrDivider from '../../components/ui/OrDivider'
import OrbitIcon from '../../components/ui/OrbitIcon'
import { loginRequest } from '../../api/auth'
import { useAuthStore } from '../../store/authStore'

const GoogleIcon = () => (
  <svg width="18" height="18" viewBox="0 0 18 18">
    <path d="M16.51 8H8.98v3h4.3c-.18 1-.74 1.48-1.6 2.04v2.01h2.6a7.8 7.8 0 002.38-5.88c0-.57-.05-.66-.15-1.18z" fill="#4285F4"/>
    <path d="M8.98 17c2.16 0 3.97-.72 5.3-1.94l-2.6-2.01c-.72.48-1.63.76-2.7.76-2.08 0-3.84-1.4-4.47-3.29H1.88v2.07A8 8 0 008.98 17z" fill="#34A853"/>
    <path d="M4.51 10.52A4.8 4.8 0 014.26 9c0-.53.09-1.04.25-1.52V5.41H1.88A8 8 0 001 9c0 1.29.31 2.51.88 3.59l2.63-2.07z" fill="#FBBC05"/>
    <path d="M8.98 3.58c1.17 0 2.23.4 3.06 1.2l2.3-2.3A8 8 0 001.88 5.4L4.5 7.48c.63-1.89 2.4-3.9 4.48-3.9z" fill="#EA4335"/>
  </svg>
)
const LinkedInIcon = () => (
  <svg width="18" height="18" viewBox="0 0 18 18"><rect width="18" height="18" rx="3" fill="#0A66C2"/><path d="M5 7h2v6H5zm1-3a1 1 0 110 2 1 1 0 010-2zm3 3h1.9v.8h.03C11.24 7.6 12 7 13.1 7 15.2 7 15.5 8.4 15.5 10v3h-2V10.5c0-.8-.01-1.8-1.1-1.8-1.1 0-1.27.86-1.27 1.75V13H9V7z" fill="white"/></svg>
)
const GithubIcon = () => (
  <svg width="18" height="18" viewBox="0 0 18 18" fill="#EDE6D6"><path fillRule="evenodd" d="M9 1a8 8 0 00-2.53 15.59c.4.07.55-.17.55-.38v-1.34C4.73 15.37 4.27 14 4.27 14c-.36-.92-.89-1.17-.89-1.17-.73-.5.06-.49.06-.49.8.06 1.23.83 1.23.83.71 1.22 1.87.87 2.33.66.07-.52.28-.87.5-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.83-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82A7.69 7.69 0 019 5.38c.68 0 1.36.09 2 .26 1.52-1.03 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48v2.19c0 .21.15.46.55.38A8 8 0 009 1z"/></svg>
)
const FacebookIcon = () => (
  <svg width="18" height="18" viewBox="0 0 18 18"><rect width="18" height="18" rx="3" fill="#1877F2"/><path d="M12 9H10V8c0-.55.45-1 1-1h1V5h-1c-1.66 0-3 1.34-3 3v1H7v2h1v6h2v-6h2l1-2z" fill="white"/></svg>
)

export default function LoginPage() {
  const navigate = useNavigate()
  const setAuth = useAuthStore(s => s.setAuth)
  const [form, setForm] = useState({ email: '', password: '' })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)
  const [authError, setAuthError] = useState('')

  const validate = () => {
    const e: Record<string, string> = {}
    if (!form.email) e.email = 'Email requerido'
    else if (!/\S+@\S+\.\S+/.test(form.email)) e.email = 'Email inválido'
    if (!form.password) e.password = 'Contraseña requerida'
    else if (form.password.length < 6) e.password = 'Mínimo 6 caracteres'
    return e
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length) { setErrors(errs); return }
    setLoading(true)
    setAuthError('')
    try {
      const { user, token } = await loginRequest(form.email, form.password)
      setAuth(user, token)
      navigate('/app')
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al iniciar sesión'
      setAuthError(msg.includes('User not found') || msg.includes('Invalid password')
        ? 'Credenciales inválidas. Intenta de nuevo.'
        : 'Error al conectar con el servidor.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthCard maxWidth={360}>
      <div style={{ textAlign: 'center', marginBottom: 24 }}>
        <OrbitIcon size={44} />
        <h1 style={{ fontSize: 22, fontWeight: 600, color: '#C6A15B', marginTop: 12, letterSpacing: 1 }}>
          Welcome
        </h1>
        <p style={{ fontSize: 12, color: '#8C6A3E', marginTop: 4 }}>
          Access your personal AI operator
        </p>
      </div>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <AuthInput label="Email" type="email" value={form.email}
          onChange={e => setForm(f => ({ ...f, email: e.target.value }))} error={errors.email} />
        <AuthInput label="Password" type="password" value={form.password}
          onChange={e => setForm(f => ({ ...f, password: e.target.value }))} error={errors.password} />

        <div style={{ textAlign: 'right', marginTop: -6 }}>
          <Link to="/forgot-password" style={{ fontSize: 12, color: '#C6A15B', textDecoration: 'none' }}>
            Forgot password?
          </Link>
        </div>

        {authError && (
          <p style={{ fontSize: 11, color: '#c47070', textAlign: 'center', padding: '6px 0' }}>
            {authError}
          </p>
        )}

        <AuthButton type="submit" loading={loading}>Login</AuthButton>

        <p style={{ textAlign: 'center', fontSize: 12, color: '#8C6A3E' }}>
          Don't have an account?{' '}
          <Link to="/register" style={{ color: '#C6A15B', textDecoration: 'none', fontWeight: 500 }}>
            Create an account
          </Link>
        </p>

        <OrDivider />

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <SocialButton icon={<GoogleIcon />}   label="Continue with Google"   onClick={() => window.location.href = `${import.meta.env.VITE_API_URL ?? 'http://localhost:12001'}/oauth2/authorization/auth0`} />
          <SocialButton icon={<LinkedInIcon />} label="Continue with Linkedin" onClick={() => window.location.href = `${import.meta.env.VITE_API_URL ?? 'http://localhost:12001'}/oauth2/authorization/auth0`} />
          <SocialButton icon={<GithubIcon />}   label="Continue with Github"   onClick={() => window.location.href = `${import.meta.env.VITE_API_URL ?? 'http://localhost:12001'}/oauth2/authorization/auth0`} />
          <SocialButton icon={<FacebookIcon />} label="Continue with Facebook" onClick={() => window.location.href = `${import.meta.env.VITE_API_URL ?? 'http://localhost:12001'}/oauth2/authorization/auth0`} />
        </div>
      </form>
    </AuthCard>
  )
}
