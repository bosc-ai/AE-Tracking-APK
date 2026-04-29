import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { RefreshCw, ChevronDown, ChevronUp, CheckCircle2, XCircle, Clock, Package, Loader2, Truck, IndianRupee } from 'lucide-react'

type Stop = {
  stop_id: string
  stop_sequence: number
  stop_status: string
  customer_name: string
  customer_phone: string
  address_street: string
  address_city: string
  address_landmark: string
  payment_method: string
  total_amount: number
}

type RouteRow = {
  route_id: string
  route_date: string
  route_status: string
  driver_id: string | null
  driver_name: string
  driver_phone: string
  total_stops: number
  delivered_stops: number
  failed_stops: number
  pending_stops: number
  stops: Stop[]
}

const STATUS_COLORS: Record<string, string> = {
  active: 'bg-emerald-100 text-emerald-700',
  pending: 'bg-orange-100 text-orange-700',
  completed: 'bg-gray-100 text-gray-600',
  cancelled: 'bg-red-100 text-red-600',
}

const STOP_ICON: Record<string, React.ReactNode> = {
  delivered: <CheckCircle2 className="w-4 h-4 text-emerald-500" />,
  failed: <XCircle className="w-4 h-4 text-red-500" />,
  rescheduled: <Clock className="w-4 h-4 text-orange-500" />,
  pending: <Package className="w-4 h-4 text-gray-400" />,
}

