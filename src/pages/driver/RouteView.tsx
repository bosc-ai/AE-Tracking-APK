import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  Navigation, IndianRupee, ChevronRight, CheckCircle2,
  XCircle, Clock, Package, Loader2, RefreshCw,
} from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'

export type Stop = {
  id: string
  order_id: string
  sequence: number
  customerName: string
  customerPhone: string
  address: string
  notes: string | null
  codAmount: number
  paymentMethod: string
  status: 'pending' | 'delivered' | 'failed' | 'rescheduled'
}

const STATUS_BG: Record<Stop['status'], string> = {
  delivered:   'bg-emerald-50 border-emerald-200',
  failed:      'bg-red-50 border-red-200',
  rescheduled: 'bg-orange-50 border-orange-200',
  pending:     'bg-white border-gray-200',
}

const STATUS_CIRCLE: Record<Stop['status'], string> = {
  delivered:   'bg-emerald-500 text-white',
  failed:      'bg-red-500 text-white',
  rescheduled: 'bg-orange-400 text-white',
  pending:     'bg-gray-200 text-gray-700',
}

function StatusIcon({ status }: { status: Stop['status'] }) {
  if (status === 'delivered')   return <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0" />
  if (status === 'failed')      return <XCircle      className="w-5 h-5 text-red-500 flex-shrink-0" />
  if (status === 'rescheduled') return <Clock        className="w-5 h-5 text-orange-500 flex-shrink-0" />
  return <Package className="w-5 h-5 text-gray-400 flex-shrink-0" />
}

