import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft, IndianRupee, CheckCircle2, XCircle, Loader2, Clock, Package, RefreshCw, X, Phone } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'

type RawStop = {
  stop_id: string
  stop_status: string
  customer_name: string | null
  customer_phone: string | null
  address_street: string | null
  address_city: string | null
  total_amount: number
  payment_method: string
  updated_at: string | null
}

type FilterKey = 'delivered' | 'failed' | 'rescheduled' | 'pending'

function formatTime(ts: string | null) {
  if (!ts) return '—'
  return new Date(ts).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })
}

function StopSheet({ stops, title, onClose }: { stops: RawStop[]; title: string; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end bg-black/50" onClick={onClose}>
      <motion.div
        initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 30, stiffness: 300 }}
        className="bg-white rounded-t-3xl w-full max-h-[80vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-gray-100 flex-shrink-0">
          <h3 className="font-bold text-gray-900 text-lg">{title}</h3>
          <button onClick={onClose} className="p-1 text-gray-400"><X className="w-5 h-5" /></button>
        </div>
        <div className="overflow-y-auto flex-1 px-5 py-3 space-y-3 pb-24">
          {stops.length === 0 && (
            <p className="text-center text-gray-400 py-8">No stops in this category.</p>
          )}
          {stops.map(s => (
            <div key={s.stop_id} className="border border-gray-100 rounded-2xl p-4 bg-gray-50">
              <div className="flex items-start justify-between mb-1">
                <span className="font-bold text-gray-900">{s.customer_name || 'Customer'}</span>
                <span className="text-xs text-gray-400">{formatTime(s.updated_at)}</span>
              </div>
              {(s.address_street || s.address_city) && (
                <p className="text-xs text-gray-500 mb-2">{[s.address_street, s.address_city].filter(Boolean).join(', ')}</p>
              )}
              <div className="flex items-center gap-3 flex-wrap">
                {s.customer_phone && (
                  <a href={`tel:${s.customer_phone}`} className="flex items-center gap-1 text-xs text-primary-600 font-semibold">
                    <Phone className="w-3 h-3" /> {s.customer_phone}
                  </a>
                )}
                <span className={`text-xs font-bold px-2 py-0.5 rounded-md ${
                  s.payment_method === 'COD' ? 'bg-orange-50 text-orange-600' : 'bg-emerald-50 text-emerald-600'
                }`}>
                  {s.payment_method === 'COD' ? 'COD' : 'Paid Online'}
                </span>
                <span className="text-xs font-bold text-gray-700 flex items-center">
                  <IndianRupee className="w-3 h-3" />{Number(s.total_amount).toLocaleString()}
                </span>
              </div>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  )
}

export default function CashSummary() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [rawStops, setRawStops] = useState<RawStop[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [activeFilter, setActiveFilter] = useState<FilterKey | null>(null)

  useEffect(() => { if (user) loadSummary() }, [user])

  async function loadSummary() {
    setLoading(true)
    setLoadError('')
    const { data, error } = await supabase.rpc('get_driver_today_stops')
    if (error) { setLoadError(error.message); setLoading(false); return }
    setRawStops((data || []) as RawStop[])
    setLoading(false)
  }

  if (loading) return (
    <div className="flex items-center justify-center py-24">
      <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
    </div>
  )

  if (loadError) return (
    <div className="flex flex-col items-center justify-center py-24 text-center px-4">
      <XCircle className="w-16 h-16 text-red-300 mb-4" />
      <p className="text-gray-500 text-sm mb-6">{loadError}</p>
      <button onClick={loadSummary} className="bg-slate-900 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2">
        <RefreshCw className="w-4 h-4" /> Retry
      </button>
    </div>
  )

  const delivered   = rawStops.filter(s => s.stop_status === 'delivered')
  const failed      = rawStops.filter(s => s.stop_status === 'failed')
  const rescheduled = rawStops.filter(s => s.stop_status === 'rescheduled')
  const pending     = rawStops.filter(s => s.stop_status === 'pending')

  const codCollected = delivered.filter(s => s.payment_method === 'COD').reduce((sum, s) => sum + Number(s.total_amount), 0)
  const onlineTotal  = delivered.filter(s => s.payment_method !== 'COD').reduce((sum, s) => sum + Number(s.total_amount), 0)

  const sheetData: Record<FilterKey, { title: string; stops: RawStop[] }> = {
    delivered:   { title: `Delivered (${delivered.length})`,     stops: delivered },
    failed:      { title: `Failed (${failed.length})`,           stops: failed },
    rescheduled: { title: `Rescheduled (${rescheduled.length})`, stops: rescheduled },
    pending:     { title: `Pending (${pending.length})`,          stops: pending },
  }

  return (
    <div className="space-y-4 pb-28">
      <button onClick={() => navigate('/driver')} className="flex items-center text-sm font-medium text-gray-500 hover:text-gray-700 mb-2">
        <ArrowLeft className="w-4 h-4 mr-1" /> Back to route
      </button>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center justify-between mb-1">
          <h2 className="text-2xl font-extrabold text-gray-900">End-of-Day Summary</h2>
          <button onClick={loadSummary} className="text-gray-400 hover:text-gray-600 p-1">
            <RefreshCw className="w-5 h-5" />
          </button>
        </div>
        <p className="text-gray-500 text-sm mb-6">Tap a card to see order details.</p>
      </motion.div>

      {/* Stats Grid — clickable */}
      <div className="grid grid-cols-4 gap-2">
        {([
          { key: 'delivered'   as FilterKey, label: 'Delivered',  value: delivered.length,   icon: <CheckCircle2 className="w-5 h-5 text-emerald-600" />, color: 'bg-emerald-50 border-emerald-200 text-emerald-700' },
          { key: 'failed'      as FilterKey, label: 'Failed',     value: failed.length,      icon: <XCircle      className="w-5 h-5 text-red-600" />,     color: 'bg-red-50 border-red-200 text-red-700' },
          { key: 'rescheduled' as FilterKey, label: 'Reschedule', value: rescheduled.length, icon: <Clock        className="w-5 h-5 text-orange-600" />,  color: 'bg-orange-50 border-orange-200 text-orange-700' },
          { key: 'pending'     as FilterKey, label: 'Pending',    value: pending.length,     icon: <Package      className="w-5 h-5 text-gray-400" />,    color: 'bg-gray-50 border-gray-200 text-gray-700' },
        ]).map(({ key, label, value, icon, color }) => (
          <button
            key={key}
            onClick={() => setActiveFilter(key)}
            className={`${color} border rounded-2xl p-3 flex flex-col items-center active:scale-95 transition-all`}
          >
            {icon}
            <span className="text-xl font-black mt-1">{value}</span>
            <span className="text-[9px] font-bold uppercase tracking-wider">{label}</span>
          </button>
        ))}
      </div>

      {/* Payment breakdown */}
      <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm space-y-3">
        <h3 className="font-bold text-gray-900 text-sm">Payment Breakdown</h3>
        <div className="flex items-center justify-between py-2 border-b border-gray-100 text-sm">
          <span className="text-gray-600">Cash (COD) Collected</span>
          <span className="font-bold text-gray-900 flex items-center">
            <IndianRupee className="w-3.5 h-3.5 mr-0.5" /> {codCollected.toLocaleString()}
          </span>
        </div>
        <div className="flex items-center justify-between py-2 text-sm">
          <span className="text-gray-600">Online (Pre-paid)</span>
          <span className="font-bold text-gray-900 flex items-center">
            <IndianRupee className="w-3.5 h-3.5 mr-0.5" /> {onlineTotal.toLocaleString()}
          </span>
        </div>
      </div>

      {/* Total Card */}
      <div className="bg-slate-900 text-white rounded-2xl p-5 shadow-xl">
        <div className="flex justify-between items-end">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">To Hand Over</span>
            <div className="text-2xl font-black mt-1 flex items-center text-emerald-400">
              <IndianRupee className="w-5 h-5 mr-0.5" /> {codCollected.toLocaleString()}
            </div>
          </div>
          <div className="text-right">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Progress</span>
            <div className="text-lg font-bold text-white mt-1">{delivered.length}/{rawStops.length}</div>
          </div>
        </div>
      </div>

      {/* Order detail sheet */}
      <AnimatePresence>
        {activeFilter && (
          <StopSheet
            stops={sheetData[activeFilter].stops}
            title={sheetData[activeFilter].title}
            onClose={() => setActiveFilter(null)}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
