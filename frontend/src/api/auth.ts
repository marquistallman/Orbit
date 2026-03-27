const BASE_URL = 'http://localhost:8080'

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

export const loginRequest = async (email: string, password: string): Promise<AuthResponse> => {
  const res = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  })
  if (!res.ok) {
    const err = await res.text()
    throw new Error(err || 'Credenciales inválidas')
  }
  return res.json()
}

export const registerRequest = async (username: string, email: string, password: string): Promise<AuthResponse> => {
  const res = await fetch(`${BASE_URL}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, email, password }),
  })
  if (!res.ok) {
    const err = await res.text()
    throw new Error(err || 'Error al crear cuenta')
  }
  return res.json()
}

export const getMeRequest = async (): Promise<User> => {
  const token = localStorage.getItem('token')
  const res = await fetch(`${BASE_URL}/api/auth/me`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) throw new Error('Unauthorized')
  return res.json()
}

export const logoutRequest = async (): Promise<void> => {
  // Spring Boot es stateless con JWT — el logout es solo del lado del cliente
}
