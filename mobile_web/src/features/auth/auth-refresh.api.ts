import axios from "axios";
import type { AuthResponse } from "./auth.types";

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL;

if (!API_BASE_URL) {
  throw new Error("EXPO_PUBLIC_API_URL is not configured");
}

// Separate Axios instance: it has no authentication interceptors.
const refreshClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: {
    "Content-Type": "application/json",
    "x-client-type": "mobile",
  },
});

export async function refreshUserSession(
  refreshToken: string,
): Promise<AuthResponse> {
  const response = await refreshClient.post<AuthResponse>("/auth/refresh", {
    refreshToken,
  });

  return response.data;
}
