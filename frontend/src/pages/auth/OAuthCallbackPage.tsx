import { useEffect, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'
import AuthCard from '../../components/ui/AuthCard'
import OrbitIcon from '../../components/ui/OrbitIcon'
import AuthButton from '../../components/ui/AuthButton'

export default function OAuthCallbackPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const setAuth = useAuthStore(s => s.setAuth)
  const processedRef = useRef(false) // Evita doble ejecución en React StrictMode
  const [error, setError] = useState<string | null>(null)
  const [successData, setSuccessData] = useState<{user: any, token: string} | null>(null)

  // Diagnóstico: Verificar si el componente llega a montarse
  console.log("--- OAuthCallbackPage MOUNTED --- URL:", window.location.href);

  useEffect(() => {
    // Si ya procesamos el login, no hacemos nada (evita bucles)
    if (processedRef.current) return
    processedRef.current = true

    const authenticate = () => {
      const token = searchParams.get('token')
      const errorParam = searchParams.get('error')
      console.log("OAuth Callback - Params:", { token: !!token, error: errorParam })
      
      if (errorParam) {
        setError(decodeURIComponent(errorParam))
        return
      }

      const userId = searchParams.get('userId')
      const username = searchParams.get('username')
      const email = searchParams.get('email')

      if (token) {
        localStorage.setItem('token', token)
        if (userId) localStorage.setItem('userId', userId)
        if (username) localStorage.setItem('username', username)
        if (email) localStorage.setItem('email', email)
        
        const user = { 
          id: userId || '0', 
          username: username || 'User', 
          email: email || '' 
        }
        console.log("Auth success. Setting user:", user)
        // Guardamos en estado global y local
        setAuth(user, token)     
        // En lugar de redirigir, mostramos éxito
        setSuccessData({ user, token })
      } else {
        console.error("Auth failed: No token found in URL")
        // Si falta algún dato, consideramos que el auth falló
        setError('Authentication failed: No token found in URL')
      }
    }
    authenticate()
  }, [searchParams, navigate, setAuth])

  if (successData) {
    return (
      <AuthCard maxWidth={360}>
        <div style={{ textAlign: 'center', padding: '24px 0' }}>
          <OrbitIcon size={44} />
          <h2 style={{ fontSize: 18, fontWeight: 600, color: '#4CAF50', margin: '16px 0 8px' }}>
            Login Successful
          </h2>
          <p style={{ fontSize: 13, color: '#8C6A3E', marginBottom: 24 }}>
            Welcome back, <span style={{color: '#C6A15B', fontWeight: 600}}>{successData.user.username}</span>
          </p>
          
          <div style={{ padding: '0 20px' }}>
             <AuthButton 
                onClick={() => navigate('/app', { replace: true })}
             >
               Go to Dashboard
             </AuthButton>
          </div>
        </div>
      </AuthCard>
    )
  }

  if (error) {
    return (
      <AuthCard maxWidth={360}>
        <div style={{ textAlign: 'center', padding: '24px 0' }}>
          <h2 style={{ fontSize: 18, fontWeight: 600, color: '#e57373', marginBottom: 12 }}>
            Authentication Failed
          </h2>
          <p style={{ fontSize: 13, color: '#8C6A3E', marginBottom: 24, padding: '0 10px' }}>
            {error}
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
             <AuthButton type="button" onClick={() => window.location.reload()}>Retry</AuthButton>
             <AuthButton type="button" onClick={() => navigate('/login')}>Back to Login</AuthButton>
          </div>
        </div>
      </AuthCard>
    )
  }

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