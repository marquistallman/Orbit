import { useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'
import AuthCard from '../../components/ui/AuthCard'
import OrbitIcon from '../../components/ui/OrbitIcon'

export default function OAuthCallbackPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const setAuth = useAuthStore(s => s.setAuth)

  useEffect(() => {
    const authenticate = () => {
      const token = searchParams.get('token')
      const errorParam = searchParams.get('error')
      
      if (errorParam) {
        navigate(`/login?error=${encodeURIComponent(errorParam)}`, { replace: true })
        return
      }

      const userId = searchParams.get('userId')
      const username = searchParams.get('username')
      const email = searchParams.get('email')

      if (token && userId && username && email) {
        localStorage.setItem('token', token)
        const user = {
          id: userId,
          username: username,
          email: email,
        };
        setAuth(user, token)
        navigate('/app', { replace: true })
      } else {
        // Si falta algún dato, consideramos que el auth falló
        navigate('/login?error=Authentication+failed', { replace: true })
      }
    }
    authenticate()
  }, [searchParams, navigate, setAuth])

  return (
    <AuthCard maxWidth={360}>
      <div style={{ textAlign: 'center', padding: '32px 0' }}>
        <OrbitIcon size={44} />
        <h2 style={{ fontSize: 18, fontWeight: 600, color: '#C6A15B', marginTop: 16 }}>Verifying...</h2>
        <div style={{
          margin: '20px auto 0', width: 24, height: 24, borderRadius: '50%',
          border: '2px solid rgba(198,161,91,0.2)', borderTopColor: '#C6A15B',
          animation: 'spin 0.8s linear infinite'
        }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    </AuthCard>
  )
}
