const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:12001'

export interface User {
  id: string
  username: string
  email: string
  bio?: string
  avatar?: string
}

export interface AuthResponse {
  token: string
  user: User
}

/**
 * Inicia el flujo de Auth0.
 * Redirige al orquestador (Spring Boot) para que maneje el apretón de manos.
 */
export const loginWithAuth0 = () => {
  window.location.href = `${BASE_URL}/oauth2/authorization/auth0`;
}

/**
 * Obtiene el perfil del usuario actual.
 * El token enviado es el JWT de Auth0 que el backend validará contra los issuers oficiales.
 */
export const getMeRequest = async (): Promise<User> => {
  const token = localStorage.getItem('token')
  if (!token) throw new Error('No token found')

  const res = await fetch(`${BASE_URL}/api/auth/me`, {
    headers: { 
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
  })
  
  if (!res.ok) {
    localStorage.removeItem('token')
    throw new Error('Unauthorized')
  }
  return res.json()
}

/**
 * Cierra la sesión localmente.
 * TODO: Mañana evaluar si se requiere redirección al endpoint /v2/logout de Auth0
 */
export const logoutRequest = () => {
  localStorage.removeItem('token')
  // window.location.href = `${BASE_URL}/logout`; // Si el backend maneja el invalidate de Auth0
}

// Mantenemos registerRequest solo para compatibilidad de tipos si otros componentes lo usan
export const registerRequest = async (username: string, email: string, password: string): Promise<AuthResponse> => {
    throw new Error('Registro manual deshabilitado. Use loginWithAuth0.');
}