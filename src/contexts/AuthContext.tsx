import { createContext, useContext, useEffect, useState } from 'react'
import type { User } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'

type AuthContextType = {
  user: User | null
  loading: boolean
  role: 'customer' | 'driver' | 'admin' | null
}

const AuthContext = createContext<AuthContextType>({ user: null, loading: true, role: null })

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [role, setRole] = useState<'customer' | 'driver' | 'admin' | null>(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      if (session?.user) fetchUserRole(session.user.id)
      else setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      if (session?.user) {
        fetchUserRole(session.user.id)
      } else {
        setRole(null)
        setLoading(false)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  const fetchUserRole = async (_userId: string) => {
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
    }
  }

  return (
    <AuthContext.Provider value={{ user, loading, role }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
