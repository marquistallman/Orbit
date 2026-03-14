const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8080";

export interface User {
  id: string;
  username: string;
  email: string;
  bio?: string;
  avatar?: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

// ─── LOGIN ───────────────────────────────────────────
export const loginRequest = async (
  email: string,
  password: string
): Promise<AuthResponse> => {
  // REAL:
  const res = await fetch(`${BASE_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.message || "Credenciales inválidas");
  }
  const responseData = await res.json();
  // Mapeo: El backend devuelve 'userDto', pero el frontend espera 'user'.
  const authResponse: AuthResponse = { token: responseData.token, user: responseData.userDto };
  return authResponse;
};

// ─── REGISTER ────────────────────────────────────────
export const registerRequest = async (
  name: string,
  email: string,
  password: string
): Promise<AuthResponse> => {
  // REAL:
  const res = await fetch(`${BASE_URL}/api/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username: name, email, password }),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.message || "Error al registrar");
  }
  const responseData = await res.json();
  // Mapeo: El backend devuelve 'userDto', pero el frontend espera 'user'.
  const authResponse: AuthResponse = { token: responseData.token, user: responseData.userDto };
  return authResponse;
};

// ─── UPDATE PROFILE ───────────────────────────────────
export const updateProfileRequest = async (
  data: Partial<User>
): Promise<User> => {
  // MOCK
  await new Promise((r) => setTimeout(r, 800));
  return { id: "1", username: "Luis Carlos", email: "test@test.com", ...data };

  // REAL:
  // const token = localStorage.getItem("token");
  // const res = await fetch(`${BASE_URL}/api/auth/me`, {
  //   method: "PUT",
  //   headers: {
  //     "Content-Type": "application/json",
  //     Authorization: `Bearer ${token}`,
  //   },
  //   body: JSON.stringify(data),
  // });
  // if (!res.ok) throw new Error("Error al actualizar perfil");
  // return res.json();
};