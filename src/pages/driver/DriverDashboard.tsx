import { useState, useEffect } from 'react'
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom'
import { MapPinned, Wallet, LogOut, Radio, UserCircle, AlertTriangle } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { startGPSPinging, stopGPSPinging, setGPSErrorCallback } from '../../lib/gps'
import RouteView from './RouteView'
import StopDetail from './StopDetail'
import CashSummary from './CashSummary'
import DriverProfile from './DriverProfile'

export default function DriverDashboard() {
  const navigate = useNavigate()
  const location = useLocation()
  const { user, signOut } = useAuth()
  const [gpsActive, setGpsActive] = useState(false)
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false)
  const [driverName, setDriverName] = useState('')
  const [gpsError, setGpsError] = useState('')

  useEffect(() => {
    setGPSErrorCallback((err) => {
      if (err) { setGpsError(err); setGpsActive(false) }
    })
    if (user) {
      supabase.from('profiles').select('full_name').eq('id', user.id).single()
        .then(({ data }) => { if (data?.full_name) setDriverName(data.full_name) })
    }
  }, [user])

  const handleLogout = async () => {
    stopGPSPinging()
    await signOut()
    navigate('/login', { replace: true })
  }

  const toggleGPS = () => {
    if (!user) return
    if (gpsActive) {
      stopGPSPinging()
      setGpsActive(false)
    } else {
      startGPSPinging(user.id, 20000)
      setGpsActive(true)
    }
  }

  const isRouteActive   = location.pathname === '/driver' || location.pathname === '/driver/'
  const isSummaryActive = location.pathname.includes('/summary')
  const isProfileActive = location.pathname.includes('/profile')

  return (
    <div className="flex flex-col bg-gray-50 h-screen h-[100dvh] overflow-hidden">

      {/* Header — pushes below status bar */}
      <header className="bg-white text-gray-900 flex-shrink-0 pt-safe shadow-sm z-40 border-b border-gray-100">
        <div className="max-w-md mx-auto px-4 h-16 flex items-center justify-between">
          <button 
            onClick={() => navigate('/driver/profile')}
            className="flex items-center text-left active:scale-95 transition-transform"
          >
            <div className="w-10 h-10 bg-primary-50 rounded-full flex items-center justify-center mr-3 flex-shrink-0 border border-primary-100">
              <span className="font-black text-sm text-primary-600">{driverName ? driverName[0].toUpperCase() : 'DR'}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-black text-gray-900 leading-tight truncate max-w-[120px]">{driverName || "Driver"}</span>
              <span className={`text-[10px] font-bold uppercase tracking-wider ${gpsActive ? 'text-emerald-600' : 'text-gray-400'}`}>
                {gpsActive ? 'GPS Active' : 'GPS Off'}
              </span>
            </div>
          </button>
          <div className="flex items-center gap-1">
            <button
              onClick={toggleGPS}
              className={`w-10 h-10 flex items-center justify-center rounded-xl transition-all active:scale-90 ${gpsActive ? 'bg-primary-600 text-white shadow-md shadow-primary-600/20' : 'bg-gray-50 text-gray-400 border border-gray-200'}`}
            >
              <Radio className="w-5 h-5" />
            </button>
            <button
              onClick={() => setShowLogoutConfirm(true)}
              className="w-10 h-10 flex items-center justify-center rounded-xl text-gray-400 bg-gray-50 border border-gray-200 active:scale-90 transition-all"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      {/* GPS error banner */}
      <AnimatePresence>
        {gpsError && (
          <motion.div
            initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
            className="bg-red-600 text-white text-xs text-center overflow-hidden flex items-center justify-center gap-2 px-4 py-2 flex-shrink-0"
          >
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            <span>{gpsError}</span>
            <button onClick={() => setGpsError('')} className="underline ml-1 font-semibold">Dismiss</button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main content — THIS IS THE SCROLLABLE AREA */}
      <main className="flex-1 w-full max-w-md mx-auto overflow-y-auto overflow-x-hidden touch-pan-y outline-none">
        <div className="px-4 pt-4 pb-32">
          <Routes>
            <Route path="/"              element={<RouteView />} />
            <Route path="/stop/:stopId"  element={<StopDetail />} />
            <Route path="/summary"       element={<CashSummary />} />
            <Route path="/profile"       element={<DriverProfile />} />
          </Routes>
        </div>
      </main>

      {/* Logout modal */}
      <AnimatePresence>
        {showLogoutConfirm && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.92, y: 24 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: 24 }}
              className="bg-white rounded-3xl w-full max-w-xs p-6 shadow-2xl text-center"
            >
              <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertTriangle className="w-8 h-8 text-red-500" />
              </div>
              <h3 className="text-xl font-black text-gray-900 mb-2">Log Out?</h3>
              <p className="text-gray-500 text-sm mb-6 leading-relaxed">
                You'll need to log in again to see your route.
              </p>
              <div className="flex flex-col gap-3">
                <button
                  onClick={handleLogout}
                  className="w-full bg-red-600 text-white py-4 rounded-2xl font-bold text-sm active:scale-[0.97] transition-transform"
                >
                  Yes, Log Me Out
                </button>
                <button
                  onClick={() => setShowLogoutConfirm(false)}
                  className="w-full bg-gray-100 text-gray-600 py-4 rounded-2xl font-bold text-sm active:scale-[0.97] transition-transform"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Bottom nav — respects home bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-100 pb-safe shadow-[0_-4px_12px_rgba(0,0,0,0.03)]">
        <div className="max-w-md mx-auto flex justify-around">
          {[
            { label: 'Route',    icon: MapPinned,  active: isRouteActive,   onClick: () => navigate('/driver') },
            { label: 'Summary',  icon: Wallet,     active: isSummaryActive, onClick: () => navigate('/driver/summary') },
            { label: 'Profile',  icon: UserCircle, active: isProfileActive, onClick: () => navigate('/driver/profile') },
          ].map(({ label, icon: Icon, active, onClick }) => (
            <button
              key={label}
              onClick={onClick}
              className={`flex flex-col items-center justify-center flex-1 py-3 gap-1 active:scale-90 transition-transform ${active ? 'text-primary-600' : 'text-gray-400'}`}
            >
              <Icon className={`w-6 h-6 ${active && label === 'Route' ? 'animate-pulse' : ''}`} />
              <span className="text-[10px] font-black">{label}</span>
            </button>
          ))}
        </div>
      </nav>
    </div>
  )
}
