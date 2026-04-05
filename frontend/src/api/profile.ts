const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080'

function authHeaders(): Record<string, string> {
  const token = localStorage.getItem('token')
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }
}

export interface ProfileData {
  id: string
  email: string
  username: string
  createdAt: string | null
  updatedAt: string | null
}

export interface UpdateProfilePayload {
  username?: string
  currentPassword?: string
  newPassword?: string
}

export async function getProfile(): Promise<ProfileData> {
  const res = await fetch(`${BASE_URL}/api/profile/me`, { headers: authHeaders() })
  if (!res.ok) throw new Error(`${res.status}`)
  return res.json()
}

export async function updateProfile(payload: UpdateProfilePayload): Promise<ProfileData> {
  const res = await fetch(`${BASE_URL}/api/profile/me`, {
    method: 'PUT',
    headers: authHeaders(),
    body: JSON.stringify(payload),
  })
  if (!res.ok) {
    const msg = await res.text()
    throw new Error(msg || `${res.status}`)
  }
  return res.json()
}

export async function deleteAccount(): Promise<void> {
  const res = await fetch(`${BASE_URL}/api/profile/me`, {
    method: 'DELETE',
    headers: authHeaders(),
  })
  if (!res.ok) throw new Error(`${res.status}`)
}
