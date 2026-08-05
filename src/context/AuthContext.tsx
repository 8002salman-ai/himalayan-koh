'use client';

import { createContext, useContext, useState, useEffect, ReactNode, useCallback, useRef } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured } from '../lib/supabase/client';
import { authApi, SignUpData, SignInData } from '../lib/supabase/api';
import type { Profile } from '../lib/supabase/database.types';

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  session: Session | null;
  loading: boolean;
  // True only while a role-bearing profile fetch is in flight for an
  // authenticated user. Route guards that gate on role (AdminRoute) must wait
  // on this in addition to `loading` — `loading` clears as soon as the
  // session is known, before the profile row has actually arrived, so a
  // guard that only checked `loading` would judge isAdmin from a `profile`
  // that hadn't loaded yet and misfire "access denied" for a real admin.
  profileLoading: boolean;
  // Set when the profile row could not be loaded after retries. isAdmin then
  // reflects a guessed fallback role, not a database-confirmed one — route
  // guards can offer a retry instead of treating that as a final verdict.
  profileError: string | null;
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

const PROFILE_FETCH_TIMEOUT_MS = 6_000;
// A single transient failure (cold serverless connection, a dropped
// WebSocket, one slow round trip) must not permanently downgrade an admin to
// the 'customer' fallback role for the rest of the session — that is what
// previously required a manual refresh to clear. Retrying a couple of times
// automatically absorbs exactly that class of blip.
const PROFILE_FETCH_RETRY_DELAYS_MS = [800, 2000];
// Auth is client-side and should never leave a protected route on an
// indefinite spinner. A stale browser lock, blocked storage read, or an
// interrupted network request must recover to the login flow instead.
const AUTH_INITIALIZATION_MAX_WAIT_MS = 5_000;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => globalThis.setTimeout(resolve, ms));
}

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = globalThis.setTimeout(() => {
      reject(new Error(`${label} timed out. Check your connection and try again.`));
    }, ms);

    promise
      .then((value) => {
        globalThis.clearTimeout(timer);
        resolve(value);
      })
      .catch((err) => {
        globalThis.clearTimeout(timer);
        reject(err);
      });
  });
}

/** Supabase can deadlock if other client calls run inside onAuthStateChange. */
function runAfterAuthCallback(task: () => void) {
  globalThis.setTimeout(task, 0);
}

