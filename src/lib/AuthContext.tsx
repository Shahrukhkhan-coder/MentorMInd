import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, onAuthStateChanged, signInWithPopup, GoogleAuthProvider, signOut } from 'firebase/auth';
import { auth } from './firebase';
import { UserProfile, UserRole } from '../types';
import { dbService } from '../services/dbService';

export const ADMIN_EMAIL = 'shah.rukh1122112211@gmail.com';

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  isAdmin: boolean;
  effectiveRole: UserRole;
  activePortal: UserRole;
  setActivePortal: (portal: UserRole) => void;
  signIn: () => Promise<void>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [activePortal, setActivePortal] = useState<UserRole>('student');

  const isAdmin = Boolean(user?.email && user.email.toLowerCase() === ADMIN_EMAIL.toLowerCase());
  const effectiveRole: UserRole = isAdmin ? 'admin' : (profile?.role || 'student');

  const syncInitialPortal = (u: User | null, p: UserProfile | null) => {
    if (!u) {
      setActivePortal('student');
      return;
    }
    if (u.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase()) {
      setActivePortal('admin');
    } else if (p?.role === 'teacher') {
      setActivePortal('teacher');
    } else {
      setActivePortal('student');
    }
  };

  const refreshProfile = async () => {
    if (user) {
      const p = await dbService.getUserProfile(user.uid);
      setProfile(p);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      try {
        if (u) {
          const p = await dbService.getUserProfile(u.uid);
          setProfile(p);
          syncInitialPortal(u, p);
        } else {
          setProfile(null);
          syncInitialPortal(null, null);
        }
      } catch (err) {
        console.error('Failed to load user profile:', err);
        setProfile(null);
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const signIn = async () => {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    await signInWithPopup(auth, provider);
  };

  const logout = async () => {
    await signOut(auth);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        loading,
        isAdmin,
        effectiveRole,
        activePortal,
        setActivePortal,
        signIn,
        logout,
        refreshProfile,
      }}
    >
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
