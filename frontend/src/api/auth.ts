const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";

export interface User {
  id: string;
  name: string;
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
  // MOCK — reemplazar cuando el backend esté listo
  await new Promise((r) => setTimeout(r, 1000));
  if (email === "test@test.com" && password === "123456") {
    return {
      token: "mock-jwt-token-xyz",
      user: { id: "1", name: "Luis Carlos", email },
    };
  }
  throw new Error("Credenciales inválidas");

  // REAL — descomentar cuando el backend esté listo:
  // const res = await fetch(`${BASE_URL}/api/auth/login`, {
  //   method: "POST",
  //   headers: { "Content-Type": "application/json" },
  //   body: JSON.stringify({ email, password }),
  // });
  // if (!res.ok) throw new Error("Credenciales inválidas");
  // return res.json();
};

// ─── REGISTER ────────────────────────────────────────
export const registerRequest = async (
  name: string,
  email: string,
  password: string
): Promise<AuthResponse> => {
  // MOCK
  await new Promise((r) => setTimeout(r, 1000));
  return {
    token: "mock-jwt-token-xyz",
    user: { id: "2", name, email },
  };

  // REAL:
  // const res = await fetch(`${BASE_URL}/api/auth/register`, {
  //   method: "POST",
  //   headers: { "Content-Type": "application/json" },
  //   body: JSON.stringify({ name, email, password }),
  // });
  // if (!res.ok) throw new Error("Error al registrar");
  // return res.json();
};

// ─── UPDATE PROFILE ───────────────────────────────────
export const updateProfileRequest = async (
  data: Partial<User>
): Promise<User> => {
  // MOCK
  await new Promise((r) => setTimeout(r, 800));
  return { id: "1", name: "Luis Carlos", email: "test@test.com", ...data };

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