import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { motion } from 'framer-motion'
import { Package, Smartphone, Mail, ArrowRight, AlertCircle, Eye, EyeOff } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'

export default function Login() {
  const [method, setMethod] = useState<'email' | 'phone'>('email')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [isSignUp, setIsSignUp] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const navigate = useNavigate()
  const { user, role, loading: authLoading } = useAuth()

  // Redirect if already logged in
  useEffect(() => {
    if (!authLoading && user && role) {
      if (role === 'admin') navigate('/admin', { replace: true })
      else if (role === 'driver') navigate('/driver', { replace: true })
      else navigate('/customer', { replace: true })
    }
  }, [user, role, authLoading, navigate])

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { role: 'customer' } },
        })
        if (error) throw error
        setError('') // Success — AuthContext will handle redirect
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
      }
    } catch (err: any) {
      setError(err.message || 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-dvh bg-gray-50 py-10 px-4 sm:px-6 lg:px-8 overflow-y-auto">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex justify-center"
        >
          <div className="h-12 w-12 bg-primary-600 rounded-xl flex items-center justify-center shadow-lg shadow-primary-500/30">
            <Package className="text-white h-7 w-7" />
          </div>
        </motion.div>
        <motion.h2 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="mt-6 text-center text-3xl font-extrabold text-gray-900 tracking-tight"
        >
          AE Delivery
        </motion.h2>
        <motion.p 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="mt-2 text-center text-sm text-gray-600"
        >
          {isSignUp ? 'Create your account' : 'Sign in to your account'}
        </motion.p>
      </div>

      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.3 }}
        className="mt-8 sm:mx-auto sm:w-full sm:max-w-md"
      >
        <div className="bg-white py-8 px-4 shadow-xl shadow-gray-200/50 sm:rounded-2xl sm:px-10 border border-gray-100">
          {/* Method toggle */}
          <div className="flex bg-gray-100 rounded-lg p-1 mb-6">
            <button
              onClick={() => { setMethod('email'); setError('') }}
              className={`flex-1 flex justify-center items-center py-2 text-sm font-medium rounded-md transition-all ${
                method === 'email' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <Mail className="w-4 h-4 mr-2" /> Email
            </button>
            <button
              onClick={() => { setMethod('phone'); setError('') }}
              className={`flex-1 flex justify-center items-center py-2 text-sm font-medium rounded-md transition-all ${
                method === 'phone' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <Smartphone className="w-4 h-4 mr-2" /> Phone (OTP)
            </button>
          </div>

          {/* Error display */}
          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl p-3 flex items-start">
              <AlertCircle className="w-4 h-4 mr-2 mt-0.5 flex-shrink-0" />
              {error}
            </div>
          )}

          {/* Email form */}
          {method === 'email' && (
            <form className="space-y-5" onSubmit={handleEmailLogin}>
              <div>
                <label className="block text-sm font-medium text-gray-700">Email address</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="mt-1 appearance-none block w-full px-3 py-2.5 border border-gray-300 rounded-xl shadow-sm placeholder-gray-400 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm bg-gray-50/50"
                  placeholder="you@example.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Password</label>
                <div className="mt-1 relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="appearance-none block w-full px-3 py-2.5 pr-10 border border-gray-300 rounded-xl shadow-sm placeholder-gray-400 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm bg-gray-50/50"
                    placeholder="••••••••"
                    minLength={6}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-xl shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-colors group"
              >
                <span className="flex items-center">
                  {loading ? 'Please wait...' : (isSignUp ? 'Create Account' : 'Sign in')}
                  {!loading && <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />}
                </span>
              </button>
              <button
                type="button"
                onClick={() => { setIsSignUp(!isSignUp); setError('') }}
                className="w-full text-sm text-gray-500 hover:text-primary-600 transition-colors mt-2"
              >
                {isSignUp ? 'Already have an account? Sign in' : "Don't have an account? Sign up"}
              </button>
            </form>
          )}

          {/* Phone OTP — Coming Soon */}
          {method === 'phone' && (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-primary-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <Smartphone className="w-8 h-8 text-primary-500" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">Coming Soon</h3>
              <p className="text-sm text-gray-500 leading-relaxed">
                Phone OTP login will be available soon.<br />
                Please use Email login for now.
              </p>
              <button
                type="button"
                onClick={() => setMethod('email')}
                className="mt-5 text-sm font-medium text-primary-600 hover:text-primary-700 transition-colors"
              >
                ← Switch to Email login
              </button>
            </div>
          )}
        </div>
      </motion.div>

      {/* Footer credits */}
      <div className="mt-10 mb-6 text-center space-y-1">
        <p className="text-xs text-gray-400">All rights reserved to <a href="https://serves.in" target="_blank" rel="noopener noreferrer" className="text-primary-600 hover:underline">serves.in</a> © 2026</p>
        <p className="text-xs text-gray-400">Created by Prateek & Team with ❤️</p>
        <p className="text-xs text-gray-400">For any bugs or feature requests reach <a href="mailto:tools.prateek@gmail.com" className="text-primary-600 hover:underline">tools.prateek@gmail.com</a></p>
      </div>
    </div>
  )
}
