
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { account, teams, ID } from '../services/appwrite';
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
    let mounted = true;
    
    const checkSession = async () => {
      try {
        const currentUser = await account.get();
        if (!mounted) return;
        
        console.log('Current User ID:', currentUser.$id);
        
        // Check if user is an admin via labels or team membership
        let adminStatus = currentUser.labels?.includes('admin') || false;
        
        if (!adminStatus) {
          try {
            // teams.list() is a safe call that returns only the user's teams
            const userTeams = await teams.list();
            adminStatus = userTeams.teams.some(t => t.$id === 'admin' || t.name.toLowerCase() === 'admin');
          } catch {
            // Silently fail for non-admin users or if teams service is unavailable
            adminStatus = false;
          }
        }
        
        setUser({ ...currentUser, isAdmin: adminStatus });
        setIsAdmin(adminStatus);
      } catch (err: any) {
        if (!mounted) return;
        // Only log if it's not a 401 (which just means no session)
        if (err?.code !== 401) {
          console.error('Session check failed:', err);
        }
        setUser(null);
        setIsAdmin(false);
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    };
    
    checkSession();
    
    return () => {
      mounted = false;
    };
  }, []);

  const login = async (email: string, pass: string) => {
    try {
      await account.createEmailPasswordSession(email, pass);
      const currentUser = await account.get();
      console.log('✅ Login successful - User:', currentUser.$id, 'Email:', currentUser.email);
      
      // Check if user is an admin via labels or team membership
      let adminStatus = currentUser.labels?.includes('admin') || false;
      
      if (!adminStatus) {
        try {
          const userTeams = await teams.list();
          adminStatus = userTeams.teams.some(t => t.$id === 'admin' || t.name.toLowerCase() === 'admin');
        } catch {
          adminStatus = false;
        }
      }
      
      console.log('🔐 Admin Status:', adminStatus);
      const userWithAdmin = { ...currentUser, isAdmin: adminStatus };
      console.log('👤 Setting user state:', userWithAdmin);
      
      setUser(userWithAdmin);
      setIsAdmin(adminStatus);
      
      await new Promise(resolve => setTimeout(resolve, 100));
      console.log('🚀 Login state update complete');
    } catch (error) {
      console.error('❌ Login failed:', error);
      throw error;
    }
  };

  const register = async (name: string, email: string, pass: string) => {
    const userId = ID.unique();
    await account.create(userId, email, pass, name);
    await account.createEmailPasswordSession(email, pass);
    
    const currentUser = await account.get();
    
    // New users are not admins by default
    let adminStatus = currentUser.labels?.includes('admin') || false;
    
    setUser({ ...currentUser, isAdmin: adminStatus });
    setIsAdmin(adminStatus);
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