function roleFromUser(user: User | null): 'admin' | 'customer' | null {
  const metaRole = user?.user_metadata?.role;
  if (metaRole === 'admin' || metaRole === 'customer') return metaRole;
  return null;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const profileRequestId = useRef(0);

  const fetchProfile = useCallback(async (userId: string, currentUser?: User | null, attempt = 0) => {
    const requestId = attempt === 0 ? ++profileRequestId.current : profileRequestId.current;
    if (attempt === 0) {
      setProfileLoading(true);
      setProfileError(null);
    }

    try {
      const profileData = await withTimeout(
        authApi.getProfile(userId),
        PROFILE_FETCH_TIMEOUT_MS,
        'Profile load'
      );

      if (requestId !== profileRequestId.current) return;

      if (profileData) {
        setProfile(profileData);
        setProfileLoading(false);
        return;
      }

      // No error, no row — a genuinely new user without a profile yet, not a
      // failure worth retrying. The guessed role is the correct outcome here.
      const fallbackRole = roleFromUser(currentUser ?? null) || 'customer';
      setProfile({
        id: userId,
        email: currentUser?.email ?? '',
        full_name: (currentUser?.user_metadata?.full_name as string) || null,
        phone: null,
        avatar_url: null,
        role: fallbackRole,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
      setProfileLoading(false);
    } catch (err) {
      if (requestId !== profileRequestId.current) return;

      const retryDelay = PROFILE_FETCH_RETRY_DELAYS_MS[attempt];
      if (retryDelay !== undefined) {
        await sleep(retryDelay);
        if (requestId !== profileRequestId.current) return;
        return fetchProfile(userId, currentUser, attempt + 1);
      }

      console.error('Failed to fetch profile after retries:', err);

      const sessionUser = currentUser ?? null;
      if (!sessionUser) {
        setProfile(null);
        setProfileLoading(false);
        return;
      }

      // Every retry was exhausted. isAdmin will now reflect a guessed role,
      // not a confirmed one — profileError lets route guards offer a retry
      // instead of a flat "access denied" for what may just be a real admin
      // whose profile row genuinely could not be reached this time.
      setProfileError(err instanceof Error ? err.message : 'Could not load your profile.');
      const fallbackRole = roleFromUser(sessionUser) || 'customer';
      setProfile({
        id: userId,
        email: sessionUser.email ?? '',
        full_name: (sessionUser.user_metadata?.full_name as string) || null,
        phone: null,
        avatar_url: null,
        role: fallbackRole,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
      setProfileLoading(false);
    }
  }, []);

  const loadProfileForSession = useCallback(
    (sessionUser: User | null) => {
      if (!sessionUser) {
        profileRequestId.current += 1;
        setProfile(null);
        setProfileLoading(false);
        setProfileError(null);
        return Promise.resolve();
      }

      return fetchProfile(sessionUser.id, sessionUser);
    },
    [fetchProfile]
  );

  // Initialize auth state
  useEffect(() => {
    if (!isSupabaseConfigured()) {
      setLoading(false);
      return;
    }

    let mounted = true;
    let authInitializationFinished = false;
    const authInitializationTimer = globalThis.setTimeout(() => {
      if (!mounted || authInitializationFinished) return;
      console.warn('Auth initialization exceeded the recovery window. Releasing route loading state.');
      setLoading(false);
    }, AUTH_INITIALIZATION_MAX_WAIT_MS);

    const finishAuthInitialization = () => {
      authInitializationFinished = true;
      globalThis.clearTimeout(authInitializationTimer);
    };

    const applySession = (nextSession: Session | null, loadProfile: boolean) => {
      if (!mounted) return;

      setSession(nextSession);
      setUser(nextSession?.user ?? null);

      if (!nextSession?.user) {
        profileRequestId.current += 1;
        setProfile(null);
        finishAuthInitialization();
        setLoading(false);
        return;
      }

      if (!loadProfile) {
        finishAuthInitialization();
        setLoading(false);
        return;
      }

      // Route access depends on a valid Supabase session, not the optional
      // profile row. Keeping global auth loading true until a profile request
      // returns can trap a signed-in customer on the account spinner whenever
      // the profiles query is slow or blocked by a transient network/RLS error.
      finishAuthInitialization();
      setLoading(false);
      void loadProfileForSession(nextSession.user);
    };

    void (async () => {
      try {
        const { data, error } = await withTimeout(
          supabase.auth.getSession(),
          PROFILE_FETCH_TIMEOUT_MS,
          'Session check'
        );
        if (error) throw error;
        applySession(data.session, true);
      } catch (err) {
        console.error('Auth initialization failed:', err);
        if (mounted) {
          finishAuthInitialization();
          setLoading(false);
        }
      }
    })();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, nextSession) => {
      runAfterAuthCallback(() => {
        if (event === 'TOKEN_REFRESHED') {
          // Only update the session token — no profile re-fetch needed
          if (mounted) {
            setSession(nextSession);
            setUser(nextSession?.user ?? null);
          }
          return;
        }
        if (event === 'SIGNED_OUT') {
          if (mounted) {
            profileRequestId.current += 1;
            setSession(null);
            setUser(null);
            setProfile(null);
            setProfileLoading(false);
            setProfileError(null);
            setLoading(false);
          }
          return;
        }
        applySession(nextSession, Boolean(nextSession?.user));
      });
    });

    return () => {
      mounted = false;
      globalThis.clearTimeout(authInitializationTimer);
      subscription.unsubscribe();
    };
  }, [loadProfileForSession]);

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
    setError(null);
    setLoading(true);
    try {
      const result = await authApi.signIn(data);
      setSession(result.session);
      setUser(result.user);
      // A successful credential check is enough to navigate to the protected
      // account area. Fetch the editable profile in the background so a slow
      // profile request never makes sign-in appear to hang.
      setLoading(false);

      if (result.user) {
        void fetchProfile(result.user.id, result.user);
      } else {
        setProfile(null);
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
    setError(null);
    // Clear local auth state first and unconditionally, so the UI reflects a
    // signed-out state immediately — even if the Supabase revoke call fails
    // (e.g. an already-expired/missing session). This is what fixes sign-out
    // appearing to "not work" across the customer, admin, and dealer portals.
    profileRequestId.current += 1;
    setUser(null);
    setProfile(null);
    setProfileLoading(false);
    setProfileError(null);
    setSession(null);
    try {
      await authApi.signOut();
    } catch (err) {
      // authApi.signOut already swallows benign errors; log anything else but
      // never re-throw — the user is signed out locally regardless.
      console.warn('Sign out completed with a non-fatal error:', err);
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

  // fetchProfile manages its own profileLoading/profileError state, so a
  // manual retry (e.g. the "Try again" button on an access-denied screen)
  // doesn't need to also toggle the global `loading` flag — doing so used to
  // re-trigger the full-page auth spinner on every route it's shared with.
  const refreshProfile = useCallback(async () => {
    if (user) {
      await fetchProfile(user.id, user);
    }
  }, [user, fetchProfile]);

  const metadataRole = roleFromUser(user);
  const isAdmin = profile?.role === 'admin' || metadataRole === 'admin';

  const value: AuthContextType = {
    user,
    profile,
    session,
    loading,
    profileLoading,
    profileError,
    error,
    isAuthenticated: !!user,
    isAdmin,
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
