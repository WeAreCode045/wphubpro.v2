
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { account, ID } from '../services/appwrite';
import { AppwriteException, Models } from 'appwrite';
import { User } from '../types';

interface AuthContextType {
  user: User | null;
  login: (email: string, pass: string) => Promise<void>;
  register: (name: string, email: string, pass: string) => Promise<void>;
  logout: () => Promise<void>;
  isLoading: boolean;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkSession = async () => {
      try {
        const currentUser = await account.get();
        setUser(currentUser);
      } catch (error) {
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };
    checkSession();
  }, []);

  const login = async (email: string, pass: string) => {
    await account.createEmailPasswordSession(email, pass);
    const currentUser = await account.get();
    setUser(currentUser);
  };

  const register = async (name: string, email: string, pass: string) => {
    await account.create(ID.unique(), email, pass, name);
    await account.createEmailPasswordSession(email, pass);
    const currentUser = await account.get();
    setUser(currentUser);
  };

  const logout = async () => {
    await account.deleteSession('current');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, register, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
};

// FIX: Moved useAuth hook here and exported it to be available for other components.
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
