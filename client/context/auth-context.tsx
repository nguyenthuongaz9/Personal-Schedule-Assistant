'use client';

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
  useCallback,
  useMemo,
} from 'react';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/axios-client';
import { User } from '@/types';
import { ApiResponse, AuthResponse, LoginCredentials, RegisterCredentials } from '@/types/api';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  login: (credentials: LoginCredentials) => Promise<ApiResponse<AuthResponse>>;
  register: (credentials: RegisterCredentials) => Promise<ApiResponse<AuthResponse>>;
  logout: () => Promise<void>;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  console.log(isAuthenticated)
  
 
  useEffect(() => {
    const initializeAuth = () => {
      try {
        
        const userStr = localStorage.getItem('user');
        const token = localStorage.getItem('access_token');

        if (userStr && token) {
          const parsedUser = JSON.parse(userStr);
          setUser(parsedUser);
          setIsAuthenticated(true);
        }
      } catch (err) {
        console.error('Auth initialization error:', err);
        
        apiClient.clearTokens();
      } finally {
        setIsLoading(false);
      }
    };


    initializeAuth();
  }, []) 

  const login = useCallback(async (
    credentials: LoginCredentials
  ): Promise<ApiResponse<AuthResponse>> => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await apiClient.login(credentials);

      if (response.success && response.data) {
       
        setUser(response.data.user);
        setIsAuthenticated(true);
        
       
        router.push('/');
      } else {
        setError(response.message || 'Đăng nhập thất bại');
      }

      return response;
    } catch (err: any) {
      const errorMsg = err.message || 'Đăng nhập thất bại';
      setError(errorMsg);
      return {
        success: false,
        message: errorMsg,
        data: null as any,
      };
    } finally {
      setIsLoading(false);
    }
  }, [router]);

  const register = useCallback(async (
    credentials: RegisterCredentials
  ): Promise<ApiResponse<AuthResponse>> => {
    setIsLoading(true);
    setError(null);

    try {
      
      const {...registerData } = credentials;
      
      const response = await apiClient.register(registerData);

      if (response.success && response.data) {
        
        setUser(response.data.user);
        setIsAuthenticated(true);
          
        router.push('/');
      } else {
        setError(response.message || 'Đăng ký thất bại');
      }

      return response;
    } catch (err: any) {
      const errorMsg = err.message || 'Đăng ký thất bại';
      setError(errorMsg);
      return {
        success: false,
        message: errorMsg,
        data: null as any,
      };
    } finally {
      setIsLoading(false);
    }
  }, [router]);

  const logout = useCallback(async () => {
    try {
      setIsLoading(true);
      await apiClient.logout();
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
    
      setUser(null);
      setIsAuthenticated(false);
      setError(null);
      setIsLoading(false);
      
      
      router.push('/auth/login');
    }
  }, [router]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const contextValue = useMemo<AuthContextType>(
    () => ({
      user,
      isAuthenticated,
      isLoading,
      error,
      login,
      register,
      logout,
      clearError,
    }),
    [user, isAuthenticated, isLoading, error, login, register, logout, clearError]
  );

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  
  return context;
};