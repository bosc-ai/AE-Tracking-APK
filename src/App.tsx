import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { CartProvider } from './contexts/CartContext'
import Login from './pages/auth/Login'
import CustomerDashboard from './pages/customer/CustomerDashboard'
import DriverDashboard from './pages/driver/DriverDashboard'
import AdminDashboard from './pages/admin/AdminDashboard'
import LiveTracker from './pages/tracking/LiveTracker'
import AndroidBackHandler from './components/AndroidBackHandler'

function ProtectedRoute({ children, allowedRole }: { children: React.ReactNode; allowedRole: string }) {
  const { user, role, loading } = useAuth()
  
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
      </div>
    )
  }
  
  if (!user) return <Navigate to="/login" replace />
  if (role !== allowedRole) {
    // Redirect to correct dashboard
    if (role === 'admin') return <Navigate to="/admin" replace />
    if (role === 'driver') return <Navigate to="/driver" replace />
    return <Navigate to="/customer" replace />
  }
  
  return <>{children}</>
}

function App() {
  return (
    <AuthProvider>
      <CartProvider>
        <BrowserRouter>
          <AndroidBackHandler />
          <Routes>
            <Route path="/" element={<Navigate to="/login" replace />} />
            <Route path="/login" element={<Login />} />
            <Route path="/customer/*" element={
              <ProtectedRoute allowedRole="customer"><CustomerDashboard /></ProtectedRoute>
            } />
            <Route path="/driver/*" element={
              <ProtectedRoute allowedRole="driver"><DriverDashboard /></ProtectedRoute>
            } />
            <Route path="/admin/*" element={
              <ProtectedRoute allowedRole="admin"><AdminDashboard /></ProtectedRoute>
            } />
            <Route path="/track/:token" element={<LiveTracker />} />
          </Routes>
        </BrowserRouter>
      </CartProvider>
    </AuthProvider>
  )
}

export default App