export default function RouteView() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [stops, setStops]       = useState<Stop[]>([])
  const [loading, setLoading]   = useState(true)
  const [noRoute, setNoRoute]   = useState(false)
  const [loadError, setLoadError] = useState('')

  useEffect(() => { if (user) loadTodayRoute() }, [user, location.key])

  async function loadTodayRoute() {
    setLoading(true)
    setLoadError('')
    const { data, error } = await supabase.rpc('get_driver_today_stops')
    if (error) { setLoadError(error.message); setLoading(false); return }

    if (!data || data.length === 0) { setNoRoute(true); setLoading(false); return }

    setStops(data.map((s: any) => ({
      id:           s.stop_id,
      order_id:     s.order_id,
      sequence:     s.stop_sequence,
      customerName: s.customer_name || 'Customer',
      customerPhone:s.customer_phone || '',
      address:      s.address_street
        ? `${s.address_street}, ${s.address_city}${s.address_landmark ? ' · ' + s.address_landmark : ''}`
        : 'No address',
      notes:        s.notes || null,
      codAmount:    s.payment_method === 'COD' ? Number(s.total_amount) : 0,
      paymentMethod:s.payment_method || 'COD',
      status:       (s.stop_status || 'pending').toLowerCase() as Stop['status'],
    })))
    setNoRoute(false)
    setLoading(false)
  }

  const completedCount    = stops.filter(s => s.status === 'delivered').length
  const totalCODCollected = stops.filter(s => s.status === 'delivered').reduce((sum, s) => sum + s.codAmount, 0)
  const totalCODPending   = stops.filter(s => s.status === 'pending').reduce((sum, s) => sum + s.codAmount, 0)
  const remainingCount    = stops.filter(s => s.status === 'pending').length
  const progressPct       = stops.length ? (completedCount / stops.length) * 100 : 0

  if (loading) return (
    <div className="flex items-center justify-center" style={{ minHeight: '60vh' }}>
      <Loader2 className="w-10 h-10 animate-spin text-primary-600" />
    </div>
  )

  if (loadError) return (
    <div className="flex flex-col items-center justify-center text-center px-6" style={{ minHeight: '60vh' }}>
      <XCircle className="w-16 h-16 text-red-300 mb-4" />
      <h3 className="text-xl font-bold text-gray-700 mb-2">Failed to load route</h3>
      <p className="text-gray-400 text-sm mb-8">{loadError}</p>
      <button onClick={loadTodayRoute} className="bg-slate-900 text-white px-8 py-4 rounded-2xl font-bold flex items-center gap-2 text-base">
        <RefreshCw className="w-5 h-5" /> Try Again
      </button>
    </div>
  )

  if (noRoute || stops.length === 0) return (
    <div className="flex flex-col items-center justify-center text-center px-6" style={{ minHeight: '60vh' }}>
      <Package className="w-20 h-20 text-gray-200 mb-5" />
      <h3 className="text-xl font-bold text-gray-700 mb-2">No route today</h3>
      <p className="text-gray-400 text-sm mb-8 leading-relaxed">Your admin hasn't assigned a delivery route yet. Check back soon.</p>
      <button onClick={loadTodayRoute} className="text-primary-600 font-bold flex items-center gap-2 py-3 px-5 rounded-xl border border-primary-200 bg-primary-50">
        <RefreshCw className="w-4 h-4" /> Refresh
      </button>
    </div>
  )

  if (stops.every(s => s.status !== 'pending')) return (
    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
      className="flex flex-col items-center justify-center text-center px-6" style={{ minHeight: '60vh' }}>
      <div className="w-28 h-28 bg-emerald-100 rounded-full flex items-center justify-center mb-6 shadow-xl shadow-emerald-200">
        <CheckCircle2 className="w-14 h-14 text-emerald-600" />
      </div>
      <h2 className="text-3xl font-black text-gray-900 mb-2">All Done!</h2>
      <p className="text-gray-500 mb-1">{stops.filter(s => s.status === 'delivered').length} of {stops.length} delivered</p>
      <p className="text-emerald-600 font-black text-xl mb-10">₹{totalCODCollected.toLocaleString()} collected</p>
      <button onClick={() => navigate('/driver/summary')}
        className="w-full bg-slate-900 text-white py-4 rounded-2xl font-bold text-base shadow-xl mb-3">
        View Cash Summary
      </button>
      <button onClick={loadTodayRoute} className="text-gray-400 font-semibold text-sm flex items-center gap-1.5 py-2">
        <RefreshCw className="w-4 h-4" /> Refresh
      </button>
    </motion.div>
  )

  return (
    <div className="space-y-4 pb-4">
      {/* Progress card */}
      <div className="bg-slate-900 rounded-2xl p-5 text-white shadow-xl">
        <div className="flex justify-between items-start mb-4">
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Today's Route</span>
            <h2 className="text-3xl font-black mt-0.5 leading-tight">{completedCount} / {stops.length}</h2>
            <span className="text-slate-400 text-sm font-medium">stops delivered</span>
          </div>
          <div className="text-right">
            <button onClick={loadTodayRoute} className="text-slate-600 mb-2 flex justify-end ml-auto p-1">
              <RefreshCw className="w-4 h-4" />
            </button>
            <span className="text-[11px] text-slate-400 font-medium block">COD Collected</span>
            <span className="text-2xl font-black text-emerald-400 flex items-center justify-end">
              <IndianRupee className="w-4 h-4 mr-0.5" />{totalCODCollected.toLocaleString()}
            </span>
          </div>
        </div>
        {/* Progress bar */}
        <div className="w-full bg-slate-700 rounded-full h-3 mb-2">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${progressPct}%` }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
            className="bg-emerald-400 h-3 rounded-full"
          />
        </div>
        <div className="flex justify-between text-xs text-slate-500 font-medium">
          <span>Pending COD: ₹{totalCODPending.toLocaleString()}</span>
          <span>{remainingCount} remaining</span>
        </div>
      </div>

      {/* Stop list */}
      <div className="space-y-3">
        {stops.map((stop, i) => (
          <motion.div
            key={stop.id}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.04 }}
            onClick={() => navigate(`/driver/stop/${stop.id}`)}
            className={`relative border rounded-2xl p-4 shadow-sm active:scale-[0.98] transition-transform ${STATUS_BG[stop.status]}`}
          >
            <div className="flex items-start gap-3">
              {/* Sequence badge */}
              <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-black ${STATUS_CIRCLE[stop.status]}`}>
                {stop.sequence}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2 mb-0.5">
                  <h4 className="font-bold text-gray-900 text-base truncate">{stop.customerName}</h4>
                  <StatusIcon status={stop.status} />
                </div>
                <p className="text-sm text-gray-500 truncate">{stop.address}</p>
                {stop.notes && (
                  <p className="text-xs text-amber-700 bg-amber-50 rounded-lg px-2 py-1 mt-1.5 truncate">{stop.notes}</p>
                )}
                <div className="flex items-center mt-2 gap-2 flex-wrap">
                  {stop.codAmount > 0 && (
                    <span className="text-xs font-bold text-orange-600 bg-orange-50 border border-orange-100 px-2 py-1 rounded-lg flex items-center">
                      <IndianRupee className="w-3 h-3 mr-0.5" />{stop.codAmount.toLocaleString()} COD
                    </span>
                  )}
                  {stop.paymentMethod === 'ONLINE' && (
                    <span className="text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-100 px-2 py-1 rounded-lg">Paid Online</span>
                  )}
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-300 flex-shrink-0 mt-1" />
            </div>

            {stop.status === 'pending' && (
              <button
                onClick={e => {
                  e.stopPropagation()
                  window.open(`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(stop.address)}`, '_blank')
                }}
                className="mt-3 w-full bg-primary-600 text-white py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 active:bg-primary-700 transition-colors"
              >
                <Navigation className="w-4 h-4" /> Navigate
              </button>
            )}
          </motion.div>
        ))}
      </div>
    </div>
  )
}
