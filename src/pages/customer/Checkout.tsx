import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useCart } from '../../contexts/CartContext'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabase'
import { MapPin, CreditCard, Wallet, AlertCircle, CheckCircle2 } from 'lucide-react'
import { motion } from 'framer-motion'

export default function Checkout() {
  const { items, cartTotal, clearCart } = useCart()
  const { user } = useAuth()
  const navigate = useNavigate()
  
  const [paymentMethod, setPaymentMethod] = useState<'ONLINE' | 'COD'>('COD')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')
  const [name, setName] = useState('')
  const [street, setStreet] = useState('')
  const [city, setCity] = useState('')
  const [zip, setZip] = useState('')

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return
    setLoading(true)
    setError('')

    try {
      // 1. Create address
      const { data: address, error: addrErr } = await supabase
        .from('addresses')
        .insert({ user_id: user.id, street, city, state: 'India', zip_code: zip })
        .select()
        .single()
      if (addrErr) throw addrErr

      // 2. Create order
      const { data: order, error: orderErr } = await supabase
        .from('orders')
        .insert({
          user_id: user.id,
          address_id: address.id,
          total_amount: cartTotal,
          status: paymentMethod === 'COD' ? 'pending' : 'pending',
          payment_method: paymentMethod,
        })
        .select()
        .single()
      if (orderErr) throw orderErr

      // 3. Create order items
      const orderItems = items.map(item => ({
        order_id: order.id,
        product_id: item.product.id,
        quantity: item.quantity,
        price_at_time: item.product.price,
      }))
      const { error: itemsErr } = await supabase.from('order_items').insert(orderItems)
      if (itemsErr) throw itemsErr

      setSuccess(true)
      clearCart()
    } catch (err: any) {
      setError(err.message || 'Failed to place order')
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex flex-col items-center justify-center text-center py-20 px-4 min-h-[70vh]"
      >
        <div className="w-24 h-24 bg-emerald-100 rounded-full flex items-center justify-center mb-6 shadow-lg shadow-emerald-500/20">
          <CheckCircle2 className="w-12 h-12 text-emerald-600" />
        </div>
        <h2 className="text-3xl font-extrabold text-gray-900 mb-4">Order Placed!</h2>
        <p className="text-gray-500 mb-8 max-w-sm">Your order has been placed. You'll receive a tracking link when it's out for delivery.</p>
        <button 
          onClick={() => navigate('/customer')}
          className="bg-primary-600 text-white px-8 py-3.5 rounded-xl font-bold shadow-md hover:bg-primary-700 transition"
        >
          Back to Shop
        </button>
      </motion.div>
    )
  }

  if (items.length === 0) {
    navigate('/customer')
    return null
  }

  return (
    <div className="space-y-6 pb-12">
      <h2 className="text-2xl font-bold text-gray-900">Checkout</h2>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl p-3 flex items-start">
          <AlertCircle className="w-4 h-4 mr-2 mt-0.5 flex-shrink-0" /> {error}
        </div>
      )}

      <form onSubmit={handleCheckout} className="space-y-8">
        {/* Address Card */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
          <div className="flex items-center mb-4">
            <div className="bg-primary-50 p-2 rounded-lg mr-3"><MapPin className="w-5 h-5 text-primary-600" /></div>
            <h3 className="font-bold text-gray-900">Delivery Address</h3>
          </div>
          <div className="space-y-3">
            <input required type="text" placeholder="Full Name" value={name} onChange={e => setName(e.target.value)} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
            <input required type="text" placeholder="Street Address" value={street} onChange={e => setStreet(e.target.value)} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
            <div className="grid grid-cols-2 gap-3">
              <input required type="text" placeholder="City" value={city} onChange={e => setCity(e.target.value)} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
              <input required type="text" placeholder="ZIP Code" value={zip} onChange={e => setZip(e.target.value)} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
            </div>
          </div>
        </div>

        {/* Payment Method */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
          <h3 className="font-bold text-gray-900 mb-4">Payment Method</h3>
          <div className="space-y-3">
            <label className={`flex items-center p-4 border rounded-xl cursor-pointer transition-all ${paymentMethod === 'COD' ? 'bg-primary-50 border-primary-500 ring-1 ring-primary-500' : 'bg-white border-gray-200 hover:bg-gray-50'}`}>
              <input type="radio" name="payment" value="COD" checked={paymentMethod === 'COD'} onChange={() => setPaymentMethod('COD')} className="sr-only" />
              <div className={`w-5 h-5 rounded-full border flex items-center justify-center mr-4 ${paymentMethod === 'COD' ? 'border-primary-600' : 'border-gray-300'}`}>
                {paymentMethod === 'COD' && <div className="w-2.5 h-2.5 rounded-full bg-primary-600" />}
              </div>
              <Wallet className={`w-5 h-5 mr-3 ${paymentMethod === 'COD' ? 'text-primary-600' : 'text-gray-400'}`} />
              <span className={`font-semibold ${paymentMethod === 'COD' ? 'text-primary-900' : 'text-gray-700'}`}>Cash on Delivery</span>
            </label>
            <label className={`flex items-center p-4 border rounded-xl cursor-pointer transition-all ${paymentMethod === 'ONLINE' ? 'bg-primary-50 border-primary-500 ring-1 ring-primary-500' : 'bg-white border-gray-200 hover:bg-gray-50'}`}>
              <input type="radio" name="payment" value="ONLINE" checked={paymentMethod === 'ONLINE'} onChange={() => setPaymentMethod('ONLINE')} className="sr-only" />
              <div className={`w-5 h-5 rounded-full border flex items-center justify-center mr-4 ${paymentMethod === 'ONLINE' ? 'border-primary-600' : 'border-gray-300'}`}>
                {paymentMethod === 'ONLINE' && <div className="w-2.5 h-2.5 rounded-full bg-primary-600" />}
              </div>
              <CreditCard className={`w-5 h-5 mr-3 ${paymentMethod === 'ONLINE' ? 'text-primary-600' : 'text-gray-400'}`} />
              <span className={`font-semibold ${paymentMethod === 'ONLINE' ? 'text-primary-900' : 'text-gray-700'}`}>Online (UPI / Cards)</span>
            </label>
          </div>
        </div>

        {/* Amount Summary */}
        <div className="bg-slate-900 text-white rounded-2xl p-5 shadow-xl">
          <div className="flex justify-between items-center mb-6">
            <span className="text-slate-400 font-medium">To Pay</span>
            <span className="text-2xl font-black">₹{cartTotal.toLocaleString()}</span>
          </div>
          <button 
            type="submit"
            disabled={loading}
            className="w-full bg-primary-500 hover:bg-primary-400 text-white py-3.5 rounded-xl font-bold shadow-lg shadow-primary-500/30 transition-all active:scale-[0.98] disabled:opacity-70 flex items-center justify-center"
          >
            {loading ? 'Placing Order...' : `Place Order • ₹${cartTotal.toLocaleString()}`}
          </button>
          {paymentMethod === 'COD' && (
            <div className="flex items-center justify-center mt-4 text-xs text-slate-400 font-medium">
              <AlertCircle className="w-4 h-4 mr-1.5" /> Please keep exact change ready
            </div>
          )}
        </div>
      </form>
    </div>
  )
}
