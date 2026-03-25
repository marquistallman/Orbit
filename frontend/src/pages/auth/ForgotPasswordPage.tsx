import { useState } from 'react'
import { Link } from 'react-router-dom'
import AuthCard from '../../components/ui/AuthCard'
import AuthInput from '../../components/ui/AuthInput'
import AuthButton from '../../components/ui/AuthButton'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email) { setError('Email requerido'); return }
    if (!/\S+@\S+\.\S+/.test(email)) { setError('Email inválido'); return }
    setLoading(true)
    await new Promise(r => setTimeout(r, 1200))
    setLoading(false)
    setSent(true)
  }

  return (
    <AuthCard maxWidth={360}>
      {sent ? (
        <div style={{ textAlign: 'center', padding: '12px 0' }}>
          <div style={{
            width: 48, height: 48, borderRadius: '50%',
            border: '1px solid #C6A15B',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 16px',
          }}>
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M4 10l5 5 7-8" stroke="#C6A15B" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <h2 style={{ fontFamily: "'Questrial', sans-serif", fontSize: 16, color: '#C6A15B', marginBottom: 8 }}>
            Link sent
          </h2>
          <p style={{ fontSize: 12, color: '#8C6A3E', lineHeight: 1.6, marginBottom: 20 }}>
            Check your inbox at <span style={{ color: '#C6A15B' }}>{email}</span> for the recovery link.
          </p>
          <Link to="/" style={{
            fontSize: 12, color: '#C6A15B', textDecoration: 'none',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
          }}>
            ← Back to login
          </Link>
        </div>
      ) : (
        <>
          <div style={{ textAlign: 'center', marginBottom: 24 }}>
            <h1 style={{
              fontFamily: "'Questrial', sans-serif",
              fontSize: 20,
              fontWeight: 600,
              color: '#C6A15B',
              letterSpacing: 1,
            }}>Recover access</h1>
            <p style={{ fontSize: 12, color: '#8C6A3E', marginTop: 4 }}>
              We will send you a recovery link
            </p>
          </div>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <AuthInput
              label="Email"
              type="email"
              value={email}
              onChange={e => { setEmail(e.target.value); setError('') }}
              error={error}
            />

            <AuthButton type="submit" loading={loading}>
              Send link
            </AuthButton>

            <Link to="/" style={{
              textAlign: 'center',
              fontSize: 12,
              color: '#C6A15B',
              textDecoration: 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 4,
            }}>
              ← Back to login
            </Link>
          </form>
        </>
      )}
    </AuthCard>
  )
}
