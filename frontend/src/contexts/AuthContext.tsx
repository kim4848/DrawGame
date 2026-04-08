import { createContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import { checkSession, logout as apiLogout, login as apiLogin, register as apiRegister } from '../api';
import type { AuthResponse, LoginRequest, RegisterRequest, LoginResponse } from '../api';

export interface AuthContextType {
  user: AuthResponse | null;
  loading: boolean;
  isAuthenticated: boolean;
  login: (data: LoginRequest) => Promise<LoginResponse>;
  register: (data: RegisterRequest) => Promise<LoginResponse>;
  logout: () => void;
  refreshSession: () => Promise<void>;
}

// eslint-disable-next-line react-refresh/only-export-components
export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthResponse | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshSession = async () => {
    try {
      const userData = await checkSession();
      setUser(userData);
    } catch {
      setUser(null);
    }
  };

  useEffect(() => {
    let active = true;
    checkSession()
      .then(userData => { if (active) setUser(userData); })
      .catch(() => { if (active) setUser(null); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const login = async (data: LoginRequest): Promise<LoginResponse> => {
    const response = await apiLogin(data);
    localStorage.setItem('authToken', response.token);
    localStorage.setItem('userId', response.user.id);
    localStorage.setItem('userDisplayName', response.user.displayName);
    // Update auth state immediately after login
    await refreshSession();
    return response;
  };

  const register = async (data: RegisterRequest): Promise<LoginResponse> => {
    const response = await apiRegister(data);
    localStorage.setItem('authToken', response.token);
    localStorage.setItem('userId', response.user.id);
    localStorage.setItem('userDisplayName', response.user.displayName);
    // Update auth state immediately after registration
    await refreshSession();
    return response;
  };

  const logout = () => {
    apiLogout();
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isAuthenticated: !!user,
        login,
        register,
        logout,
        refreshSession,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
