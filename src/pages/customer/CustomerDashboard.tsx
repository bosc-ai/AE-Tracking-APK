import { Routes, Route, useNavigate, useLocation } from 'react-router-dom'
import { ShoppingBag, User, LogOut, ShoppingCart } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useCart } from '../../contexts/CartContext'
import Catalog from './Catalog'
import Cart from './Cart'
import Checkout from './Checkout'

export default function CustomerDashboard() {
  const navigate = useNavigate()
  const location = useLocation()
  const { items } = useCart()

  const handleLogout = async () => {
    await supabase.auth.signOut()
    window.location.href = '/login'
  }

  const cartItemCount = items.reduce((total, item) => total + item.quantity, 0)
  const isCartActive = location.pathname.includes('/cart')
  const isShopActive = location.pathname === '/customer' || location.pathname === '/customer/'

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <header className="bg-white sticky top-0 z-40 shadow-sm shadow-gray-200/50 border-b border-gray-100">
        <div className="max-w-md mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex flex-col">
            <span className="text-sm font-medium text-gray-500">Deliver to</span>
            <span className="text-sm font-semibold truncate w-48 text-gray-900">Your Current Location</span>
          </div>
          <button onClick={handleLogout} className="p-2 -mr-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-50 transition-colors">
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </header>

      <main className="max-w-md mx-auto px-4 pt-6">
        <Routes>
          <Route path="/" element={<Catalog />} />
          <Route path="/cart" element={<Cart />} />
          <Route path="/checkout" element={<Checkout />} />
        </Routes>
      </main>

      <nav className="fixed bottom-0 w-full z-40 bg-white border-t border-gray-100 shadow-[0_-4px_20px_-10px_rgba(0,0,0,0.1)] pb-safe">
        <div className="max-w-md mx-auto flex justify-around p-3">
          <button 
            onClick={() => navigate('/customer')}
            className={`flex flex-col items-center p-2 transition-colors ${isShopActive ? 'text-primary-600' : 'text-gray-400 hover:text-gray-600'}`}
          >
            <ShoppingBag className="w-6 h-6 mb-1" />
            <span className="text-[10px] font-semibold">Shop</span>
          </button>
          
          <button 
            onClick={() => navigate('/customer/cart')}
            className={`flex flex-col items-center p-2 transition-colors relative ${isCartActive ? 'text-primary-600' : 'text-gray-400 hover:text-gray-600'}`}
          >
            <div className="relative">
              <ShoppingCart className="w-6 h-6 mb-1" />
              {cartItemCount > 0 && (
                <span className="absolute -top-1 -right-2 bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
                  {cartItemCount}
                </span>
              )}
            </div>
            <span className="text-[10px] font-medium">Cart</span>
          </button>
          
          <button className="flex flex-col items-center p-2 text-gray-400 hover:text-gray-600 transition-colors">
            <User className="w-6 h-6 mb-1" />
            <span className="text-[10px] font-medium">Profile</span>
          </button>
        </div>
      </nav>
    </div>
  )
}
