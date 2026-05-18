import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured } from '../lib/supabase/client';
import { authApi, SignUpData, SignInData } from '../lib/supabase/api';
import type { Profile } from '../lib/supabase/database.types';

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  session: Session | null;
  loading: boolean;
  error: string | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  signUp: (data: SignUpData) => Promise<void>;
  signIn: (data: SignInData) => Promise<void>;
  signOut: () => Promise<void>;
  updateProfile: (updates: { full_name?: string; phone?: string; avatar_url?: string }) => Promise<Profile | null>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch profile for a user
  const fetchProfile = useCallback(async (userId: string) => {
    try {
      const profileData = await authApi.getProfile(userId);
      setProfile(profileData);
    } catch (err) {
      console.error('Failed to fetch profile:', err);
    }
  }, []);

  // Initialize auth state
  useEffect(() => {
    if (!isSupabaseConfigured()) {
      setLoading(false);
      return;
    }

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        fetchProfile(session.user.id).finally(() => setLoading(false));
      } else {
        setLoading(false);
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          await fetchProfile(session.user.id);
        } else {
          setProfile(null);
        }
        setLoading(false);
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, [fetchProfile]);

  const signUp = useCallback(async (data: SignUpData) => {
    setLoading(true);
    setError(null);
    try {
      await authApi.signUp(data);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Sign up failed';
      setError(errorMsg);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const signIn = useCallback(async (data: SignInData) => {
    setLoading(true);
    setError(null);
    try {
      const result = await authApi.signIn(data);
      if (result.user) {
        await fetchProfile(result.user.id);
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Sign in failed';
      setError(errorMsg);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [fetchProfile]);

  const signOut = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      await authApi.signOut();
      setUser(null);
      setProfile(null);
      setSession(null);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Sign out failed';
      setError(errorMsg);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const updateProfile = useCallback(async (updates: { full_name?: string; phone?: string; avatar_url?: string }) => {
    if (!user) throw new Error('Not authenticated');
    setError(null);
    try {
      const updatedProfile = await authApi.updateProfile(user.id, updates);
      setProfile(updatedProfile);
      return updatedProfile;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Update failed';
      setError(errorMsg);
      throw err;
    }
  }, [user]);

  const refreshProfile = useCallback(async () => {
    if (user) {
      await fetchProfile(user.id);
    }
  }, [user, fetchProfile]);

  const value: AuthContextType = {
    user,
    profile,
    session,
    loading,
    error,
    isAuthenticated: !!user,
    isAdmin: profile?.role === 'admin',
    signUp,
    signIn,
    signOut,
    updateProfile,
    refreshProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuthContext() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuthContext must be used within AuthProvider');
  }
  return context;
}
