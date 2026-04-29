import { useNavigate } from 'react-router-dom'
import { useCart } from '../../contexts/CartContext'
import { Trash2, ArrowRight } from 'lucide-react'
import { motion } from 'framer-motion'

export default function Cart() {
  const { items, removeFromCart, cartTotal } = useCart()
  const navigate = useNavigate()

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center text-center py-20 px-4">
        <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-6">
          <Trash2 className="w-10 h-10 text-gray-300" />
        </div>
        <h3 className="text-xl font-bold text-gray-900 mb-2">Your cart is empty</h3>
        <p className="text-gray-500 mb-8 max-w-xs">Looks like you haven't added anything to your cart yet.</p>
        <button 
          onClick={() => navigate('/customer')}
          className="bg-primary-600 text-white px-6 py-3 rounded-xl font-medium shadow-sm hover:bg-primary-700 transition"
        >
          Start Shopping
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">Your Cart</h2>
      
      <div className="space-y-4">
        {items.map((item, i) => (
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.1 }}
            key={item.product.id} 
            className="flex items-center bg-white p-3 rounded-2xl border border-gray-100 shadow-sm"
          >
            <img src={item.product.image_url} alt={item.product.name} className="w-20 h-20 object-cover rounded-xl bg-gray-50" />
            <div className="ml-4 flex-1">
              <h4 className="font-semibold text-gray-900 line-clamp-1 text-sm">{item.product.name}</h4>
              <p className="text-primary-600 font-bold mt-1">₹{item.product.price}</p>
              <div className="flex items-center mt-2 space-x-2 text-xs text-gray-500 font-medium tracking-wide">
                <span>Qty: {item.quantity}</span>
              </div>
            </div>
            <button 
              onClick={() => removeFromCart(item.product.id)}
              className="p-2 text-red-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors ml-2"
            >
              <Trash2 className="w-5 h-5" />
            </button>
          </motion.div>
        ))}
      </div>

      <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-lg shadow-gray-200/40">
        <div className="flex justify-between items-center mb-2">
          <span className="text-gray-500">Subtotal</span>
          <span className="font-semibold">₹{cartTotal}</span>
        </div>
        <div className="flex justify-between items-center mb-4">
          <span className="text-gray-500">Delivery</span>
          <span className="font-semibold text-emerald-600">Free</span>
        </div>
        <div className="border-t border-gray-100 pt-4 flex justify-between items-center mb-6">
          <span className="text-lg font-bold text-gray-900">Total</span>
          <span className="text-2xl font-bold text-primary-600">₹{cartTotal}</span>
        </div>
        
        <button 
          onClick={() => navigate('/customer/checkout')}
          className="w-full bg-primary-600 text-white py-3.5 rounded-xl font-bold shadow-md hover:bg-primary-700 transition flex items-center justify-center group"
        >
          Checkout <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
        </button>
      </div>
    </div>
  )
}
