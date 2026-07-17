import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  signInWithPopup, 
  signOut 
} from 'firebase/auth';

import { auth, googleProvider, isFirebaseConfigured } from '../utils/firebase.js';
import { useNotification } from './NotificationContext.js';

interface UserProfile {
  name: string;
  phone?: string | null;
  address?: string | null;
  occupation?: string | null;
  onboardingCompleted: boolean;
  openingBalancesSetup: boolean;
  avatarUrl?: string | null;
}

interface User {
  id: string;
  username: string;
  email: string;
  profile: UserProfile;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isAuthenticated: boolean;
  token: string | null;
  firebaseActive: boolean;
  loginLocal: (username: string, password: string) => Promise<void>;
  registerLocal: (name: string, username: string, email: string, phone: string, password: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  completeOnboarding: (data: {
    profile: { name: string; phone?: string; address?: string; occupation?: string };
    wallets: { cash: number; bank: number; esewa: number };
    routines: Record<string, string[]>;
  }) => Promise<void>;
  deleteAccount: () => Promise<void>;
  updateProfileState: (profile: UserProfile) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
  const [loading, setLoading] = useState(true);
  const { showToast } = useNotification();

  const firebaseActive = isFirebaseConfigured;

  // Verify token on mount or token change
  useEffect(() => {
    const verifySession = async () => {
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        const res = await fetch('/api/auth/me', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (res.ok) {
          const data = await res.json();
          setUser(data.user);
        } else {
          // Token expired or invalid
          localStorage.removeItem('token');
          setToken(null);
          setUser(null);
        }
      } catch (error) {
        console.error('Session verification failed:', error);
      } finally {
        setLoading(false);
      }
    };

    verifySession();
  }, [token]);

  // 1. Local Registration
  const registerLocal = async (name: string, username: string, email: string, phone: string, password: string) => {
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, username, email, phone, password })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to register');
      }

      showToast('Registration successful! Logging you in...', 'success');
      
      // Auto login after local registration
      await loginLocal(username, password);
    } catch (error: any) {
      showToast(error.message, 'error');
      throw error;
    }
  };

  // 2. Local Login
  const loginLocal = async (username: string, password: string) => {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to login');
      }

      localStorage.setItem('token', data.token);
      setToken(data.token);
      setUser(data.user);
      showToast(`Welcome back, ${data.user.profile.name}!`, 'success');
    } catch (error: any) {
      showToast(error.message, 'error');
      throw error;
    }
  };

  // 3. Google Login (Firebase Sync)
  const loginWithGoogle = async () => {
    if (!firebaseActive || !auth || !googleProvider) {
      showToast('Firebase login is not configured on the server. Please use Local Dev Mode.', 'warning');
      return;
    }

    try {
      setLoading(true);
      const result = await signInWithPopup(auth, googleProvider);
      const firebaseUser = result.user;
      const firebaseToken = await firebaseUser.getIdToken();

      // Post token to backend to sync user database record
      const res = await fetch('/api/auth/firebase-sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${firebaseToken}`
        }
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to sync account with backend database');
      }

      localStorage.setItem('token', firebaseToken);
      setToken(firebaseToken);
      setUser(data.user);
      showToast(`Logged in successfully via Google!`, 'success');
    } catch (error: any) {
      showToast(error.message || 'Google Login failed', 'error');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // 4. Logout
  const logout = async () => {
    try {
      if (firebaseActive && auth && auth.currentUser) {
        await signOut(auth);
      }
    } catch (e) {
      console.warn('Firebase logout failed', e);
    } finally {
      localStorage.removeItem('token');
      setToken(null);
      setUser(null);
      showToast('Logged out successfully.', 'info');
    }
  };

  // 5. Complete Onboarding
  const completeOnboarding = async (onboardData: {
    profile: { name: string; phone?: string; address?: string; occupation?: string };
    wallets: { cash: number; bank: number; esewa: number };
    routines: Record<string, string[]>;
  }) => {
    try {
      if (!token) throw new Error('Not authenticated');

      const res = await fetch('/api/profile/onboard', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(onboardData)
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to complete onboarding');
      }

      setUser(prev => prev ? { ...prev, profile: data.user.profile } : null);
      showToast('Onboarding completed! Welcome to Paila Todo.', 'success');
    } catch (error: any) {
      showToast(error.message, 'error');
      throw error;
    }
  };

  // 6. Delete Account
  const deleteAccount = async () => {
    try {
      if (!token) throw new Error('Not authenticated');

      const res = await fetch('/api/profile/account', {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to delete account');
      }

      await logout();
      showToast('Your account was permanently deleted.', 'info');
    } catch (error: any) {
      showToast(error.message, 'error');
      throw error;
    }
  };

  // Helper to dynamically update client profile state
  const updateProfileState = (updatedProfile: UserProfile) => {
    setUser(prev => prev ? { ...prev, profile: updatedProfile } : null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isAuthenticated: !!user,
        token,
        firebaseActive,
        loginLocal,
        registerLocal,
        loginWithGoogle,
        logout,
        completeOnboarding,
        deleteAccount,
        updateProfileState
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