export default function RoutesView() {
  const [routes, setRoutes] = useState<RouteRow[]>([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState<Set<string>>(new Set())

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const { data, error } = await supabase.rpc('get_all_routes')
    if (error) { console.error('get_all_routes:', error.message); setLoading(false); return }

    // Group flat rows by route_id
    const map = new Map<string, RouteRow>()
    for (const row of (data || [])) {
      if (!map.has(row.route_id)) {
        map.set(row.route_id, {
          route_id: row.route_id,
          route_date: row.route_date,
          route_status: row.route_status,
          driver_id: row.driver_id,
          driver_name: row.driver_name || 'Unassigned',
          driver_phone: row.driver_phone || '',
          total_stops: Number(row.total_stops),
          delivered_stops: Number(row.delivered_stops),
          failed_stops: Number(row.failed_stops),
          pending_stops: Number(row.pending_stops),
          stops: [],
        })
      }
      if (row.stop_id) {
        map.get(row.route_id)!.stops.push({
          stop_id: row.stop_id,
          stop_sequence: row.stop_sequence,
          stop_status: row.stop_status,
          customer_name: row.customer_name || 'Customer',
          customer_phone: row.customer_phone || '',
          address_street: row.address_street || '',
          address_city: row.address_city || '',
          address_landmark: row.address_landmark || '',
          payment_method: row.payment_method || 'COD',
          total_amount: Number(row.total_amount || 0),
        })
      }
    }
    setRoutes(Array.from(map.values()))
    setLoading(false)
  }

  const toggle = (id: string) =>
    setExpanded(prev => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s })

  if (loading) return (
    <div className="flex items-center justify-center py-24 w-full">
      <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
    </div>
  )

  return (
    <div className="w-full max-w-5xl">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Routes ({routes.length})</h2>
          <p className="text-gray-500 text-sm mt-1">Monitor driver progress and delivery paths.</p>
        </div>
        <button onClick={load} className="p-2.5 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors shadow-sm">
          <RefreshCw className="w-4 h-4 text-gray-600" />
        </button>
      </div>

      {routes.length === 0 ? (
        <div className="bg-white border border-dashed border-gray-300 rounded-xl p-8 text-center">
          <Truck className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 text-sm">No routes yet. Go to Orders → select orders → Generate Route.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {routes.map(route => {
            const progress = route.total_stops > 0 ? (route.delivered_stops / route.total_stops) * 100 : 0
            const isOpen = expanded.has(route.route_id)
            const codTotal = route.stops
              .filter(s => s.stop_status === 'delivered' && s.payment_method === 'COD')
              .reduce((sum, s) => sum + s.total_amount, 0)

            return (
              <div key={route.route_id} className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
                {/* Route header */}
                <div className="p-5">
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center mr-3 text-sm font-black ${
                        route.route_status === 'active' ? 'bg-primary-100 text-primary-600' :
                        route.route_status === 'completed' ? 'bg-emerald-100 text-emerald-600' :
                        'bg-gray-100 text-gray-500'
                      }`}>
                        <Truck className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="font-bold text-gray-900">{route.driver_name}</div>
                        {route.driver_phone && <div className="text-xs text-gray-400">{route.driver_phone}</div>}
                        <div className="text-xs text-gray-400 mt-0.5">{new Date(route.route_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className={`inline-block px-2.5 py-1 rounded-md text-xs font-semibold uppercase tracking-wider ${STATUS_COLORS[route.route_status] || STATUS_COLORS.pending}`}>
                        {route.route_status}
                      </span>
                    </div>
                  </div>

                  {/* Stats row */}
                  <div className="grid grid-cols-4 gap-2 mb-3">
                    {[
                      { label: 'Total', value: route.total_stops, color: 'text-gray-700' },
                      { label: 'Delivered', value: route.delivered_stops, color: 'text-emerald-600' },
                      { label: 'Failed', value: route.failed_stops, color: 'text-red-500' },
                      { label: 'Pending', value: route.pending_stops, color: 'text-orange-500' },
                    ].map(({ label, value, color }) => (
                      <div key={label} className="bg-gray-50 rounded-xl p-2 text-center">
                        <div className={`text-lg font-black ${color}`}>{value}</div>
                        <div className="text-[10px] text-gray-400 font-semibold uppercase">{label}</div>
                      </div>
                    ))}
                  </div>

                  {/* Progress bar */}
                  <div className="w-full bg-gray-100 rounded-full h-2 mb-2">
                    <div
                      className={`h-2 rounded-full transition-all duration-700 ${progress === 100 ? 'bg-emerald-500' : 'bg-primary-500'}`}
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-xs text-gray-400">
                    <span>{Math.round(progress)}% complete</span>
                    {codTotal > 0 && (
                      <span className="flex items-center text-orange-500 font-semibold">
                        <IndianRupee className="w-3 h-3 mr-0.5" />{codTotal.toLocaleString()} COD collected
                      </span>
                    )}
                  </div>
                </div>

                {/* Toggle stops */}
                {route.stops.length > 0 && (
                  <>
                    <button
                      onClick={() => toggle(route.route_id)}
                      className="w-full flex items-center justify-center gap-2 py-2.5 border-t border-gray-100 text-xs font-semibold text-gray-500 hover:bg-gray-50 transition-colors"
                    >
                      {isOpen ? <><ChevronUp className="w-4 h-4" /> Hide stops</> : <><ChevronDown className="w-4 h-4" /> View {route.stops.length} stops</>}
                    </button>

                    {isOpen && (
                      <div className="border-t border-gray-100">
                        {route.stops.map((stop, idx) => (
                          <div
                            key={stop.stop_id}
                            className={`flex items-start px-5 py-3 gap-3 ${idx < route.stops.length - 1 ? 'border-b border-gray-50' : ''} ${
                              stop.stop_status === 'delivered' ? 'bg-emerald-50/40' :
                              stop.stop_status === 'failed' ? 'bg-red-50/40' :
                              stop.stop_status === 'rescheduled' ? 'bg-orange-50/40' : ''
                            }`}
                          >
                            <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center text-[10px] font-black text-gray-600 flex-shrink-0 mt-0.5">
                              {stop.stop_sequence}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between">
                                <span className="font-semibold text-sm text-gray-900 truncate">{stop.customer_name}</span>
                                <div className="flex items-center gap-1.5 flex-shrink-0 ml-2">
                                  {stop.payment_method === 'COD' && (
                                    <span className="text-[10px] font-bold text-orange-600 bg-orange-50 px-1.5 py-0.5 rounded">
                                      ₹{stop.total_amount.toLocaleString()} COD
                                    </span>
                                  )}
                                  {STOP_ICON[stop.stop_status] || STOP_ICON.pending}
                                </div>
                              </div>
                              <p className="text-xs text-gray-400 truncate">
                                {[stop.address_street, stop.address_city, stop.address_landmark].filter(Boolean).join(', ')}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
