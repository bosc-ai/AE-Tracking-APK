import { createContext, useContext, useEffect, useState, useRef } from 'react'
import type { User } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'

type AuthContextType = {
  user: User | null
  loading: boolean
  role: 'customer' | 'driver' | 'admin' | null
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType>({ user: null, loading: true, role: null, signOut: async () => {} })

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [role, setRole] = useState<'customer' | 'driver' | 'admin' | null>(null)
  // Tracks whether initial session check completed — prevents onAuthStateChange
  // from prematurely setting user to null before getSession resolves.
  const initialCheckDone = useRef(false)
  // Prevents duplicate role fetches from racing
  const roleFetchRef = useRef<string | null>(null)

  useEffect(() => {
    let mounted = true

    // 1. Initial session check (single source of truth on startup)
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!mounted) return
      initialCheckDone.current = true

      if (session?.user) {
        setUser(session.user)
        fetchUserRole(session.user.id)
      } else {
        setUser(null)
        setRole(null)
        setLoading(false)
      }
    })

    // 2. Subscribe to auth state changes (fires AFTER getSession on some devices)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) return

      // Skip events that fire before our initial check — they carry stale state
      if (!initialCheckDone.current) return

      // On SIGNED_OUT we always respect it
      if (event === 'SIGNED_OUT' || !session?.user) {
        setUser(null)
        setRole(null)
        setLoading(false)
        return
      }

      // SIGNED_IN / TOKEN_REFRESHED / INITIAL_SESSION — update user & role
      setUser(session.user)

      // Only fetch role if the user actually changed (avoids re-fetch on token refresh)
      if (event === 'SIGNED_IN' || event === 'INITIAL_SESSION') {
        fetchUserRole(session.user.id)
      }
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [])

  const fetchUserRole = async (userId: string) => {
    // Deduplicate: if we're already fetching for this user, skip
    if (roleFetchRef.current === userId) return
    roleFetchRef.current = userId

    try {
      const { data, error } = await supabase.rpc('get_my_role')

      if (data && !error && ['customer', 'driver', 'admin'].includes(data)) {
        setRole(data as 'customer' | 'driver' | 'admin')
      } else {
        console.error('get_my_role failed:', error?.message, '| returned:', data)
        setRole('customer')
      }
    } catch (e) {
      console.error('Role fetch exception:', e)
      setRole('customer')
    } finally {
      setLoading(false)
      roleFetchRef.current = null
    }
  }

  const signOut = async () => {
    try {
      await supabase.auth.signOut()
    } catch {
      // Ensure local state is cleared even if signOut call fails
    }
    setUser(null)
    setRole(null)
  }

  return (
    <AuthContext.Provider value={{ user, loading, role, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
