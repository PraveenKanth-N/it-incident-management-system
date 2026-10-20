import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { 
  authApi, 
  getStoredToken, 
  getStoredUser, 
  clearStoredSession, 
  onUnauthorized,
  type UserSummaryDto 
} from '../services/api';

export interface AuthContextType {
  user: UserSummaryDto | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  authError: string | null;
  login: (username: string, password: string, rememberMe?: boolean) => Promise<boolean>;
  register: (payload: { username: string; email: string; password: string; fullName: string; department?: string }, rememberMe?: boolean) => Promise<boolean>;
  logout: () => void;
  clearError: () => void;
  hasRole: (allowedRoles: string[]) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserSummaryDto | null>(() => getStoredUser());
  const [token, setToken] = useState<string | null>(() => getStoredToken());
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [authError, setAuthError] = useState<string | null>(null);

  const clearError = useCallback(() => {
    setAuthError(null);
  }, []);

  const logout = useCallback(() => {
    clearStoredSession();
    setUser(null);
    setToken(null);
    setAuthError(null);
  }, []);

  // Subscribe to automatic 401 unauthorized events from api interceptor
  useEffect(() => {
    const unsubscribe = onUnauthorized(() => {
      logout();
      setAuthError('Session expired. Please sign in again.');
    });
    return unsubscribe;
  }, [logout]);

  // Initial token verification against real backend /api/v1/users/me
  useEffect(() => {
    let active = true;
    const verifySession = async () => {
      const storedToken = getStoredToken();
      if (!storedToken) {
        if (active) {
          setUser(null);
          setToken(null);
          setIsLoading(false);
        }
        return;
      }

      try {
        const freshUser = await authApi.getCurrentUser();
        if (active) {
          setUser(freshUser);
          setToken(storedToken);
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : '';
        // If network unreachable but valid unexpired token stored, keep cached user
        if (msg.includes('Cannot connect to backend')) {
          const cachedUser = getStoredUser();
          if (active && cachedUser) {
            setUser(cachedUser);
            setToken(storedToken);
          }
        } else {
          // Bad or expired token: clear session completely
          if (active) {
            clearStoredSession();
            setUser(null);
            setToken(null);
          }
        }
      } finally {
        if (active) setIsLoading(false);
      }
    };

    verifySession();
    return () => {
      active = false;
    };
  }, []);

  const login = async (username: string, password: string, rememberMe: boolean = false): Promise<boolean> => {
    setIsLoading(true);
    setAuthError(null);

    try {
      const authData = await authApi.login({ username, password, rememberMe });
      setUser(authData.user);
      setToken(authData.token);
      return true;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Authentication failed';
      setAuthError(message);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (
    payload: { username: string; email: string; password: string; fullName: string; department?: string },
    rememberMe: boolean = false
  ): Promise<boolean> => {
    setIsLoading(true);
    setAuthError(null);

    try {
      const authData = await authApi.register(payload, rememberMe);
      setUser(authData.user);
      setToken(authData.token);
      return true;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Registration failed';
      setAuthError(message);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const hasRole = useCallback((allowedRoles: string[]): boolean => {
    if (!user || !user.role) return false;
    return allowedRoles.includes(user.role);
  }, [user]);

  const value: AuthContextType = {
    user,
    token,
    isAuthenticated: !!token && !!user,
    isLoading,
    authError,
    login,
    register,
    logout,
    clearError,
    hasRole
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;
