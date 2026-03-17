import type { User } from '../store/authStore'

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001'

export interface AuthResponse {
  token: string
  user: User
}

export const loginRequest = async (email: string, password: string): Promise<AuthResponse> => {
  // MOCK — reemplazar cuando el backend esté listo
  await new Promise(r => setTimeout(r, 1200))
  if (email === 'test@test.com' && password === '123456') {
    return { token: 'mock-token-xyz', user: { id: '1', name: 'Luis Carlos', email } }
  }
  throw new Error('Credenciales inválidas')

  // REAL:
  // const res = await fetch(`${BASE_URL}/api/auth/login`, {
  //   method: 'POST',
  //   headers: { 'Content-Type': 'application/json' },
  //   body: JSON.stringify({ email, password }),
  // })
  // if (!res.ok) throw new Error('Credenciales inválidas')
  // return res.json()
}

export const registerRequest = async (name: string, email: string, password: string): Promise<AuthResponse> => {
  await new Promise(r => setTimeout(r, 1200))
  return { token: 'mock-token-xyz', user: { id: '2', name, email } }
  // REAL:
  // const res = await fetch(`${BASE_URL}/api/auth/register`, {
  //   method: 'POST',
  //   headers: { 'Content-Type': 'application/json' },
  //   body: JSON.stringify({ name, email, password }),
  // })
  // if (!res.ok) throw new Error('Error al registrar')
  // return res.json()
}

export const updateProfileRequest = async (data: Partial<User>): Promise<User> => {
  await new Promise(r => setTimeout(r, 800))
  return { id: '1', name: '', email: '', ...data }
  // REAL:
  // const token = localStorage.getItem('orbit-auth')
  // const res = await fetch(`${BASE_URL}/api/auth/me`, {
  //   method: 'PUT',
  //   headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
  //   body: JSON.stringify(data),
  // })
  // if (!res.ok) throw new Error('Error al actualizar')
  // return res.json()
}