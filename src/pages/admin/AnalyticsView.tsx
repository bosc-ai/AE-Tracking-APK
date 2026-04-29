import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../../lib/supabase'
import {
  IndianRupee, Package, Truck, TrendingUp, CheckCircle2,
  Clock, XCircle, RefreshCw, Loader2, X, Trophy, Phone,
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

type Analytics = {
  total_orders: number; orders_today: number; pending: number; shipped: number
  delivered: number; failed: number; revenue_total: number; revenue_today: number
  cod_orders: number; online_orders: number; drivers_count: number
  active_routes: number; cod_collected: number
}

type Order = {
  id: string; customer_name: string | null; customer_phone: string | null
  total_amount: number; status: string; payment_method: string
  created_at: string; street?: string; city?: string
}

type DriverStat = {
  driver_name: string; total_stops: number; delivered: number
  failed: number; delivery_rate: number; cod_collected: number
}

type Panel = { title: string; subtitle: string; filter: (o: Order) => boolean } | null

const fmt = (n: number) => Number(n).toLocaleString('en-IN')
const fmtTime = (ts: string) =>
  new Date(ts).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', hour12: true })

// ── Clickable stat card ─────────────────────────────────────────
function StatCard({ icon, label, value, sub, color = 'gray', onClick }: {
  icon: React.ReactNode; label: string; value: string | number
  sub?: string; color?: string; onClick?: () => void
}) {
  const bg: Record<string, string> = {
    blue: 'bg-blue-50 border-blue-200', emerald: 'bg-emerald-50 border-emerald-200',
    orange: 'bg-orange-50 border-orange-200', purple: 'bg-purple-50 border-purple-200',
    red: 'bg-red-50 border-red-200', gray: 'bg-gray-50 border-gray-200',
  }
  return (
    <button
      onClick={onClick}
      className={`rounded-2xl border p-5 text-left w-full transition-all ${bg[color] || bg.gray} ${
        onClick ? 'active:scale-[0.97] hover:shadow-md cursor-pointer' : 'cursor-default'
      }`}
    >
      <div className="flex items-center justify-between mb-3">
        <span className="text-gray-500 text-sm font-medium">{label}</span>
        <div className="opacity-50">{icon}</div>
      </div>
      <div className="text-2xl font-black text-gray-900">{value}</div>
      {sub && <div className="text-xs text-gray-500 mt-1">{sub}</div>}
      {onClick && <div className="text-[10px] text-primary-500 font-bold mt-2 uppercase tracking-wider">Tap to view →</div>}
    </button>
  )
}

// ── Order detail panel ──────────────────────────────────────────
function OrderPanel({ panel, orders, loading, onClose }: {
  panel: NonNullable<Panel>; orders: Order[]; loading: boolean; onClose: () => void
}) {
  const filtered = orders.filter(panel.filter)
  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <motion.div
        initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
        transition={{ type: 'spring', damping: 28, stiffness: 260 }}
        className="bg-white w-full max-w-sm h-full flex flex-col shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-start justify-between p-5 border-b border-gray-100">
          <div>
            <h3 className="font-bold text-gray-900 text-lg">{panel.title}</h3>
            <p className="text-gray-500 text-sm mt-0.5">{panel.subtitle}</p>
          </div>
          <button onClick={onClose} className="p-1 text-gray-400 ml-3 mt-0.5"><X className="w-5 h-5" /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {loading && <div className="flex items-center justify-center py-16"><Loader2 className="w-7 h-7 animate-spin text-primary-600" /></div>}
          {!loading && filtered.length === 0 && (
            <div className="text-center py-16 text-gray-400">
              <Package className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="text-sm">No orders in this category.</p>
            </div>
          )}
          {!loading && filtered.map(o => (
            <div key={o.id} className="border border-gray-100 rounded-xl p-4 bg-gray-50">
              <div className="flex items-start justify-between mb-1">
                <span className="font-bold text-gray-900 text-sm">{o.customer_name || 'Customer'}</span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ml-2 flex-shrink-0 ${
                  o.status === 'delivered' ? 'bg-emerald-100 text-emerald-700' :
                  o.status === 'pending'   ? 'bg-orange-100 text-orange-700' :
                  o.status === 'failed'    ? 'bg-red-100 text-red-700' :
                                            'bg-gray-100 text-gray-600'
                }`}>{o.status.toUpperCase()}</span>
              </div>
              {(o.street || o.city) && <p className="text-xs text-gray-400 mb-2">{[o.street, o.city].filter(Boolean).join(', ')}</p>}
              <div className="flex items-center gap-3 flex-wrap">
                <span className="text-xs font-bold text-gray-700 flex items-center"><IndianRupee className="w-3 h-3" />{fmt(o.total_amount)}</span>
                <span className={`text-xs font-bold px-2 py-0.5 rounded-md ${o.payment_method === 'COD' ? 'bg-orange-50 text-orange-600' : 'bg-emerald-50 text-emerald-600'}`}>{o.payment_method}</span>
                {o.customer_phone && (
                  <a href={`tel:${o.customer_phone}`} className="flex items-center gap-1 text-xs text-primary-600 font-semibold">
                    <Phone className="w-3 h-3" />{o.customer_phone}
                  </a>
                )}
              </div>
              <p className="text-[10px] text-gray-400 mt-2">{fmtTime(o.created_at)}</p>
            </div>
          ))}
        </div>
        <div className="p-4 border-t border-gray-100 bg-gray-50">
          <p className="text-center text-sm font-bold text-gray-500">{filtered.length} orders</p>
        </div>
      </motion.div>
    </div>
  )
}

// ── Driver leaderboard ──────────────────────────────────────────
function Leaderboard({ drivers }: { drivers: DriverStat[] }) {
  const medals = ['🥇', '🥈', '🥉']
  return (
    <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
      <div className="p-5 border-b border-gray-100 flex items-center gap-2">
        <Trophy className="w-5 h-5 text-amber-500" />
        <h3 className="font-bold text-gray-900">Driver Leaderboard</h3>
        <span className="ml-auto text-xs text-gray-400">All time</span>
      </div>
      {drivers.length === 0
        ? <p className="text-center text-gray-400 text-sm py-8">No driver data yet.</p>
        : drivers.map((d, i) => (
          <div key={d.driver_name + i}
            className={`flex items-center gap-4 px-5 py-3.5 ${i < drivers.length - 1 ? 'border-b border-gray-50' : ''}`}
          >
            <span className="text-lg w-7 flex-shrink-0 text-center">{medals[i] ?? `${i + 1}`}</span>
            <div className="flex-1 min-w-0">
              <div className="font-bold text-gray-900 text-sm truncate">{d.driver_name || 'Unknown'}</div>
              <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                <span className="text-xs text-emerald-600 font-semibold">{d.delivered} delivered</span>
                {d.failed > 0 && <span className="text-xs text-red-400 font-semibold">{d.failed} failed</span>}
              </div>
            </div>
            <div className="text-right">
              <div className={`text-sm font-black ${Number(d.delivery_rate) >= 80 ? 'text-emerald-600' : Number(d.delivery_rate) >= 50 ? 'text-orange-500' : 'text-red-500'}`}>
                {Number(d.delivery_rate).toFixed(0)}%
              </div>
              <div className="text-[10px] text-gray-400">rate</div>
            </div>
            <div className="text-right">
              <div className="text-xs font-bold text-orange-600">₹{fmt(Number(d.cod_collected))}</div>
              <div className="text-[10px] text-gray-400">COD</div>
            </div>
          </div>
        ))
      }
    </div>
  )
}

// ── Page ────────────────────────────────────────────────────────
export default function AnalyticsView() {
  const [data, setData]               = useState<Analytics | null>(null)
  const [orders, setOrders]           = useState<Order[]>([])
  const [drivers, setDrivers]         = useState<DriverStat[]>([])
  const [loading, setLoading]         = useState(true)
  const [ordersLoading, setOLoading]  = useState(false)
  const [panel, setPanel]             = useState<Panel>(null)
  const [lastRefresh, setRefresh]     = useState(new Date())

  const load = useCallback(async () => {
    setLoading(true)
    const [ar, dr] = await Promise.all([
      supabase.rpc('get_admin_analytics'),
      supabase.rpc('get_driver_leaderboard'),
    ])
    if (ar.data)  setData(ar.data as Analytics)
    if (dr.data)  setDrivers(dr.data as DriverStat[])
    setRefresh(new Date())
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const openPanel = async (p: Panel) => {
    setPanel(p)
    if (orders.length === 0) {
      setOLoading(true)
      const { data: od } = await supabase.rpc('get_all_orders')
      if (od) setOrders(od.map((o: any) => ({
        id: o.id, customer_name: o.customer_name, customer_phone: o.customer_phone,
        total_amount: Number(o.total_amount), status: o.status,
        payment_method: o.payment_method, created_at: o.created_at,
        street: o.street, city: o.city,
      })))
      setOLoading(false)
    }
  }

  if (loading) return <div className="flex items-center justify-center py-24 w-full"><Loader2 className="w-8 h-8 animate-spin text-primary-600" /></div>
  if (!data) return null

  const d            = data
  const deliveryRate = d.total_orders > 0 ? Math.round((d.delivered / d.total_orders) * 100) : 0
  const codPct       = d.total_orders > 0 ? Math.round((d.cod_orders  / d.total_orders) * 100) : 0
  const todayStr     = new Date().toISOString().split('T')[0]

  return (
    <div className="w-full max-w-5xl space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Analytics</h2>
          <p className="text-gray-400 text-xs mt-1">
            Updated {lastRefresh.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}
          </p>
        </div>
        <button onClick={load} className="p-2.5 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 shadow-sm transition-colors">
          <RefreshCw className="w-4 h-4 text-gray-600" />
        </button>
      </div>

      {/* Today */}
      <section>
        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Today</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard icon={<Package className="w-5 h-5" />} label="Orders Today" value={d.orders_today} color="blue"
            onClick={() => openPanel({ title: "Today's Orders", subtitle: 'All orders placed today', filter: o => o.created_at?.startsWith(todayStr) })} />
          <StatCard icon={<IndianRupee className="w-5 h-5" />} label="Revenue Today" value={`₹${fmt(Number(d.revenue_today))}`} color="emerald"
            onClick={() => openPanel({ title: "Today's Delivered", subtitle: 'Delivered orders today', filter: o => o.created_at?.startsWith(todayStr) && o.status === 'delivered' })} />
          <StatCard icon={<Truck className="w-5 h-5" />} label="Active Routes" value={d.active_routes} sub="in progress" color="purple" />
          <StatCard icon={<Clock className="w-5 h-5" />} label="Pending" value={d.pending} sub="awaiting dispatch" color="orange"
            onClick={() => openPanel({ title: 'Pending Orders', subtitle: 'Not yet dispatched', filter: o => o.status === 'pending' })} />
        </div>
      </section>

      {/* All time */}
      <section>
        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">All Time</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard icon={<Package className="w-5 h-5" />} label="Total Orders" value={d.total_orders} color="gray"
            onClick={() => openPanel({ title: 'All Orders', subtitle: 'Every order placed', filter: () => true })} />
          <StatCard icon={<IndianRupee className="w-5 h-5" />} label="Total Revenue" value={`₹${fmt(Number(d.revenue_total))}`} color="emerald"
            onClick={() => openPanel({ title: 'Revenue Orders', subtitle: 'All delivered orders', filter: o => o.status === 'delivered' })} />
          <StatCard icon={<CheckCircle2 className="w-5 h-5" />} label="Delivered" value={d.delivered} sub={`${deliveryRate}% success`} color="emerald"
            onClick={() => openPanel({ title: 'Delivered Orders', subtitle: 'Successfully completed', filter: o => o.status === 'delivered' })} />
          <StatCard icon={<XCircle className="w-5 h-5" />} label="Failed / Cancelled" value={d.failed} color="red"
            onClick={() => openPanel({ title: 'Failed & Cancelled', subtitle: 'Orders that didn\'t complete', filter: o => o.status === 'failed' || o.status === 'cancelled' })} />
        </div>
      </section>

      {/* Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
          <h3 className="font-bold text-gray-900 mb-4">Order Status Breakdown</h3>
          {[
            { label: 'Pending',          count: d.pending,   color: 'bg-orange-400' },
            { label: 'Shipped',          count: d.shipped,   color: 'bg-purple-400' },
            { label: 'Delivered',        count: d.delivered, color: 'bg-emerald-400' },
            { label: 'Failed/Cancelled', count: d.failed,    color: 'bg-red-400' },
          ].map(({ label, count, color }) => (
            <div key={label} className="mb-3 last:mb-0">
              <div className="flex justify-between text-sm mb-1.5">
                <span className="font-medium text-gray-700">{label}</span>
                <span className="font-bold text-gray-900">{count}</span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-2.5">
                <motion.div initial={{ width: 0 }}
                  animate={{ width: `${d.total_orders ? (count / d.total_orders) * 100 : 0}%` }}
                  transition={{ duration: 0.8, ease: 'easeOut' }}
                  className={`${color} h-2.5 rounded-full`} />
              </div>
            </div>
          ))}
        </div>

        <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
          <h3 className="font-bold text-gray-900 mb-4">Payment Method Split</h3>
          <div className="space-y-4">
            {[
              { label: 'Cash on Delivery (COD)', count: d.cod_orders,    pct: codPct,       color: 'bg-orange-400' },
              { label: 'Online (Pre-paid)',       count: d.online_orders, pct: 100 - codPct, color: 'bg-emerald-400' },
            ].map(({ label, count, pct, color }) => (
              <div key={label}>
                <div className="flex justify-between text-sm mb-1.5">
                  <span className="font-medium text-gray-700">{label}</span>
                  <span className="font-bold text-gray-900">{count} · {pct}%</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-3">
                  <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }}
                    transition={{ duration: 0.8, ease: 'easeOut' }}
                    className={`${color} h-3 rounded-full`} />
                </div>
              </div>
            ))}
          </div>
          <div className="mt-5 pt-4 border-t border-gray-100 grid grid-cols-2 gap-3">
            <div className="bg-orange-50 rounded-xl p-3 text-center">
              <div className="text-xs text-orange-600 font-semibold mb-1">COD Collected</div>
              <div className="font-black text-orange-700">₹{fmt(Number(d.cod_collected))}</div>
            </div>
            <div className="bg-slate-50 rounded-xl p-3 text-center">
              <div className="text-xs text-slate-600 font-semibold mb-1">Active Drivers</div>
              <div className="font-black text-slate-700">{d.drivers_count}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Driver leaderboard */}
      <Leaderboard drivers={drivers} />

      {/* Overall rate */}
      <div className="bg-slate-900 text-white rounded-2xl p-6 shadow-xl">
        <div className="flex justify-between items-center mb-4">
          <div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Overall Delivery Rate</span>
            <div className="text-4xl font-black mt-1">{deliveryRate}%</div>
          </div>
          <TrendingUp className="w-10 h-10 text-emerald-400 opacity-80" />
        </div>
        <div className="w-full bg-slate-700 rounded-full h-3">
          <motion.div initial={{ width: 0 }} animate={{ width: `${deliveryRate}%` }}
            transition={{ duration: 1, ease: 'easeOut' }}
            className="bg-emerald-400 h-3 rounded-full" />
        </div>
        <div className="flex justify-between text-xs text-slate-500 mt-2">
          <span>{d.delivered} delivered of {d.total_orders} total</span>
          <span>{d.shipped} in transit</span>
        </div>
      </div>

      <AnimatePresence>
        {panel && <OrderPanel panel={panel} orders={orders} loading={ordersLoading} onClose={() => setPanel(null)} />}
      </AnimatePresence>
    </div>
  )
}
