import { apiClient } from "@/lib/api/client";

export type AuthUser = {
  id: number;
  email: string;
  name: string | null;
  created_at?: string;
};

export type RegisterPayload = {
  name: string;
  email: string;
  password: string;
};

export type LoginPayload = {
  email: string;
  password: string;
};

export type LoginResponse = {
  access_token: string;
  token_type: string;
  user: AuthUser;
};

export async function register(payload: RegisterPayload) {
  const response = await apiClient.post<AuthUser>("/register", payload);
  return response.data;
}

export async function login(payload: LoginPayload) {
  const response = await apiClient.post<LoginResponse>("/login", payload);
  return response.data;
}

export async function getCurrentUser() {
  const response = await apiClient.get<AuthUser>("/me");
  return response.data;
}

export async function updateProfile(payload: { name?: string; email?: string }) {
  const response = await apiClient.put<AuthUser>("/me", payload);
  return response.data;
}

export async function changePassword(payload: {
  current_password: string;
  new_password: string;
}) {
  await apiClient.put("/password", payload);
}
