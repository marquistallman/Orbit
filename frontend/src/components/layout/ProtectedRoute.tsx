import { Navigate } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'
import { useEffect } from 'react'
import type { ReactNode } from 'react'

export default function ProtectedRoute({ children }: { children: ReactNode }) {
  const isAuthenticated = useAuthStore(s => s.isAuthenticated)
  const setAuth = useAuthStore(s => s.setAuth)
  
  // Sincronizar con localStorage en caso de que el token esté guardado pero el store no
  useEffect(() => {
    const token = localStorage.getItem('token')
    if (token && !isAuthenticated) {
      // El token existe en localStorage pero el store no está sincronizado
      // Obtener el usuario desde los parámetros guardados
      const userId = localStorage.getItem('userId')
      const username = localStorage.getItem('username') || 'User'
      const email = localStorage.getItem('email') || ''
      
      setAuth(
        { id: userId || '0', username, email },
        token
      )
    }
  }, [isAuthenticated, setAuth])
  
  const hasToken = localStorage.getItem('token')
  const isReady = isAuthenticated || hasToken
  
  if (!isReady) return <Navigate to="/" replace />
  return <>{children}</>
}
