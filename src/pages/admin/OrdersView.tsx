import { useState, useEffect, useRef } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import {
  CheckSquare, Square, Navigation, RefreshCw, Plus, Upload, Download,
  X, ChevronUp, ChevronDown, Truck, Loader2, AlertCircle, CheckCircle, Pencil, Trash2, AlertTriangle,
  Eye, Camera, FileSignature, CalendarDays, Clock, MessageSquare, Phone,
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { geocodeAddress, haversineKm, RR_NAGAR_HUB } from '../../lib/routing'
import * as XLSX from 'xlsx'

type OrderAddress = {
  id: string
  street: string
  city: string
  zip_code: string
  landmark?: string | null
  lat?: number | null
  lng?: number | null
}

type Order = {
  id: string
  customer_name: string | null
  customer_phone: string | null
  total_amount: number
  status: string
  stop_status: string | null
  payment_method: string
  notes: string | null
  delivery_remarks: string | null
  created_at: string
  addresses: OrderAddress | null
  driver_name: string | null
  driver_phone: string | null
}

type Driver = { id: string; full_name: string | null; phone_number: string | null }

type RouteStop = {
  order_id: string
  customer_name: string
  address_text: string
  amount: number
  lat?: number | null
  lng?: number | null
  distance_km?: number
}

type ActivityData = {
  stop_id: string
  stop_status: string
  driver_name: string | null
  driver_phone: string | null
  stop_updated_at: string | null
  delivery_remarks: string | null
  rescheduled_date: string | null
  rescheduled_slot: string | null
  photo_url: string | null
  signature_url: string | null
  route_date: string | null
  cod_collected: boolean | null
}

type BulkRow = {
  customer_name: string
  customer_phone: string
  street: string
  area: string
  pincode: string
  landmark: string
  total_amount: number
  payment_method: string
  notes: string
  valid: boolean
  error?: string
}

const STATUS_COLORS: Record<string, string> = {
  pending:     'bg-orange-100 text-orange-700',
  confirmed:   'bg-blue-100 text-blue-700',
  shipped:     'bg-purple-100 text-purple-700',
  delivered:   'bg-emerald-100 text-emerald-700',
  cancelled:   'bg-red-100 text-red-700',
  failed:      'bg-red-100 text-red-700',
  rescheduled: 'bg-yellow-100 text-yellow-800',
}

const EMPTY_FORM = {
  customer_name: '', customer_phone: '', street: '', area: '',
  pincode: '', landmark: '', total_amount: '', payment_method: 'COD', notes: '',
}

export default function OrdersView() {
  const { user } = useAuth()
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<Set<string>>(new Set())

  // Add order
  const [showAdd, setShowAdd] = useState(false)
  const [addForm, setAddForm] = useState(EMPTY_FORM)
  const [addLoading, setAddLoading] = useState(false)
  const [addError, setAddError] = useState('')

  // Bulk upload
  const [showBulk, setShowBulk] = useState(false)
  const [bulkRows, setBulkRows] = useState<BulkRow[]>([])
  const [bulkImporting, setBulkImporting] = useState(false)
  const [bulkResult, setBulkResult] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  // Edit order
  const [editOrder, setEditOrder] = useState<Order | null>(null)
  const [editForm, setEditForm] = useState({ customer_name: '', customer_phone: '', street: '', area: '', pincode: '', landmark: '', total_amount: '', payment_method: 'COD', notes: '', status: 'pending' })
  const [editLoading, setEditLoading] = useState(false)
  const [editError, setEditError] = useState('')

  // Delete confirmation
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleting, setDeleting] = useState(false)

  // Order activity panel
  const [activityOrder, setActivityOrder] = useState<Order | null>(null)
  const [activityData, setActivityData] = useState<ActivityData | null>(null)
  const [activityLoading, setActivityLoading] = useState(false)

  // Assign to driver
  const [showAssign, setShowAssign] = useState(false)
  const [drivers, setDrivers] = useState<Driver[]>([])
  const [selectedDriver, setSelectedDriver] = useState('')
  const [routeStops, setRouteStops] = useState<RouteStop[]>([])
  const [optimizing, setOptimizing] = useState(false)
  const [creating, setCreating] = useState(false)
  const [assignError, setAssignError] = useState('')

  useEffect(() => { loadOrders() }, [])

  async function loadOrders() {
    setLoading(true)
    const { data, error } = await supabase.rpc('get_all_orders')
    if (error) console.error('loadOrders error:', error.message)
    if (data) {
      setOrders(data.map((o: any) => ({
        id: o.id,
        customer_name: o.customer_name,
        customer_phone: o.customer_phone,
        total_amount: o.total_amount,
        status: o.status,
        stop_status: o.stop_status ?? null,
        payment_method: o.payment_method,
        notes: o.notes,
        delivery_remarks: o.delivery_remarks ?? null,
        created_at: o.created_at,
        driver_name: o.driver_name || null,
        driver_phone: o.driver_phone || null,
        addresses: o.address_id ? {
          id: o.address_id,
          street: o.street ?? o.address_street ?? '',
          city: o.city ?? o.address_city ?? '',
          zip_code: o.zip_code ?? o.address_zip ?? '',
          landmark: o.landmark ?? o.address_landmark ?? null,
          lat: o.lat ?? null,
          lng: o.lng ?? null,
        } : null,
      })))
    }
    setLoading(false)
  }

  const toggleSelect = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const pendingOrders = orders.filter(o => o.status === 'pending')
  const allSelected = orders.length > 0 && orders.every(o => selected.has(o.id))

  const toggleAll = () => {
    if (allSelected) setSelected(new Set())
    else setSelected(new Set(orders.map(o => o.id)))
  }

  async function confirmDelete() {
    setDeleting(true)
    const ids = Array.from(selected)
    const { error } = await supabase.rpc('delete_orders', { order_ids: ids })
    setDeleting(false)
    setShowDeleteConfirm(false)
    if (error) { console.error('Delete failed:', error.message); return }
    setSelected(new Set())
    await loadOrders()
  }

  async function openActivity(order: Order) {
    setActivityOrder(order)
    setActivityData(null)
    setActivityLoading(true)
    const { data } = await supabase.rpc('get_order_activity', { p_order_id: order.id })
    setActivityData(data?.[0] ?? null)
    setActivityLoading(false)
  }

  // ── ADD SINGLE ORDER ────────────────────────────────────────
  async function handleAddOrder(e: React.FormEvent) {
    e.preventDefault()
    if (!user) return
    setAddLoading(true)
    setAddError('')
    try {
      const { data: addr, error: addrErr } = await supabase
        .from('addresses')
        .insert({
          user_id: user.id,
          street: addForm.street,
          city: addForm.area,
          state: 'Karnataka',
          zip_code: addForm.pincode,
          landmark: addForm.landmark || null,
        })
        .select().single()
      if (addrErr) throw addrErr

      const { error: ordErr } = await supabase.from('orders').insert({
        user_id: user.id,
        address_id: addr.id,
        customer_name: addForm.customer_name,
        customer_phone: addForm.customer_phone,
        total_amount: parseFloat(addForm.total_amount),
        status: 'pending',
        payment_method: addForm.payment_method,
        notes: addForm.notes || null,
      })
      if (ordErr) throw ordErr

      setShowAdd(false)
      setAddForm(EMPTY_FORM)
      await loadOrders()
    } catch (err: any) {
      setAddError(err.message || 'Failed to create order')
    } finally {
      setAddLoading(false)
    }
  }

  // ── BULK UPLOAD ─────────────────────────────────────────────
  function downloadTemplate() {
    const headers = ['Customer Name', 'Customer Phone', 'Street', 'Area', 'Pincode', 'Landmark', 'Total Amount', 'Payment Method (COD/ONLINE)', 'Notes']
    const example = ['Ravi Kumar', '9900000001', '#12 5th Cross Jayanagar', 'Jayanagar', '560011', 'Near Metro', '1299', 'COD', '2x Widget + 1x Gadget']
    const ws = XLSX.utils.aoa_to_sheet([headers, example])
    ws['!cols'] = headers.map(() => ({ wch: 22 }))
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Orders')
    XLSX.writeFile(wb, 'order_upload_template.xlsx')
  }

  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => {
      const data = new Uint8Array(ev.target?.result as ArrayBuffer)
      const wb = XLSX.read(data, { type: 'array' })
      const ws = wb.Sheets[wb.SheetNames[0]]
      const rows: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1 })
      const dataRows = rows.slice(1).filter(r => r.some(c => c !== undefined && c !== ''))

      const parsed: BulkRow[] = dataRows.map(r => {
        const customer_name = String(r[0] || '').trim()
        const customer_phone = String(r[1] || '').trim()
        const street = String(r[2] || '').trim()
        const area = String(r[3] || '').trim()
        const pincode = String(r[4] || '').trim()
        const landmark = String(r[5] || '').trim()
        const total_amount = parseFloat(String(r[6] || '0'))
        const payment_method = String(r[7] || 'COD').trim().toUpperCase().replace('ONLINE', 'ONLINE')
        const notes = String(r[8] || '').trim()
        const valid = !!(customer_name && customer_phone && street && area && pincode && total_amount > 0 && ['COD', 'ONLINE'].includes(payment_method))
        const missing = [
          !customer_name && 'Name', !customer_phone && 'Phone', !street && 'Street',
          !area && 'Area', !pincode && 'Pincode', !(total_amount > 0) && 'Amount',
          !['COD', 'ONLINE'].includes(payment_method) && 'Payment(COD/ONLINE)',
        ].filter(Boolean)
        return { customer_name, customer_phone, street, area, pincode, landmark, total_amount, payment_method, notes, valid, error: missing.length ? missing.join(', ') + ' missing' : undefined }
      })
      setBulkRows(parsed)
      setBulkResult('')
    }
    reader.readAsArrayBuffer(file)
  }

  async function handleBulkImport() {
    if (!user) return
    setBulkImporting(true)
    setBulkResult('')
    const validRows = bulkRows.filter(r => r.valid)
    let success = 0, failed = 0

    for (const row of validRows) {
      try {
        const { data: addr, error: addrErr } = await supabase
          .from('addresses')
          .insert({ user_id: user.id, street: row.street, city: row.area, state: 'Karnataka', zip_code: row.pincode, landmark: row.landmark || null })
          .select().single()
        if (addrErr) throw addrErr
        const { error: ordErr } = await supabase.from('orders').insert({
          user_id: user.id, address_id: addr.id, customer_name: row.customer_name,
          customer_phone: row.customer_phone, total_amount: row.total_amount,
          status: 'pending', payment_method: row.payment_method, notes: row.notes || null,
        })
        if (ordErr) throw ordErr
        success++
      } catch { failed++ }
    }

    setBulkResult(`✅ ${success} orders created${failed ? ` · ⚠️ ${failed} failed` : ''}`)
    setBulkImporting(false)
    if (success > 0) {
      await loadOrders()
      setBulkRows([])
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  // ── EDIT ORDER ──────────────────────────────────────────────
  function openEdit(order: Order) {
    setEditOrder(order)
    setEditError('')
    setEditForm({
      customer_name: order.customer_name || '',
      customer_phone: order.customer_phone || '',
      street: order.addresses?.street || '',
      area: order.addresses?.city || '',
      pincode: order.addresses?.zip_code || '',
      landmark: order.addresses?.landmark || '',
      total_amount: String(order.total_amount),
      payment_method: order.payment_method,
      notes: order.notes || '',
      status: order.status,
    })
  }

  async function handleSaveEdit(e: React.FormEvent) {
    e.preventDefault()
    if (!editOrder) return
    setEditLoading(true)
    setEditError('')
    try {
      const { error: ordErr } = await supabase.from('orders').update({
        customer_name: editForm.customer_name,
        customer_phone: editForm.customer_phone,
        total_amount: parseFloat(editForm.total_amount),
        payment_method: editForm.payment_method,
        notes: editForm.notes || null,
        status: editForm.status,
      }).eq('id', editOrder.id)
      if (ordErr) throw ordErr

      if (editOrder.addresses?.id) {
        const { error: addrErr } = await supabase.from('addresses').update({
          street: editForm.street,
          city: editForm.area,
          zip_code: editForm.pincode,
          landmark: editForm.landmark || null,
        }).eq('id', editOrder.addresses.id)
        if (addrErr) throw addrErr
      }

      setEditOrder(null)
      await loadOrders()
    } catch (err: any) {
      setEditError(err.message || 'Failed to save')
    } finally {
      setEditLoading(false)
    }
  }

  // ── ASSIGN TO DRIVER ────────────────────────────────────────
  async function openAssignModal() {
    setAssignError('')
    setSelectedDriver('')
    setOptimizing(true)
    setShowAssign(true)

    const { data: drvData } = await supabase.rpc('get_all_drivers')
    if (drvData) setDrivers(drvData)

    const selectedOrders = orders.filter(o => selected.has(o.id))
    const stops: RouteStop[] = selectedOrders.map(o => ({
      order_id: o.id,
      customer_name: o.customer_name || 'Customer',
      address_text: o.addresses
        ? [o.addresses.street, o.addresses.city, o.addresses.zip_code].filter(Boolean).join(', ')
        : 'No address',
      amount: o.total_amount,
      lat: o.addresses?.lat,
      lng: o.addresses?.lng,
    }))

    // Geocode missing coordinates, then sort by distance from RR Nagar
    const geocoded: RouteStop[] = []
    for (const [i, stop] of stops.entries()) {
      if (i > 0 && (!stop.lat || !stop.lng)) await new Promise(r => setTimeout(r, 1100))
      let lat = stop.lat ?? null
      let lng = stop.lng ?? null
      if (!lat || !lng) {
        const coords = await geocodeAddress(stop.address_text)
        if (coords) { lat = coords.lat; lng = coords.lng }
      }
      const distance_km = lat && lng ? haversineKm(RR_NAGAR_HUB, { lat, lng }) : undefined
      geocoded.push({ ...stop, lat, lng, distance_km })
    }
    geocoded.sort((a, b) => (a.distance_km ?? 999) - (b.distance_km ?? 999))
    setRouteStops(geocoded)
    setOptimizing(false)
  }

  function moveStop(index: number, dir: -1 | 1) {
    const next = [...routeStops]
    const swapIdx = index + dir
    if (swapIdx < 0 || swapIdx >= next.length) return
    ;[next[index], next[swapIdx]] = [next[swapIdx], next[index]]
    setRouteStops(next)
  }

  async function handleCreateRoute() {
    if (!selectedDriver) { setAssignError('Please select a driver'); return }
    setCreating(true)
    setAssignError('')
    try {
      const stops = routeStops.map((s, i) => ({ order_id: s.order_id, sequence: i + 1 }))
      const { error } = await supabase.rpc('create_route', {
        p_driver_id: selectedDriver,
        p_route_date: new Date().toISOString().split('T')[0],
        p_stops: stops,
      })
      if (error) throw error

      setShowAssign(false)
      setSelected(new Set())
      await loadOrders()
    } catch (err: any) {
      setAssignError(err.message || 'Failed to create route')
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="w-full max-w-5xl">
      {/* Header */}
      <div className="flex flex-wrap justify-between items-start mb-6 gap-3">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Orders ({orders.length})</h2>
          <p className="text-gray-500 text-sm mt-1">{pendingOrders.length} pending · {selected.size} selected</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {selected.size > 0 && (
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="bg-red-600 hover:bg-red-700 text-white px-4 py-2.5 rounded-xl font-semibold shadow-sm flex items-center gap-2 transition-colors"
            >
              <Trash2 className="w-4 h-4" /> Delete ({selected.size})
            </button>
          )}
          <button onClick={loadOrders} className="p-2.5 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 shadow-sm transition-colors">
            <RefreshCw className="w-4 h-4 text-gray-600" />
          </button>
          <button
            onClick={() => { setShowBulk(true); setBulkRows([]); setBulkResult('') }}
            className="bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 px-4 py-2.5 rounded-xl font-semibold shadow-sm flex items-center gap-2 transition-colors"
          >
            <Upload className="w-4 h-4" /> Bulk Upload
          </button>
          <button
            onClick={() => { setShowAdd(true); setAddError('') }}
            className="bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 px-4 py-2.5 rounded-xl font-semibold shadow-sm flex items-center gap-2 transition-colors"
          >
            <Plus className="w-4 h-4" /> Add Order
          </button>
          <button
            disabled={selected.size === 0}
            onClick={openAssignModal}
            className="bg-primary-600 hover:bg-primary-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white px-5 py-2.5 rounded-xl font-semibold shadow-sm flex items-center gap-2 transition-colors"
          >
            <Navigation className="w-4 h-4" /> Assign to Driver ({selected.size})
          </button>
        </div>
      </div>

      {/* Orders Table */}
      <div className="bg-white border rounded-2xl border-gray-200 overflow-hidden shadow-sm">
        {loading ? (
          <div className="p-12 text-center text-gray-500 text-sm animate-pulse">Loading orders...</div>
        ) : orders.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-gray-500 text-sm mb-3">No orders yet.</p>
            <button onClick={() => setShowAdd(true)} className="text-primary-600 text-sm font-semibold hover:underline">+ Add your first order</button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50/50 border-b border-gray-200">
                  <th className="p-4 w-12">
                    <button onClick={toggleAll} className="text-gray-400 hover:text-primary-600">
                      {allSelected ? <CheckSquare className="w-5 h-5 text-primary-600" /> : <Square className="w-5 h-5" />}
                    </button>
                  </th>
                  <th className="p-4 text-sm font-semibold text-gray-600">Customer</th>
                  <th className="p-4 text-sm font-semibold text-gray-600">Address</th>
                  <th className="p-4 text-sm font-semibold text-gray-600">Status</th>
                  <th className="p-4 text-sm font-semibold text-gray-600">Driver</th>
                  <th className="p-4 text-sm font-semibold text-gray-600">Payment</th>
                  <th className="p-4 text-sm font-semibold text-gray-600">Amount</th>
                  <th className="p-4 text-sm font-semibold text-gray-600">Date</th>
                  <th className="p-4 w-10"></th>
                </tr>
              </thead>
              <tbody>
                {orders.map(order => (
                  <tr key={order.id} className={`border-b border-gray-100 last:border-0 hover:bg-gray-50/40 transition-colors ${selected.has(order.id) ? 'bg-primary-50/40' : ''}`}>
                    <td className="p-4">
                      <button onClick={() => toggleSelect(order.id)} className="text-gray-400 hover:text-primary-600">
                        {selected.has(order.id) ? <CheckSquare className="w-5 h-5 text-primary-600" /> : <Square className="w-5 h-5" />}
                      </button>
                    </td>
                    <td className="p-4">
                      <div className="text-sm font-medium text-gray-900">{order.customer_name || '—'}</div>
                      <div className="text-xs text-gray-400">{order.customer_phone || order.id.slice(0, 8) + '...'}</div>
                    </td>
                    <td className="p-4 max-w-[200px]">
                      <div className="text-sm text-gray-600 flex items-start gap-1.5">
                        <Truck className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                        <span className="truncate">{order.addresses ? `${order.addresses.street}, ${order.addresses.city}` : 'N/A'}</span>
                      </div>
                      {order.notes && <div className="text-xs text-gray-400 mt-0.5 ml-5 truncate">{order.notes}</div>}
                      {order.delivery_remarks && (
                        <div className="text-xs text-red-500 mt-0.5 ml-5 truncate font-medium" title={order.delivery_remarks}>
                          ⚠ {order.delivery_remarks}
                        </div>
                      )}
                    </td>
                    <td className="p-4">
                      {(() => {
                        const display = (order.stop_status && ['rescheduled','delivered','failed'].includes(order.stop_status))
                          ? order.stop_status
                          : order.status
                        return (
                          <span className={`px-2.5 py-1 rounded-md text-xs font-semibold uppercase tracking-wider ${STATUS_COLORS[display] || 'bg-gray-100 text-gray-600'}`}>
                            {display}
                          </span>
                        )
                      })()}
                    </td>
                    <td className="p-4">
                      {order.driver_name ? (
                        <>
                          <div className="text-sm font-medium text-gray-900">{order.driver_name}</div>
                          <div className="text-xs text-gray-400">{order.driver_phone || ''}</div>
                        </>
                      ) : (
                        <span className="text-xs text-gray-400">—</span>
                      )}
                    </td>
                    <td className="p-4 text-sm text-gray-600">{order.payment_method}</td>
                    <td className="p-4 text-sm font-semibold text-gray-900">₹{Number(order.total_amount).toLocaleString()}</td>
                    <td className="p-4 text-xs text-gray-400 whitespace-nowrap">
                      {new Date(order.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-1">
                        <button onClick={() => openActivity(order)} title="View driver activity" className="p-1.5 hover:bg-blue-50 rounded-lg text-gray-400 hover:text-blue-600 transition-colors">
                          <Eye className="w-4 h-4" />
                        </button>
                        <button onClick={() => openEdit(order)} title="Edit order" className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-primary-600 transition-colors">
                          <Pencil className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── EDIT ORDER MODAL ─────────────────────────────────── */}
      {editOrder && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 overflow-y-auto" onClick={() => setEditOrder(null)}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-lg shadow-2xl my-4" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-5">
              <div>
                <h3 className="text-lg font-bold text-gray-900">Edit Order</h3>
                <p className="text-xs text-gray-400 mt-0.5">ID: {editOrder.id.slice(0, 8)}...</p>
              </div>
              <button onClick={() => setEditOrder(null)}><X className="w-5 h-5 text-gray-400 hover:text-gray-600" /></button>
            </div>
            {editError && (
              <div className="mb-4 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl p-3 flex gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />{editError}
              </div>
            )}
            <form onSubmit={handleSaveEdit} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Customer Name</label>
                  <input type="text" value={editForm.customer_name} onChange={e => setEditForm(f => ({ ...f, customer_name: e.target.value }))} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Phone</label>
                  <input type="tel" value={editForm.customer_phone} onChange={e => setEditForm(f => ({ ...f, customer_phone: e.target.value }))} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Street Address</label>
                <input type="text" value={editForm.street} onChange={e => setEditForm(f => ({ ...f, street: e.target.value }))} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Area</label>
                  <input type="text" value={editForm.area} onChange={e => setEditForm(f => ({ ...f, area: e.target.value }))} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Pincode</label>
                  <input type="text" value={editForm.pincode} onChange={e => setEditForm(f => ({ ...f, pincode: e.target.value }))} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" maxLength={6} />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Landmark</label>
                <input type="text" value={editForm.landmark} onChange={e => setEditForm(f => ({ ...f, landmark: e.target.value }))} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" placeholder="optional" />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Amount (₹)</label>
                  <input type="number" min="1" step="0.01" value={editForm.total_amount} onChange={e => setEditForm(f => ({ ...f, total_amount: e.target.value }))} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Payment</label>
                  <select value={editForm.payment_method} onChange={e => setEditForm(f => ({ ...f, payment_method: e.target.value }))} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500">
                    <option value="COD">COD</option>
                    <option value="ONLINE">Online</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Status</label>
                  <select value={editForm.status} onChange={e => setEditForm(f => ({ ...f, status: e.target.value }))} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500">
                    <option value="pending">Pending</option>
                    <option value="confirmed">Confirmed</option>
                    <option value="shipped">Shipped</option>
                    <option value="delivered">Delivered</option>
                    <option value="cancelled">Cancelled</option>
                    <option value="failed">Failed</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Notes / Items</label>
                <textarea rows={2} value={editForm.notes} onChange={e => setEditForm(f => ({ ...f, notes: e.target.value }))} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none" />
              </div>
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setEditOrder(null)} className="flex-1 bg-gray-100 text-gray-700 py-3 rounded-xl font-semibold hover:bg-gray-200 transition">Cancel</button>
                <button type="submit" disabled={editLoading} className="flex-1 bg-primary-600 text-white py-3 rounded-xl font-bold hover:bg-primary-700 transition disabled:opacity-70 flex items-center justify-center gap-2">
                  {editLoading ? <><Loader2 className="w-4 h-4 animate-spin" />Saving...</> : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── ADD ORDER MODAL ─────────────────────────────────── */}
      {showAdd && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 overflow-y-auto" onClick={() => setShowAdd(false)}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-lg shadow-2xl my-4" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-5">
              <h3 className="text-lg font-bold text-gray-900">Add Order</h3>
              <button onClick={() => setShowAdd(false)}><X className="w-5 h-5 text-gray-400 hover:text-gray-600" /></button>
            </div>
            {addError && (
              <div className="mb-4 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl p-3 flex gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />{addError}
              </div>
            )}
            <form onSubmit={handleAddOrder} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Customer Name *</label>
                  <input required type="text" value={addForm.customer_name} onChange={e => setAddForm(f => ({ ...f, customer_name: e.target.value }))} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" placeholder="Ravi Kumar" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Phone *</label>
                  <input required type="tel" value={addForm.customer_phone} onChange={e => setAddForm(f => ({ ...f, customer_phone: e.target.value }))} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" placeholder="9900000000" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Street Address *</label>
                <input required type="text" value={addForm.street} onChange={e => setAddForm(f => ({ ...f, street: e.target.value }))} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" placeholder="#12, 5th Cross, Jayanagar" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Area / Locality *</label>
                  <input required type="text" value={addForm.area} onChange={e => setAddForm(f => ({ ...f, area: e.target.value }))} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" placeholder="Jayanagar" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Pincode *</label>
                  <input required type="text" value={addForm.pincode} onChange={e => setAddForm(f => ({ ...f, pincode: e.target.value }))} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" placeholder="560011" maxLength={6} />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Landmark <span className="text-gray-400 font-normal">(optional)</span></label>
                <input type="text" value={addForm.landmark} onChange={e => setAddForm(f => ({ ...f, landmark: e.target.value }))} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" placeholder="Near Metro Station" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Total Amount (₹) *</label>
                  <input required type="number" min="1" step="0.01" value={addForm.total_amount} onChange={e => setAddForm(f => ({ ...f, total_amount: e.target.value }))} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" placeholder="1299" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Payment Method *</label>
                  <select value={addForm.payment_method} onChange={e => setAddForm(f => ({ ...f, payment_method: e.target.value }))} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500">
                    <option value="COD">COD (Cash on Delivery)</option>
                    <option value="ONLINE">Online (Already Paid)</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Items / Notes <span className="text-gray-400 font-normal">(optional)</span></label>
                <textarea rows={2} value={addForm.notes} onChange={e => setAddForm(f => ({ ...f, notes: e.target.value }))} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none" placeholder="2x Widget, 1x Gadget..." />
              </div>
              <button type="submit" disabled={addLoading} className="w-full bg-primary-600 text-white py-3 rounded-xl font-bold hover:bg-primary-700 transition disabled:opacity-70 flex items-center justify-center gap-2 mt-2">
                {addLoading ? <><Loader2 className="w-4 h-4 animate-spin" />Creating...</> : 'Create Order'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ── BULK UPLOAD MODAL ─────────────────────────────────── */}
      {showBulk && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 overflow-y-auto" onClick={() => setShowBulk(false)}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-3xl shadow-2xl my-4" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-5">
              <h3 className="text-lg font-bold text-gray-900">Bulk Upload Orders</h3>
              <button onClick={() => setShowBulk(false)}><X className="w-5 h-5 text-gray-400 hover:text-gray-600" /></button>
            </div>
            <div className="flex gap-3 mb-5">
              <button onClick={downloadTemplate} className="flex items-center gap-2 bg-emerald-50 text-emerald-700 border border-emerald-200 px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-emerald-100 transition-colors">
                <Download className="w-4 h-4" /> Download Template (.xlsx)
              </button>
              <label className="flex items-center gap-2 bg-primary-50 text-primary-700 border border-primary-200 px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-primary-100 transition-colors cursor-pointer">
                <Upload className="w-4 h-4" /> Upload CSV / XLSX
                <input ref={fileRef} type="file" accept=".csv,.xlsx,.xls" className="hidden" onChange={handleFileUpload} />
              </label>
            </div>

            {bulkRows.length === 0 ? (
              <div className="border-2 border-dashed border-gray-200 rounded-xl p-10 text-center text-gray-400 text-sm">
                Download the template → fill customer data → upload here
              </div>
            ) : (
              <>
                <div className="text-sm text-gray-600 mb-3">
                  Preview: <strong className="text-emerald-600">{bulkRows.filter(r => r.valid).length} valid</strong>
                  {bulkRows.some(r => !r.valid) && <span className="text-red-500 ml-2">· {bulkRows.filter(r => !r.valid).length} with errors</span>}
                  <span className="text-gray-400 ml-2">/ {bulkRows.length} total rows</span>
                </div>
                <div className="overflow-auto max-h-64 rounded-xl border border-gray-200 mb-4">
                  <table className="w-full text-xs">
                    <thead className="bg-gray-50 sticky top-0">
                      <tr>
                        {['', 'Name', 'Phone', 'Street', 'Area', 'Pin', 'Amount', 'Pay'].map(h => (
                          <th key={h} className="p-2 text-left font-semibold text-gray-600">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {bulkRows.map((row, i) => (
                        <tr key={i} className={`border-t border-gray-100 ${row.valid ? '' : 'bg-red-50'}`}>
                          <td className="p-2">
                            {row.valid
                              ? <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
                              : <span className="text-red-500 text-xs leading-tight">{row.error}</span>}
                          </td>
                          <td className="p-2 text-gray-700">{row.customer_name}</td>
                          <td className="p-2 text-gray-700">{row.customer_phone}</td>
                          <td className="p-2 text-gray-700 max-w-[100px] truncate">{row.street}</td>
                          <td className="p-2 text-gray-700">{row.area}</td>
                          <td className="p-2 text-gray-700">{row.pincode}</td>
                          <td className="p-2 text-right text-gray-700">₹{row.total_amount}</td>
                          <td className="p-2 text-gray-700">{row.payment_method}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {bulkResult && (
                  <div className="mb-3 bg-gray-50 border border-gray-200 text-gray-700 text-sm rounded-xl p-3">{bulkResult}</div>
                )}
                <button
                  disabled={bulkImporting || bulkRows.filter(r => r.valid).length === 0}
                  onClick={handleBulkImport}
                  className="w-full bg-primary-600 text-white py-3 rounded-xl font-bold hover:bg-primary-700 transition disabled:opacity-70 flex items-center justify-center gap-2"
                >
                  {bulkImporting
                    ? <><Loader2 className="w-4 h-4 animate-spin" />Importing...</>
                    : `Import ${bulkRows.filter(r => r.valid).length} Orders`}
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* ── DELETE CONFIRMATION MODAL ─────────────────────────── */}
      <AnimatePresence>
        {showDeleteConfirm && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/50 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.92, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: 20 }}
              className="bg-white rounded-3xl w-full max-w-xs p-6 shadow-2xl text-center"
            >
              <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertTriangle className="w-8 h-8 text-red-500" />
              </div>
              <h3 className="text-xl font-black text-gray-900 mb-2">Delete {selected.size} Order{selected.size > 1 ? 's' : ''}?</h3>
              <p className="text-gray-500 text-sm mb-6 leading-relaxed">
                This will permanently remove {selected.size === 1 ? 'this order' : 'these orders'} and cannot be undone.
              </p>
              <div className="flex flex-col gap-3">
                <button
                  onClick={confirmDelete}
                  disabled={deleting}
                  className="w-full bg-red-600 text-white py-3.5 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-70"
                >
                  {deleting ? <><Loader2 className="w-4 h-4 animate-spin" /> Deleting...</> : <><Trash2 className="w-4 h-4" /> Yes, Delete</>}
                </button>
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  disabled={deleting}
                  className="w-full bg-gray-100 text-gray-600 py-3.5 rounded-2xl font-bold text-sm"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── ASSIGN TO DRIVER MODAL ─────────────────────────────── */}
      {showAssign && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 overflow-y-auto" onClick={() => !creating && !optimizing && setShowAssign(false)}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-lg shadow-2xl my-4" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-5">
              <div>
                <h3 className="text-lg font-bold text-gray-900">Assign Route</h3>
                <p className="text-xs text-gray-400 mt-0.5">Hub: RR Nagar, Bangalore · auto-sorted by distance</p>
              </div>
              <button onClick={() => setShowAssign(false)} disabled={creating || optimizing}><X className="w-5 h-5 text-gray-400" /></button>
            </div>

            <div className="mb-4">
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Select Driver *</label>
              <select
                value={selectedDriver}
                onChange={e => setSelectedDriver(e.target.value)}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="">— Choose a driver —</option>
                {drivers.map(d => (
                  <option key={d.id} value={d.id}>{d.full_name || 'Unnamed'}{d.phone_number ? ` · ${d.phone_number}` : ''}</option>
                ))}
              </select>
            </div>

            <div className="mb-1">
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs font-medium text-gray-600">{routeStops.length} Delivery Stops</span>
                {!optimizing && <span className="text-xs text-gray-400">↕ drag to reorder</span>}
              </div>
              {optimizing ? (
                <div className="flex items-center justify-center gap-2 py-10 text-gray-500 text-sm border-2 border-dashed border-gray-200 rounded-xl">
                  <Loader2 className="w-4 h-4 animate-spin text-primary-600" />
                  Geocoding addresses & sorting by distance…
                </div>
              ) : (
                <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                  {routeStops.map((stop, i) => (
                    <div key={stop.order_id} className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl p-3">
                      <span className="w-6 h-6 bg-primary-600 text-white text-xs font-bold rounded-full flex items-center justify-center flex-shrink-0">{i + 1}</span>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold text-gray-900 truncate">{stop.customer_name}</div>
                        <div className="text-xs text-gray-500 truncate">{stop.address_text}</div>
                        <div className="flex gap-3 mt-0.5">
                          {stop.distance_km !== undefined && stop.distance_km < 999 && (
                            <span className="text-xs text-primary-600">{stop.distance_km.toFixed(1)} km</span>
                          )}
                          <span className="text-xs text-gray-500">₹{stop.amount.toLocaleString()}</span>
                        </div>
                      </div>
                      <div className="flex flex-col gap-0.5 flex-shrink-0">
                        <button onClick={() => moveStop(i, -1)} disabled={i === 0} className="p-1 hover:bg-gray-200 rounded disabled:opacity-30 transition-colors">
                          <ChevronUp className="w-3.5 h-3.5 text-gray-500" />
                        </button>
                        <button onClick={() => moveStop(i, 1)} disabled={i === routeStops.length - 1} className="p-1 hover:bg-gray-200 rounded disabled:opacity-30 transition-colors">
                          <ChevronDown className="w-3.5 h-3.5 text-gray-500" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {assignError && (
              <div className="mt-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl p-3 flex gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />{assignError}
              </div>
            )}

            <button
              disabled={creating || optimizing || !selectedDriver}
              onClick={handleCreateRoute}
              className="w-full mt-4 bg-primary-600 text-white py-3 rounded-xl font-bold hover:bg-primary-700 transition disabled:opacity-70 flex items-center justify-center gap-2"
            >
              {creating
                ? <><Loader2 className="w-4 h-4 animate-spin" />Creating Route…</>
                : <><Navigation className="w-4 h-4" />Confirm & Assign Route</>}
            </button>
          </div>
        </div>
      )}
      {/* ── ORDER ACTIVITY PANEL ─────────────────────────────── */}
      <AnimatePresence>
        {activityOrder && (
          <div className="fixed inset-0 z-50 flex justify-end" onClick={() => setActivityOrder(null)}>
            <div className="absolute inset-0 bg-black/40" />
            <motion.div
              initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className="relative bg-white w-full max-w-md h-full flex flex-col shadow-2xl"
              onClick={e => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-start justify-between p-5 border-b border-gray-100 flex-shrink-0">
                <div>
                  <p className="text-xs font-bold text-primary-600 uppercase tracking-widest mb-1">Driver Activity</p>
                  <h3 className="text-lg font-black text-gray-900">{activityOrder.customer_name}</h3>
                  <p className="text-sm text-gray-500">{activityOrder.addresses ? `${activityOrder.addresses.street}, ${activityOrder.addresses.city}` : ''}</p>
                </div>
                <button onClick={() => setActivityOrder(null)} className="p-1 text-gray-400 hover:text-gray-600 mt-1">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="overflow-y-auto flex-1 p-5 space-y-4">
                {activityLoading ? (
                  <div className="flex items-center justify-center py-16">
                    <Loader2 className="w-6 h-6 animate-spin text-primary-600" />
                  </div>
                ) : !activityData ? (
                  <div className="text-center py-16 text-gray-400">
                    <Truck className="w-10 h-10 mx-auto mb-3 text-gray-300" />
                    <p className="text-sm font-medium">Not yet assigned to a driver</p>
                    <p className="text-xs mt-1">Assign this order to a route to see activity</p>
                  </div>
                ) : (
                  <>
                    {/* Stop status */}
                    <div className={`rounded-2xl p-4 border ${
                      activityData.stop_status === 'delivered'   ? 'bg-emerald-50 border-emerald-200' :
                      activityData.stop_status === 'failed'      ? 'bg-red-50 border-red-200' :
                      activityData.stop_status === 'rescheduled' ? 'bg-orange-50 border-orange-200' :
                      'bg-gray-50 border-gray-200'
                    }`}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Delivery Status</span>
                        <span className={`text-xs font-black px-2.5 py-1 rounded-full uppercase tracking-wider ${
                          activityData.stop_status === 'delivered'   ? 'bg-emerald-600 text-white' :
                          activityData.stop_status === 'failed'      ? 'bg-red-600 text-white' :
                          activityData.stop_status === 'rescheduled' ? 'bg-orange-500 text-white' :
                          'bg-gray-400 text-white'
                        }`}>
                          {activityData.stop_status}
                        </span>
                      </div>
                      {activityData.stop_updated_at && (
                        <div className="flex items-center gap-1.5 text-xs text-gray-500 mt-2">
                          <Clock className="w-3.5 h-3.5" />
                          {new Date(activityData.stop_updated_at).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', hour12: true })}
                        </div>
                      )}
                    </div>

                    {/* Driver info */}
                    {activityData.driver_name && (
                      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4">
                        <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Driver</p>
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 bg-slate-700 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                            {activityData.driver_name[0].toUpperCase()}
                          </div>
                          <div>
                            <div className="font-bold text-gray-900 text-sm">{activityData.driver_name}</div>
                            {activityData.driver_phone && (
                              <a href={`tel:${activityData.driver_phone}`} className="text-xs text-primary-600 font-medium flex items-center gap-1 mt-0.5">
                                <Phone className="w-3 h-3" />{activityData.driver_phone}
                              </a>
                            )}
                          </div>
                          {activityData.route_date && (
                            <div className="ml-auto text-right">
                              <div className="text-xs text-gray-400">Route date</div>
                              <div className="text-xs font-semibold text-gray-700">
                                {new Date(activityData.route_date + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* COD collection status */}
                    {activityOrder.payment_method === 'COD' && (
                      <div className={`rounded-2xl p-4 border flex items-center justify-between ${
                        activityData.cod_collected ? 'bg-emerald-50 border-emerald-200' : 'bg-orange-50 border-orange-200'
                      }`}>
                        <div>
                          <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-0.5">Cash Collection</p>
                          <p className={`text-sm font-bold ${activityData.cod_collected ? 'text-emerald-700' : 'text-orange-600'}`}>
                            {activityData.cod_collected ? `₹${Number(activityOrder.total_amount).toLocaleString()} Collected` : 'Not yet collected'}
                          </p>
                        </div>
                        <span className="text-2xl">{activityData.cod_collected ? '✅' : '⏳'}</span>
                      </div>
                    )}

                    {/* Remarks */}
                    {activityData.delivery_remarks && (
                      <div className="bg-red-50 border border-red-200 rounded-2xl p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <MessageSquare className="w-4 h-4 text-red-500" />
                          <span className="text-xs font-bold text-red-600 uppercase tracking-wider">Driver Remarks</span>
                        </div>
                        <p className="text-sm text-gray-800">{activityData.delivery_remarks}</p>
                      </div>
                    )}

                    {/* Reschedule info */}
                    {activityData.stop_status === 'rescheduled' && activityData.rescheduled_date && (
                      <div className="bg-orange-50 border border-orange-200 rounded-2xl p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <CalendarDays className="w-4 h-4 text-orange-500" />
                          <span className="text-xs font-bold text-orange-600 uppercase tracking-wider">Rescheduled For</span>
                        </div>
                        <p className="text-sm font-bold text-gray-900">
                          {new Date(activityData.rescheduled_date + 'T00:00:00').toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}
                        </p>
                        {activityData.rescheduled_slot && (
                          <p className="text-sm text-orange-600 font-semibold mt-0.5 capitalize">{activityData.rescheduled_slot} slot</p>
                        )}
                      </div>
                    )}

                    {/* Delivery proof */}
                    <div className="border border-gray-200 rounded-2xl p-4">
                      <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Delivery Proof</p>
                      <div className="grid grid-cols-2 gap-3">
                        {/* Photo */}
                        <div className="rounded-xl border border-gray-100 overflow-hidden bg-gray-50">
                          <div className="flex items-center gap-1.5 px-3 py-2 border-b border-gray-100">
                            <Camera className="w-3.5 h-3.5 text-gray-400" />
                            <span className="text-xs font-semibold text-gray-500">Photo</span>
                          </div>
                          {activityData.photo_url ? (
                            <a href={activityData.photo_url} target="_blank" rel="noopener noreferrer">
                              <img src={activityData.photo_url} alt="Delivery proof" className="w-full h-28 object-cover hover:opacity-90 transition-opacity" />
                            </a>
                          ) : (
                            <div className="h-28 flex items-center justify-center text-xs text-gray-400">Not taken</div>
                          )}
                        </div>

                        {/* Signature */}
                        <div className="rounded-xl border border-gray-100 overflow-hidden bg-gray-50">
                          <div className="flex items-center gap-1.5 px-3 py-2 border-b border-gray-100">
                            <FileSignature className="w-3.5 h-3.5 text-gray-400" />
                            <span className="text-xs font-semibold text-gray-500">Signature</span>
                          </div>
                          {activityData.signature_url ? (
                            <a href={activityData.signature_url} target="_blank" rel="noopener noreferrer">
                              <img src={activityData.signature_url} alt="Signature" className="w-full h-28 object-contain p-2 hover:opacity-90 transition-opacity" />
                            </a>
                          ) : (
                            <div className="h-28 flex items-center justify-center text-xs text-gray-400">Not collected</div>
                          )}
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}
