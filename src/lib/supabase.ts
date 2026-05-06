import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://placeholder.supabase.co'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'placeholder'

/**
 * Custom storage adapter that wraps localStorage with try/catch fallbacks.
 * Some Android WebViews can throw on localStorage access or silently lose data.
 * This adapter ensures we never crash and provides an in-memory fallback.
 */
const memoryStore: Record<string, string> = {}

const safeStorage = {
  getItem: (key: string): string | null => {
    try {
      return localStorage.getItem(key) ?? memoryStore[key] ?? null
    } catch {
      return memoryStore[key] ?? null
    }
  },
  setItem: (key: string, value: string): void => {
    try {
      localStorage.setItem(key, value)
    } catch {
      // localStorage is full or blocked — fall back to memory
    }
    memoryStore[key] = value
  },
  removeItem: (key: string): void => {
    try {
      localStorage.removeItem(key)
    } catch {
      // ignore
    }
    delete memoryStore[key]
  },
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: safeStorage,
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false, // Not needed in Capacitor — avoids URL-parsing bugs
    storageKey: 'ae-delivery-auth', // Explicit key prevents collisions
  },
})
