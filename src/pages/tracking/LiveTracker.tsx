import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { 
  MapPin, Phone, Clock, User, Package, 
  CheckCircle2, Truck, Navigation, Shield
} from 'lucide-react'
import { resolveTrackingToken } from '../../lib/tracking'

type TrackingData = Awaited<ReturnType<typeof resolveTrackingToken>>

export default function LiveTracker() {
  const { token } = useParams<{ token: string }>()
  const [data, setData] = useState<TrackingData | null>(null)
  const [loading, setLoading] = useState(true)
  const [expired, setExpired] = useState(false)

  useEffect(() => {
    if (!token) return
    
    const load = async () => {
      try {
        const result = await resolveTrackingToken(token)
        if (result.order.status === 'delivered') {
          setExpired(true)
        }
        setData(result)
      } catch {
        setExpired(true)
      } finally {
        setLoading(false)
      }
    }
    
    load()

    // In production: subscribe to Supabase Realtime channel for driver_locations updates
    // const channel = supabase.channel(`tracking-${token}`)
    //   .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'driver_locations' }, (payload) => {
    //     setData(prev => prev ? { ...prev, lastLocation: { lat: payload.new.lat, lng: payload.new.lng } } : prev)
    //   })
    //   .subscribe()
    
    // Simulate live movement updates
    const interval = setInterval(async () => {
      const updated = await resolveTrackingToken(token)
      setData(updated)
    }, 10000)

    return () => clearInterval(interval)
  }, [token])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex flex-col items-center">
          <div className="w-12 h-12 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin mb-4" />
          <p className="text-gray-500 font-medium">Loading tracking info...</p>
        </div>
      </div>
    )
  }

  if (expired || !data) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="text-center max-w-sm">
          <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <Package className="w-10 h-10 text-gray-300" />
          </div>
          <h1 className="text-2xl font-extrabold text-gray-900 mb-2">Tracking Expired</h1>
          <p className="text-gray-500">This delivery has been completed or the link has expired.</p>
        </div>
      </div>
    )
  }

  const maskPhone = (phone: string) => {
    const digits = phone.replace(/\D/g, '')
    return `${digits.slice(0, 4)}****${digits.slice(-4)}`
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Map placeholder */}
      <div className="relative bg-slate-200 h-[45vh] overflow-hidden">
        {/* In production: render Google Maps JS API here with driver marker + customer marker */}
        <div className="absolute inset-0 bg-gradient-to-b from-slate-300/50 to-slate-200 flex items-center justify-center">
          <div className="text-center">
            <div className="relative">
              {/* Pulsing driver marker */}
              <motion.div
                animate={{ scale: [1, 1.5, 1], opacity: [0.5, 0, 0.5] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="absolute inset-0 bg-primary-500 rounded-full"
              />
              <div className="relative w-14 h-14 bg-primary-600 rounded-full flex items-center justify-center shadow-lg shadow-primary-500/30 border-4 border-white">
                <Truck className="w-6 h-6 text-white" />
              </div>
            </div>
            <p className="text-sm font-medium text-gray-600 mt-4">Live map requires Google Maps API Key</p>
            <p className="text-xs text-gray-400 mt-1">
              Driver: {data.lastLocation.lat.toFixed(4)}, {data.lastLocation.lng.toFixed(4)}
            </p>
          </div>
        </div>

        {/* ETA badge */}
        <motion.div 
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="absolute top-4 left-4 bg-white rounded-xl px-4 py-2 shadow-lg flex items-center"
        >
          <Clock className="w-4 h-4 text-primary-600 mr-2" />
          <span className="font-bold text-gray-900">ETA: {data.eta}</span>
        </motion.div>

        {/* Stops remaining badge */}
        <motion.div
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="absolute top-4 right-4 bg-white rounded-xl px-4 py-2 shadow-lg flex items-center"
        >
          <Navigation className="w-4 h-4 text-orange-500 mr-2" />
          <span className="font-bold text-gray-900">{data.route.stopsBeforeCustomer} stops before you</span>
        </motion.div>
      </div>

      {/* Info panel */}
      <div className="max-w-md mx-auto px-4 -mt-8 relative z-10 space-y-4 pb-8">
        
        {/* Status card */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="bg-white rounded-2xl p-5 shadow-xl border border-gray-100"
        >
          <div className="flex items-center mb-4">
            <div className="w-3 h-3 bg-emerald-500 rounded-full mr-2 animate-pulse" />
            <span className="text-sm font-bold text-emerald-700 uppercase tracking-wide">Out for Delivery</span>
          </div>

          <div className="flex items-center justify-between">
            {/* Driver info */}
            <div className="flex items-center">
              <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mr-3">
                <User className="w-6 h-6 text-gray-500" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900">{data.driver.name}</h3>
                <p className="text-xs text-gray-500">Your delivery partner</p>
              </div>
            </div>

            {/* Masked call button */}
            <a
              href={`tel:${data.driver.phone}`}
              className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center hover:bg-emerald-200 transition-colors shadow-sm"
            >
              <Phone className="w-5 h-5 text-emerald-700" />
            </a>
          </div>

          <div className="mt-4 pt-4 border-t border-gray-100 flex items-center text-xs text-gray-400">
            <Shield className="w-3.5 h-3.5 mr-1" />
            Phone: {maskPhone(data.driver.phone)}
          </div>
        </motion.div>

        {/* Progress tracker */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100"
        >
          <h4 className="font-bold text-gray-900 mb-4">Delivery Progress</h4>
          
          <div className="space-y-4">
            {[
              { label: 'Order Confirmed', done: true, icon: CheckCircle2 },
              { label: 'Out for Delivery', done: true, icon: Truck },
              { label: `${data.route.stopsBeforeCustomer} stops before you`, done: false, icon: MapPin },
              { label: 'Arriving at your location', done: false, icon: Navigation },
            ].map((step, i) => (
              <div key={i} className="flex items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center mr-3 flex-shrink-0 ${
                  step.done ? 'bg-emerald-100 text-emerald-600' : 'bg-gray-100 text-gray-400'
                }`}>
                  <step.icon className="w-4 h-4" />
                </div>
                <span className={`text-sm font-medium ${step.done ? 'text-gray-900' : 'text-gray-400'}`}>
                  {step.label}
                </span>
                {step.done && <CheckCircle2 className="w-4 h-4 text-emerald-500 ml-auto" />}
              </div>
            ))}
          </div>
        </motion.div>

        {/* Order ID footer */}
        <div className="text-center text-xs text-gray-400 pt-2">
          Order: {data.order.id} • ₹{data.order.total_amount.toLocaleString()}
        </div>
      </div>
    </div>
  )
}
