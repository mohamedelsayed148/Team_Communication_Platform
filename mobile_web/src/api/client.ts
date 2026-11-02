import axios, { AxiosError, InternalAxiosRequestConfig } from "axios";

import {
  getAccessToken,
  getRefreshToken,
  saveTokens,
  clearTokens,
} from "@/src/features/auth/token-storage";

import { refreshUserSession } from "@/src/features/auth/auth-refresh.api";
import { notifySessionExpired } from "@/src/features/auth/auth-session-events";

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL;

if (!API_BASE_URL) {
  throw new Error("EXPO_PUBLIC_API_URL is not configured");
}

// Track whether a request has already been retried.
declare module "axios" {
  interface InternalAxiosRequestConfig {
    _retry?: boolean;
  }
}

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: {
    "Content-Type": "application/json",
    "x-client-type": "mobile",
  },
});

// Shared refresh promise prevents duplicate refresh requests.
let refreshPromise: Promise<string> | null = null;

// Attach the access token to outgoing requests.
apiClient.interceptors.request.use(async (config) => {
  const accessToken = await getAccessToken();

  if (accessToken) {
    config.headers.set("Authorization", `Bearer ${accessToken}`);
  }

  return config;
});

// Refresh the session and return the new access token.
async function refreshAccessToken(): Promise<string> {
  const refreshToken = await getRefreshToken();

  if (!refreshToken) {
    await clearTokens();
    notifySessionExpired();
    throw new Error("No refresh token available");
  }

  try {
    const response = await refreshUserSession(refreshToken);

    await saveTokens(response.data.accessToken, response.data.refreshToken);

    return response.data.accessToken;
  } catch (error) {
    const status = (error as AxiosError).response?.status;

    // Only expire the local session when the backend rejects
    // the refresh token. Network/server errors should not
    // automatically destroy a potentially valid session.
    if (status === 401 || status === 403) {
      await clearTokens();
      notifySessionExpired();
    }

    throw error;
  }
}

// Handle expired access tokens.
apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config;

    if (!originalRequest || error.response?.status !== 401) {
      return Promise.reject(error);
    }

    // Never retry authentication endpoints or an already retried request.
    const url = originalRequest.url ?? "";

    const isAuthEndpoint =
      url.includes("/auth/login") ||
      url.includes("/auth/register") ||
      url.includes("/auth/refresh") ||
      url.includes("/auth/logout");

    if (isAuthEndpoint || originalRequest._retry) {
      return Promise.reject(error);
    }

    originalRequest._retry = true;

    try {
      if (!refreshPromise) {
        refreshPromise = refreshAccessToken().finally(() => {
          refreshPromise = null;
        });
      }

      const newAccessToken = await refreshPromise;

      originalRequest.headers.set("Authorization", `Bearer ${newAccessToken}`);

      return apiClient(originalRequest);
    } catch (refreshError) {
      return Promise.reject(refreshError);
    } finally {
      // Only clear the promise after the shared refresh operation finishes.
      if (refreshPromise) {
        refreshPromise = null;
      }
    }
  },
);

export default apiClient;
