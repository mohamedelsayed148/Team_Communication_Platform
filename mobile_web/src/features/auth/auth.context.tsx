import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

import {
  loginUser,
  registerUser,
  refreshUserSession,
  logoutUser,
} from "./auth.api";

import { updateMyProfile } from "./profile.api";
import type { UpdateProfileRequest } from "./profile.api";

import { saveTokens, getRefreshToken, clearTokens } from "./token-storage";

import type { AuthUser, LoginRequest, RegisterRequest } from "./auth.types";

import { setSessionExpiredListener } from "./auth-session-events";

interface AuthContextType {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (credentials: LoginRequest) => Promise<void>;
  register: (userData: RegisterRequest) => Promise<void>;
  updateProfile: (profileData: UpdateProfileRequest) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    restoreSession();
  }, []);

  useEffect(() => {
    setSessionExpiredListener(() => {
      setUser(null);
    });

    return () => {
      setSessionExpiredListener(null);
    };
  }, []);

  async function restoreSession() {
    try {
      const refreshToken = await getRefreshToken();

      if (!refreshToken) {
        return;
      }

      const response = await refreshUserSession(refreshToken);

      await saveTokens(response.data.accessToken, response.data.refreshToken);

      setUser(response.data.user);
    } catch (error) {
      console.log("Session restoration failed:", error);

      await clearTokens();
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }

  async function login(credentials: LoginRequest) {
    const response = await loginUser(credentials);

    await saveTokens(response.data.accessToken, response.data.refreshToken);

    setUser(response.data.user);
  }

  async function register(userData: RegisterRequest) {
    const response = await registerUser(userData);

    await saveTokens(response.data.accessToken, response.data.refreshToken);

    setUser(response.data.user);
  }

  async function updateProfile(profileData: UpdateProfileRequest) {
    const response = await updateMyProfile(profileData);
    setUser(response.data);
  }

  async function logout() {
    try {
      const refreshToken = await getRefreshToken();

      if (refreshToken) {
        await logoutUser(refreshToken);
      }
    } catch (error) {
      console.log("Backend logout failed:", error);
    } finally {
      await clearTokens();
      setUser(null);
    }
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: user !== null,
        isLoading,
        login,
        register,
        logout,
        updateProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }

  return context;
}
