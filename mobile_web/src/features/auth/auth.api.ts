import apiClient from "@/src/api/client";

import { AuthResponse, LoginRequest, RegisterRequest } from "./auth.types";

export { refreshUserSession } from "./auth-refresh.api";

export async function loginUser(
  credentials: LoginRequest,
): Promise<AuthResponse> {
  const response = await apiClient.post<AuthResponse>(
    "/auth/login",
    credentials,
  );

  return response.data;
}

export async function registerUser(
  userData: RegisterRequest,
): Promise<AuthResponse> {
  const response = await apiClient.post<AuthResponse>(
    "/auth/register",
    userData,
  );

  return response.data;
}

export async function logoutUser(refreshToken: string): Promise<void> {
  await apiClient.post("/auth/logout", {
    refreshToken,
  });
}
