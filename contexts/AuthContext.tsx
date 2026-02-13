
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { account, ID, functions, databases, DATABASE_ID, COLLECTIONS } from '../services/appwrite';
import { AppwriteException, Models, Query } from 'appwrite';
import { User } from '../types';

interface AuthContextType {
  user: User | null;
  isAdmin: boolean;
  login: (email: string, pass: string) => Promise<void>;
  register: (name: string, email: string, pass: string) => Promise<void>;
  logout: () => Promise<void>;
  isLoading: boolean;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkSession = async () => {
      try {
        const currentUser = await account.get();
        console.log('Current User Labels:', currentUser.labels); // Debug log for the user
        const adminStatus = currentUser.labels?.some(l => 
          l.toLowerCase() === 'admin' || l.toLowerCase() === 'administrator'
        ) || false;
        setUser({ ...currentUser, isAdmin: adminStatus });
        setIsAdmin(adminStatus);
      } catch (error) {
        setUser(null);
        setIsAdmin(false);
      } finally {
        setIsLoading(false);
      }
    };
    checkSession();
  }, []);

  const login = async (email: string, pass: string) => {
    await account.createEmailPasswordSession(email, pass);
    const currentUser = await account.get();
    console.log('Login User Labels:', currentUser.labels); // Debug log for the user
    const adminStatus = currentUser.labels?.some(l => 
      l.toLowerCase() === 'admin' || l.toLowerCase() === 'administrator'
    ) || false;
    setUser({ ...currentUser, isAdmin: adminStatus });
    setIsAdmin(adminStatus);
  };

  const register = async (name: string, email: string, pass: string) => {
    await account.create(ID.unique(), email, pass, name);
    await account.createEmailPasswordSession(email, pass);
    
    try {
      const currentUser = await account.get();
      await functions.createExecution('set-admin', JSON.stringify({ userId: currentUser.$id }));
      
      // Give the function a moment and re-fetch
      await new Promise(resolve => setTimeout(resolve, 1500));
      const updatedUser = await account.get();
      console.log('Post-Register User Labels:', updatedUser.labels);
      const adminStatus = updatedUser.labels?.some(l => 
        l.toLowerCase() === 'admin' || l.toLowerCase() === 'administrator'
      ) || false;
      setUser({ ...updatedUser, isAdmin: adminStatus });
      setIsAdmin(adminStatus);
    } catch (e) {
      console.warn('set-admin function call failed', e);
      const currentUser = await account.get();
      const adminStatus = currentUser.labels?.some(l => 
        l.toLowerCase() === 'admin' || l.toLowerCase() === 'administrator'
      ) || false;
      setUser({ ...currentUser, isAdmin: adminStatus });
      setIsAdmin(adminStatus);
    }
  };

  const logout = async () => {
    await account.deleteSession('current');
    setUser(null);
    setIsAdmin(false);
  };

  return (
    <AuthContext.Provider value={{ user, isAdmin, login, register, logout, isLoading }}>
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
