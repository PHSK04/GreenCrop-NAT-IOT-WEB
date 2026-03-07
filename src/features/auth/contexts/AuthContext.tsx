import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, authService, SocialLoginPayload } from '../services/authService';
import { toast } from 'sonner';

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  logout: () => void;
  isLoading: boolean;
  updateProfile: (data: Partial<User>) => Promise<void>;
  socialLogin: (provider: string, payload?: SocialLoginPayload) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Always require login when opening the web app.
    setUser(null);
    setIsLoading(false);
  }, []);

  const login = async (email: string, password: string) => {
    try {
      const user = await authService.login(email, password);
      setUser(user);
      toast.success(`Welcome back, ${user.name}`);
    } catch (error: any) {
      toast.error("Login Failed", { description: error.message });
      throw error;
    }
  };

  const register = async (email: string, password: string, name: string) => {
    try {
      const user = await authService.register(email, password, name);
      setUser(user);
      toast.success("Account Created", { description: "Welcome to Smart IoT Farm!" });
    } catch (error: any) {
      toast.error("Registration Failed", { description: error.message });
      throw error;
    }
  };

  const logout = () => {
    authService.logout();
    setUser(null);
    toast.info("Logged Out");
  };

  const updateProfile = async (data: Partial<User>) => {
    if (!user) return;
    try {
      await authService.updateUser(user.id, data);
      setUser({ ...user, ...data });
      toast.success("Profile Updated");
    } catch (error: any) {
      toast.error("Update Failed", { description: error.message });
      throw error;
    }
  };

  const socialLogin = async (provider: string, payload: SocialLoginPayload = {}) => {
    try {
        const user = await authService.socialLogin(provider, payload);
        setUser(user);
        toast.success(`Welcome via ${provider}`, { description: `Logged in as ${user.name}` });
    } catch (error: any) {
        toast.error(`${provider} Login Failed`, { description: error.message });
        throw error;
    }
  };

  return (
    <AuthContext.Provider value={{ user, login, register, logout, isLoading, updateProfile, socialLogin }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
