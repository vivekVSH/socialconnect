'use client';
import { useEffect, useState, useCallback } from 'react';
import { supabaseBrowser } from './supabaseClient';

// Cache for profile data to avoid repeated API calls
const profileCache = new Map<string, { data: any; timestamp: number }>();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export function useAuth() {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = useCallback(async (userId: string) => {
    // Check cache first
    const cached = profileCache.get(userId);
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      setProfile(cached.data);
      return cached.data;
    }

    // Fetch from database
    const sb = supabaseBrowser();
    const { data: profileData } = await sb
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    // Cache the result
    if (profileData) {
      profileCache.set(userId, { data: profileData, timestamp: Date.now() });
    }

    setProfile(profileData);
    return profileData;
  }, []);

  useEffect(() => {
    const sb = supabaseBrowser();
    let mounted = true;

    // Get initial session - use cached session if available
    const getSession = async () => {
      try {
        const { data: { session }, error } = await sb.auth.getSession();
        
        if (error) {
          console.error('Session error:', error);
          if (mounted) {
            setUser(null);
            setProfile(null);
            setLoading(false);
          }
          return;
        }

        if (mounted) {
          setUser(session?.user || null);
          
          if (session?.user) {
            // Fetch profile in background
            fetchProfile(session.user.id);
          }
          
          setLoading(false);
        }
      } catch (error) {
        console.error('Auth error:', error);
        if (mounted) {
          setUser(null);
          setProfile(null);
          setLoading(false);
        }
      }
    };

    getSession();

    // Listen for auth changes
    const { data: { subscription } } = sb.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return;

      setUser(session?.user || null);
      
      if (session?.user) {
        // Fetch profile in background
        fetchProfile(session.user.id);
      } else {
        setProfile(null);
        // Clear cache when user logs out
        profileCache.clear();
      }
      
      setLoading(false);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [fetchProfile]);

  const logout = useCallback(async () => {
    const sb = supabaseBrowser();
    // Clear cache on logout
    profileCache.clear();
    // Sign out and clear session
    const { error } = await sb.auth.signOut();
    if (error) {
      console.error('Logout error:', error);
    }
    // Force clear user state
    setUser(null);
    setProfile(null);
  }, []);

  return {
    user,
    profile,
    loading,
    logout,
    isAuthenticated: !!user
  };
}
