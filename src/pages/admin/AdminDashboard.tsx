import { useState } from 'react'
import { Routes, Route, NavLink, useNavigate, useLocation } from 'react-router-dom'
import {
  Users, Truck, Route as RouteIcon, LayoutDashboard,
  LogOut, Package, BarChart2, AlertTriangle, Heart,
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '../../lib/supabase'
import OrdersView    from './OrdersView'
import DriversView   from './DriversView'
import RoutesView    from './RoutesView'
import ProductsView  from './ProductsView'
import AnalyticsView from './AnalyticsView'

const NAV_ITEMS = [
  { to: '/admin',           end: true,  icon: LayoutDashboard, label: 'Orders'    },
  { to: '/admin/drivers',   end: false, icon: Users,           label: 'Drivers'   },
  { to: '/admin/routes',    end: false, icon: RouteIcon,       label: 'Routes'    },
  { to: '/admin/products',  end: false, icon: Package,         label: 'Products'  },
  { to: '/admin/analytics', end: false, icon: BarChart2,       label: 'Analytics' },
]

export default function AdminDashboard() {
  const navigate  = useNavigate()
  const location  = useLocation()
  const [showLogout, setShowLogout] = useState(false)

  const handleLogout = async () => {
    await supabase.auth.signOut()
    window.location.href = '/login'
  }

  const sideNavClass = ({ isActive }: { isActive: boolean }) =>
    `flex items-center px-3 py-2.5 text-sm font-medium rounded-lg transition-colors ${
      isActive ? 'bg-primary-600 text-white shadow-md' : 'text-slate-300 hover:bg-slate-800 hover:text-white'
    }`

  const mobileActive = (to: string, end: boolean) =>
    end ? location.pathname === to : location.pathname.startsWith(to)

  return (
    <div className="flex bg-gray-50" style={{ minHeight: '100dvh' }}>

      {/* ── Desktop sidebar ── */}
      <aside className="w-64 bg-slate-900 text-white hidden lg:flex flex-col sticky top-0 h-screen">
        <div className="h-16 flex items-center px-6 border-b border-slate-800 flex-shrink-0">
          <Truck className="w-6 h-6 mr-3 text-primary-400" />
          <span className="text-lg font-bold tracking-tight">AE Delivery Admin</span>
        </div>
        <nav className="flex-1 py-6 px-3 space-y-1 overflow-y-auto">
          {NAV_ITEMS.map(({ to, end, icon: Icon, label }) => (
            <NavLink key={to} to={to} end={end} className={sideNavClass}>
              <Icon className="w-5 h-5 mr-3 flex-shrink-0" />{label}
            </NavLink>
          ))}
        </nav>
        <div className="p-4 border-t border-slate-800 flex-shrink-0 space-y-3">
          <button
            onClick={() => setShowLogout(true)}
            className="flex items-center text-sm font-medium text-slate-400 hover:text-white w-full px-3 py-2.5 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <LogOut className="w-5 h-5 mr-3" /> Sign Out
          </button>
          <div className="px-3 pt-2 space-y-0.5">
            <p className="text-[10px] text-slate-600">© 2026 serves.in — All rights reserved</p>
            <p className="text-[10px] text-slate-600 flex items-center gap-0.5">Created by Prateek & Team with <Heart className="w-2.5 h-2.5 text-red-400 fill-red-400" /></p>
            <p className="text-[10px] text-slate-600"><a href="mailto:tools.prateek@gmail.com" className="text-slate-500 hover:text-primary-400 transition-colors">tools.prateek@gmail.com</a></p>
          </div>
        </div>
      </aside>

      {/* ── Main column ── */}
      <div className="flex-1 flex flex-col min-w-0 h-dvh overflow-hidden">

        {/* Mobile top header */}
        <header className="lg:hidden bg-slate-900 text-white px-4 h-14 flex items-center justify-between sticky top-0 z-30 pt-safe flex-shrink-0">
          <div className="flex items-center">
            <Truck className="w-5 h-5 mr-2 text-primary-400" />
            <span className="font-bold">AE Delivery Admin</span>
          </div>
          <button
            onClick={() => setShowLogout(true)}
            className="w-10 h-10 flex items-center justify-center rounded-lg bg-slate-800 text-slate-300"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </header>

        {/* Page content */}
        <main className="flex-1 p-4 lg:p-8 overflow-y-auto pb-24 lg:pb-8">
          <Routes>
            <Route path="/"          element={<OrdersView />} />
            <Route path="/drivers"   element={<DriversView />} />
            <Route path="/routes"    element={<RoutesView />} />
            <Route path="/products"  element={<ProductsView />} />
            <Route path="/analytics" element={<AnalyticsView />} />
          </Routes>
        </main>
      </div>

      {/* ── Mobile bottom nav ── */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-slate-900 border-t border-slate-800 pb-safe">
        <div className="flex justify-around">
          {NAV_ITEMS.map(({ to, end, icon: Icon, label }) => {
            const active = mobileActive(to, end)
            return (
              <button
                key={to}
                onClick={() => navigate(to)}
                className={`flex flex-col items-center justify-center flex-1 py-2.5 gap-0.5 active:scale-90 transition-transform ${
                  active ? 'text-primary-400' : 'text-slate-500'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span className="text-[9px] font-bold">{label}</span>
              </button>
            )
          })}
        </div>
      </nav>

      {/* ── Logout confirmation ── */}
      <AnimatePresence>
        {showLogout && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.92, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: 20 }}
              className="bg-white rounded-3xl w-full max-w-xs p-6 shadow-2xl text-center"
            >
              <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertTriangle className="w-8 h-8 text-red-500" />
              </div>
              <h3 className="text-xl font-black text-gray-900 mb-2">Sign Out?</h3>
              <p className="text-gray-500 text-sm mb-6 leading-relaxed">
                You'll be redirected to the login page.
              </p>
              <div className="flex flex-col gap-3">
                <button
                  onClick={handleLogout}
                  className="w-full bg-red-600 text-white py-3.5 rounded-2xl font-bold text-sm active:scale-[0.97] transition-transform"
                >
                  Yes, Sign Me Out
                </button>
                <button
                  onClick={() => setShowLogout(false)}
                  className="w-full bg-gray-100 text-gray-600 py-3.5 rounded-2xl font-bold text-sm active:scale-[0.97] transition-transform"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}
