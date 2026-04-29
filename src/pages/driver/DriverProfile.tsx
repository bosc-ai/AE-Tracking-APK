import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  User, Phone, Mail, MapPin, Package, CheckCircle2, XCircle,
  IndianRupee, Loader2, TrendingUp, RefreshCw, X, Clock, Camera,
} from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'

type Profile = {
  name: string
  email: string
  phone: string
  total_stops: number
  delivered: number
  failed: number
  rescheduled: number
  cod_collected: number
  delivery_rate: number
  active_route: string | null
}

type HistoryStop = {
  stop_id: string
  stop_status: string
  customer_name: string | null
  customer_phone: string | null
  address_street: string | null
  address_city: string | null
  total_amount: number
  payment_method: string
  route_date: string
  updated_at: string | null
}

type FilterKey = 'all' | 'delivered' | 'failed' | 'rescheduled' | 'cod'

function formatDateTime(ts: string | null) {
  if (!ts) return '—'
  const d = new Date(ts)
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) + ' · ' +
    d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })
}

function StopSheet({ stops, title, onClose }: { stops: HistoryStop[]; title: string; onClose: () => void }) {
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
            <p className="text-center text-gray-400 py-8">No records yet.</p>
          )}
          {stops.map(s => (
            <div key={s.stop_id} className="border border-gray-100 rounded-2xl p-4 bg-gray-50">
              <div className="flex items-start justify-between mb-1">
                <span className="font-bold text-gray-900">{s.customer_name || 'Customer'}</span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  s.stop_status === 'delivered' ? 'bg-emerald-100 text-emerald-700' :
                  s.stop_status === 'failed'    ? 'bg-red-100 text-red-700' :
                  'bg-orange-100 text-orange-700'
                }`}>
                  {s.stop_status.toUpperCase()}
                </span>
              </div>
              {(s.address_street || s.address_city) && (
                <p className="text-xs text-gray-500 mb-2">{[s.address_street, s.address_city].filter(Boolean).join(', ')}</p>
              )}
              <div className="flex items-center gap-3 flex-wrap mt-1">
                <span className="flex items-center text-xs text-gray-500">
                  <Clock className="w-3 h-3 mr-1" />{formatDateTime(s.updated_at)}
                </span>
                {s.customer_phone && (
                  <a href={`tel:${s.customer_phone}`} className="flex items-center gap-1 text-xs text-primary-600 font-semibold">
                    <Phone className="w-3 h-3" />{s.customer_phone}
                  </a>
                )}
              </div>
              <div className="flex items-center gap-3 mt-2">
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

export default function DriverProfile() {
  const { user } = useAuth()
  const [profile, setProfile]       = useState<Profile | null>(null)
  const [history, setHistory]       = useState<HistoryStop[]>([])
  const [loading, setLoading]       = useState(true)
  const [loadError, setLoadError]   = useState('')
  const [activeFilter, setActiveFilter] = useState<FilterKey | null>(null)
  const [avatarUrl, setAvatarUrl]   = useState<string | null>(null)
  const [uploading, setUploading]   = useState(false)
  const avatarInputRef              = useRef<HTMLInputElement>(null)

  useEffect(() => { if (user) load() }, [user])

  async function load() {
    setLoading(true)
    setLoadError('')
    const [profileRes, historyRes, avatarRes] = await Promise.all([
      supabase.rpc('get_driver_profile'),
      supabase.rpc('get_driver_all_stops'),
      supabase.from('profiles').select('avatar_url').eq('id', user!.id).single(),
    ])
    if (profileRes.error) { setLoadError(profileRes.error.message); setLoading(false); return }
    if (profileRes.data && profileRes.data.length > 0) setProfile(profileRes.data[0] as Profile)
    if (!historyRes.error && historyRes.data) setHistory(historyRes.data as HistoryStop[])
    if (avatarRes.data?.avatar_url) setAvatarUrl(avatarRes.data.avatar_url)
    setLoading(false)
  }

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !user) return
    setUploading(true)
    const path = `${user.id}/avatar.${file.name.split('.').pop() || 'jpg'}`
    const { error: upErr } = await supabase.storage.from('avatars').upload(path, file, { upsert: true, contentType: file.type })
    if (!upErr) {
      const { data } = supabase.storage.from('avatars').getPublicUrl(path)
      const url = data.publicUrl + '?t=' + Date.now()
      await supabase.from('profiles').update({ avatar_url: url }).eq('id', user.id)
      setAvatarUrl(url)
    }
    setUploading(false)
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
      <button onClick={load} className="bg-slate-900 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2">
        <RefreshCw className="w-4 h-4" /> Retry
      </button>
    </div>
  )

  if (!profile) return (
    <div className="text-center py-24 text-gray-500">
      <User className="w-12 h-12 mx-auto mb-3 text-gray-300" />
      <p>Profile not found.</p>
      <button onClick={load} className="mt-4 text-primary-600 font-semibold flex items-center gap-1.5 mx-auto">
        <RefreshCw className="w-4 h-4" /> Retry
      </button>
    </div>
  )

  const p = profile
  const deliveryRate = p.delivery_rate ?? (p.total_stops > 0 ? Math.round((p.delivered / p.total_stops) * 100) : 0)

  const codStops = history.filter(s => s.stop_status === 'delivered' && s.payment_method === 'COD')

  const filterMap: Record<FilterKey, HistoryStop[]> = {
    all:         history,
    delivered:   history.filter(s => s.stop_status === 'delivered'),
    failed:      history.filter(s => s.stop_status === 'failed'),
    rescheduled: history.filter(s => s.stop_status === 'rescheduled'),
    cod:         codStops,
  }

  const sheetTitle: Record<FilterKey, string> = {
    all:         `All Stops (${history.length})`,
    delivered:   `Delivered (${p.delivered})`,
    failed:      `Failed (${p.failed})`,
    rescheduled: `Rescheduled (${p.rescheduled})`,
    cod:         `COD Collected (${codStops.length} orders)`,
  }

  return (
    <div className="space-y-4 pb-28">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center justify-between mb-1">
          <h2 className="text-2xl font-extrabold text-gray-900">My Profile</h2>
          <button onClick={load} className="text-gray-400 hover:text-gray-600 p-1">
            <RefreshCw className="w-5 h-5" />
          </button>
        </div>
        <p className="text-gray-500 text-sm mb-4">Tap a card to see order details.</p>
      </motion.div>

      {/* Identity card */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
        className="bg-slate-900 text-white rounded-2xl p-5 shadow-xl">
        <div className="flex items-center mb-4">
          {/* Avatar with upload overlay */}
          <div className="relative mr-4 flex-shrink-0">
            <div className="w-16 h-16 bg-slate-700 rounded-full overflow-hidden flex items-center justify-center">
              {avatarUrl
                ? <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                : <span className="text-2xl font-black">{p.name ? p.name[0].toUpperCase() : 'D'}</span>
              }
            </div>
            <button
              onClick={() => avatarInputRef.current?.click()}
              disabled={uploading}
              className="absolute -bottom-1 -right-1 w-7 h-7 bg-primary-600 rounded-full flex items-center justify-center shadow-lg border-2 border-slate-900 active:scale-90 transition-transform"
            >
              {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin text-white" /> : <Camera className="w-3.5 h-3.5 text-white" />}
            </button>
            <input ref={avatarInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
          </div>
          <div>
            <div className="text-lg font-extrabold">{p.name || 'Driver'}</div>
            {p.active_route && (
              <div className="text-xs text-emerald-400 font-semibold mt-0.5 flex items-center">
                <MapPin className="w-3 h-3 mr-1" /> Route active today
              </div>
            )}
          </div>
        </div>
        <div className="space-y-2">
          {p.email && (
            <div className="flex items-center text-sm text-slate-300">
              <Mail className="w-4 h-4 mr-2 text-slate-500" /> {p.email}
            </div>
          )}
          {p.phone && (
            <div className="flex items-center text-sm text-slate-300">
              <Phone className="w-4 h-4 mr-2 text-slate-500" /> {p.phone}
            </div>
          )}
        </div>
      </motion.div>

      {/* Stats grid — clickable */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
        className="grid grid-cols-2 gap-3">
        {([
          { key: 'all'         as FilterKey, label: 'Total Stops', value: p.total_stops,                                   icon: <Package      className="w-5 h-5" />, color: 'bg-blue-50 border-blue-200 text-blue-700' },
          { key: 'delivered'   as FilterKey, label: 'Delivered',   value: p.delivered,                                     icon: <CheckCircle2 className="w-5 h-5" />, color: 'bg-emerald-50 border-emerald-200 text-emerald-700' },
          { key: 'failed'      as FilterKey, label: 'Failed',      value: p.failed,                                        icon: <XCircle      className="w-5 h-5" />, color: 'bg-red-50 border-red-200 text-red-700' },
          { key: 'cod'         as FilterKey, label: 'COD Collected', value: `₹${Number(p.cod_collected || 0).toLocaleString()}`, icon: <IndianRupee  className="w-5 h-5" />, color: 'bg-orange-50 border-orange-200 text-orange-700' },
        ]).map(({ key, label, value, icon, color }) => (
          <button
            key={key}
            onClick={() => setActiveFilter(key)}
            className={`border rounded-2xl p-4 ${color} text-left active:scale-95 transition-all`}
          >
            <div className="opacity-60 mb-2">{icon}</div>
            <div className="text-2xl font-black">{value}</div>
            <div className="text-xs font-semibold uppercase tracking-wider mt-1 opacity-70">{label}</div>
          </button>
        ))}
      </motion.div>

      {/* Delivery rate */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
        className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-bold text-gray-900">Overall Delivery Rate</h3>
          <TrendingUp className="w-5 h-5 text-emerald-500" />
        </div>
        <div className="text-4xl font-black text-gray-900 mb-3">{deliveryRate}%</div>
        <div className="w-full bg-gray-100 rounded-full h-3">
          <div
            className="bg-emerald-400 h-3 rounded-full transition-all"
            style={{ width: `${Math.min(Number(deliveryRate), 100)}%` }}
          />
        </div>
        <div className="flex justify-between text-xs text-gray-400 mt-2">
          <span>{p.delivered} delivered of {p.total_stops} total</span>
          <span>{p.rescheduled} rescheduled</span>
        </div>
      </motion.div>

      {/* Order detail sheet */}
      <AnimatePresence>
        {activeFilter && (
          <StopSheet
            stops={filterMap[activeFilter]}
            title={sheetTitle[activeFilter]}
            onClose={() => setActiveFilter(null)}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
