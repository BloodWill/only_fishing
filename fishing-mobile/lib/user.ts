// lib/user.ts
// Updated to use Supabase Auth with fallback to AsyncStorage for guest users

import { supabase } from './supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = '@fish/user_id';

/**
 * Get the current user ID
 * - First checks Supabase auth session
 * - Falls back to legacy AsyncStorage for guest users
 */
export async function getUserId(): Promise<string | null> {
  try {
    // Check Supabase auth first
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user?.id) {
      return session.user.id;
    }
    
    // Fallback to legacy storage for guest users
    const legacyId = await AsyncStorage.getItem(KEY);
    return legacyId || null;
  } catch {
    // If supabase fails, try legacy storage
    try {
      return (await AsyncStorage.getItem(KEY)) || null;
    } catch {
      return null;
    }
  }
}

/**
 * Set user ID (for guest mode only)
 * Authenticated users get their ID from Supabase session
 */
export async function setUserId(id: string): Promise<void> {
  await AsyncStorage.setItem(KEY, id);
}

/**
 * Clear user ID (for signing out of guest mode)
 * For Supabase users, use supabase.auth.signOut() instead
 */
export async function clearUserId(): Promise<void> {
  await AsyncStorage.removeItem(KEY);
}

/**
 * Check if user is authenticated via Supabase
 */
export async function isAuthenticated(): Promise<boolean> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    return !!session?.user;
  } catch {
    return false;
  }
}

/**
 * Get the current user's email (if authenticated)
 */
export async function getUserEmail(): Promise<string | null> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.user?.email || null;
  } catch {
    return null;
  }
}

/**
 * Get the auth token for API calls
 */
export async function getAuthToken(): Promise<string | null> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token || null;
  } catch {
    return null;
  }
}