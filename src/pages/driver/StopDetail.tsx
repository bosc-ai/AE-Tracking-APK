import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowLeft, CheckCircle2, XCircle, Clock, Camera,
  IndianRupee, Navigation, Phone, Loader2, Pencil, X, RotateCcw,
  CalendarDays, ChevronLeft, ChevronRight, Sun, Sunset, Moon, Sunrise,
  MessageSquare,
} from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'

type StopData = {
  id: string
  order_id: string
  sequence: number
  status: 'pending' | 'delivered' | 'failed' | 'rescheduled'
  customerName: string
  customerPhone: string
  address: string
  notes: string | null
  codAmount: number
  paymentMethod: string
}

// ── Failure reasons ───────────────────────────────────────────────
const FAILURE_REASONS = [
  'Called, no answer',
  'Customer not available',
  'Customer rejected order',
  'Wrong address',
  'Damaged product',
  'Other',
]

// ── Signature Pad ────────────────────────────────────────────────
function SignaturePad({ onSave, onClose }: { onSave: (dataUrl: string) => void; onClose: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const drawing = useRef(false)
  const lastPos = useRef<{ x: number; y: number } | null>(null)

  const getPos = (e: React.TouchEvent | React.MouseEvent) => {
    const canvas = canvasRef.current!
    const rect = canvas.getBoundingClientRect()
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height
    if ('touches' in e) {
      return { x: (e.touches[0].clientX - rect.left) * scaleX, y: (e.touches[0].clientY - rect.top) * scaleY }
    }
    return { x: ((e as React.MouseEvent).clientX - rect.left) * scaleX, y: ((e as React.MouseEvent).clientY - rect.top) * scaleY }
  }

  const startDraw = (e: React.TouchEvent | React.MouseEvent) => { e.preventDefault(); drawing.current = true; lastPos.current = getPos(e) }
  const draw = (e: React.TouchEvent | React.MouseEvent) => {
    e.preventDefault()
    if (!drawing.current || !lastPos.current) return
    const canvas = canvasRef.current!
    const ctx = canvas.getContext('2d')!
    const pos = getPos(e)
    ctx.beginPath(); ctx.moveTo(lastPos.current.x, lastPos.current.y)
    ctx.lineTo(pos.x, pos.y); ctx.strokeStyle = '#1e293b'; ctx.lineWidth = 2.5; ctx.lineCap = 'round'; ctx.stroke()
    lastPos.current = pos
  }
  const stopDraw = () => { drawing.current = false; lastPos.current = null }
  const clear = () => { const canvas = canvasRef.current!; canvas.getContext('2d')!.clearRect(0, 0, canvas.width, canvas.height) }
  const save = () => { onSave(canvasRef.current!.toDataURL('image/png')) }

  return (
    <div className="fixed inset-0 bg-black/60 z-[60] flex items-end" onClick={onClose}>
      <motion.div initial={{ y: 300 }} animate={{ y: 0 }} exit={{ y: 300 }}
        className="bg-white rounded-t-3xl w-full flex flex-col" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex justify-between items-center px-5 pt-5 pb-3 flex-shrink-0">
          <h3 className="font-bold text-gray-900">Customer Signature</h3>
          <div className="flex gap-2">
            <button onClick={clear} className="flex items-center gap-1 text-xs text-gray-500 border border-gray-200 rounded-lg px-2 py-1">
              <RotateCcw className="w-3 h-3" /> Clear
            </button>
            <button onClick={onClose}><X className="w-5 h-5 text-gray-400" /></button>
          </div>
        </div>
        {/* Canvas */}
        <div className="px-5 flex-shrink-0">
          <div className="border-2 border-dashed border-gray-300 rounded-2xl bg-gray-50 overflow-hidden">
            <canvas ref={canvasRef} width={600} height={220} className="w-full touch-none cursor-crosshair"
              onMouseDown={startDraw} onMouseMove={draw} onMouseUp={stopDraw} onMouseLeave={stopDraw}
              onTouchStart={startDraw} onTouchMove={draw} onTouchEnd={stopDraw} />
          </div>
          <p className="text-xs text-gray-400 text-center mt-2">Draw signature above</p>
        </div>
        {/* Button — pinned above nav bar */}
        <div className="px-5 pt-4 pb-8 flex-shrink-0">
          <button onClick={save} className="w-full bg-slate-900 text-white py-3.5 rounded-2xl font-bold">
            Confirm Signature
          </button>
        </div>
      </motion.div>
    </div>
  )
}

// ── Confirm Delivery Modal ────────────────────────────────────────
function ConfirmDeliverModal({
  stop, paymentCollected, photoTaken, signed, saving, uploading,
  onConfirm, onClose,
}: {
  stop: StopData; paymentCollected: boolean; photoTaken: boolean; signed: boolean
  saving: boolean; uploading: boolean
  onConfirm: () => void; onClose: () => void
}) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-5 bg-black/50" onClick={onClose}>
      <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}
        className="bg-white rounded-3xl w-full max-w-sm p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckCircle2 className="w-9 h-9 text-emerald-600" />
        </div>
        <h3 className="text-xl font-black text-gray-900 text-center mb-1">Confirm Delivery?</h3>
        <p className="text-gray-500 text-sm text-center mb-4">{stop.customerName}</p>

        <div className="bg-gray-50 rounded-2xl p-4 space-y-2 mb-5">
          {stop.codAmount > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Cash collected</span>
              <span className={`font-bold ${paymentCollected ? 'text-emerald-600' : 'text-orange-500'}`}>
                {paymentCollected ? `₹${stop.codAmount.toLocaleString()} ✓` : 'Not marked yet'}
              </span>
            </div>
          )}
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Photo proof</span>
            <span className={`font-semibold ${photoTaken ? 'text-emerald-600' : 'text-gray-400'}`}>{photoTaken ? 'Taken ✓' : 'None'}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Signature</span>
            <span className={`font-semibold ${signed ? 'text-emerald-600' : 'text-gray-400'}`}>{signed ? 'Collected ✓' : 'None'}</span>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <button onClick={onConfirm} disabled={saving || uploading}
            className="w-full bg-emerald-600 text-white py-3.5 rounded-2xl font-bold flex items-center justify-center gap-2 disabled:opacity-70">
            {(saving || uploading) ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle2 className="w-5 h-5" />}
            {uploading ? 'Uploading...' : saving ? 'Saving...' : 'Yes, Mark as Delivered'}
          </button>
          <button onClick={onClose} className="w-full bg-gray-100 text-gray-600 py-3.5 rounded-2xl font-bold">Cancel</button>
        </div>
      </motion.div>
    </div>
  )
}

// ── Failure / Non-delivery Remarks Modal ─────────────────────────
function FailureRemarksModal({
  onConfirm, onClose,
}: {
  onConfirm: (remarks: string) => void
  onClose: () => void
}) {
  const [reason, setReason]       = useState('')
  const [notes, setNotes]         = useState('')
  const [confirming, setConfirming] = useState(false)

  const doConfirm = () => {
    const remarks = [reason, notes].filter(Boolean).join(' — ')
    onConfirm(remarks)
  }

  /* ── Confirmation step ── */
  if (confirming) {
    return (
      <div className="fixed inset-0 z-[60] flex items-end bg-black/50">
        <motion.div initial={{ y: '100%' }} animate={{ y: 0 }}
          transition={{ type: 'spring', damping: 30, stiffness: 300 }}
          className="bg-white rounded-t-3xl w-full flex flex-col">
          <div className="px-5 pt-6 pb-4 text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <XCircle className="w-9 h-9 text-red-600" />
            </div>
            <h3 className="text-xl font-black text-gray-900 mb-2">Are you sure?</h3>
            {reason && (
              <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-2 mb-2">
                <p className="text-sm font-bold text-red-700">{reason}</p>
              </div>
            )}
            {notes && <p className="text-sm text-gray-500 mb-2">{notes}</p>}
            <p className="text-xs text-gray-400">This will mark the order as failed and notify the admin.</p>
          </div>
          <div className="px-5 pb-10 space-y-3 flex-shrink-0">
            <button onClick={doConfirm}
              className="w-full bg-red-600 text-white py-4 rounded-2xl font-bold text-base active:scale-[0.97]">
              Yes, Mark as Failed
            </button>
            <button onClick={() => setConfirming(false)}
              className="w-full bg-gray-100 text-gray-700 py-4 rounded-2xl font-bold text-base">
              No, Go Back
            </button>
          </div>
        </motion.div>
      </div>
    )
  }

  /* ── Main form ── */
  return (
    <div className="fixed inset-0 z-[60] flex items-end bg-black/50" onClick={onClose}>
      <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 30, stiffness: 300 }}
        className="bg-white rounded-t-3xl w-full max-h-[85vh] flex flex-col"
        onClick={e => e.stopPropagation()}>

        <div className="flex items-center justify-between px-5 pt-5 pb-3 flex-shrink-0 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <XCircle className="w-5 h-5 text-red-500" />
            <h3 className="font-bold text-gray-900 text-lg">Mark as Failed</h3>
          </div>
          <button onClick={onClose} className="p-1 text-gray-400"><X className="w-5 h-5" /></button>
        </div>

        <div className="px-5 py-4 overflow-y-auto flex-1 space-y-4">
          <p className="text-sm text-gray-500">Why couldn't this be delivered? <span className="text-red-400 font-medium">*required</span></p>
          <div className="grid grid-cols-2 gap-2">
            {FAILURE_REASONS.map(r => (
              <button key={r} onClick={() => setReason(r === reason ? '' : r)}
                className={`text-sm font-semibold border-2 rounded-2xl px-3 py-3 text-left transition-all active:scale-95 ${
                  reason === r ? 'border-red-400 bg-red-50 text-red-700' : 'border-gray-200 bg-white text-gray-600'
                }`}>
                {r}
              </button>
            ))}
          </div>
        </div>

        <div className="px-5 pt-2 pb-2 flex-shrink-0 border-t border-gray-100">
          <label className="flex items-center gap-1.5 text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
            <MessageSquare className="w-3.5 h-3.5" /> Additional Notes (optional)
          </label>
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="e.g. Customer said to come back after 5pm..."
            rows={2}
            className="w-full border border-gray-200 rounded-2xl px-4 py-3 text-sm resize-none focus:outline-none focus:border-red-400 focus:ring-1 focus:ring-red-200"
            style={{ fontSize: '16px' }}
          />
        </div>

        <div className="px-5 pt-2 pb-10 flex-shrink-0">
          <button
            onClick={() => { if (reason) setConfirming(true) }}
            disabled={!reason}
            className="w-full bg-red-600 disabled:bg-gray-200 disabled:text-gray-400 text-white py-4 rounded-2xl font-bold text-base active:scale-[0.97] transition-all">
            {reason ? `Mark as Failed — ${reason}` : 'Select a reason above'}
          </button>
        </div>
      </motion.div>
    </div>
  )
}

// ── Time slots ───────────────────────────────────────────────────
const TIME_SLOTS = [
  { id: 'morning',   label: 'Morning',   range: '9:00 – 12:00 PM', icon: Sunrise,  color: 'border-amber-300 bg-amber-50 text-amber-700' },
  { id: 'afternoon', label: 'Afternoon', range: '12:00 – 3:00 PM', icon: Sun,      color: 'border-orange-300 bg-orange-50 text-orange-700' },
  { id: 'evening',   label: 'Evening',   range: '3:00 – 6:00 PM',  icon: Sunset,   color: 'border-purple-300 bg-purple-50 text-purple-700' },
  { id: 'night',     label: 'Night',     range: '6:00 – 9:00 PM',  icon: Moon,     color: 'border-slate-300 bg-slate-50 text-slate-700' },
]

function buildCalendarDays(year: number, month: number) {
  const firstDay = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  return [...Array(firstDay).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)]
}

// ── Reschedule reasons ────────────────────────────────────────────
const RESCHEDULE_REASONS = [
  'Customer requested',
  'Customer not available',
  'Address not found',
  'Vehicle breakdown',
  'Too many stops',
  'Other',
]

// ── Reschedule Picker ─────────────────────────────────────────────
function ReschedulePicker({
  onConfirm, onClose,
}: {
  onConfirm: (date: string, slot: string, remarks: string) => void
  onClose: () => void
}) {
  const today = new Date()
  const [year, setYear]         = useState(today.getFullYear())
  const [month, setMonth]       = useState(today.getMonth())
  const [selDay, setSelDay]     = useState<number | null>(null)
  const [selSlot, setSelSlot]   = useState<string | null>(null)
  const [reason, setReason]     = useState('')
  const [notes, setNotes]       = useState('')
  const [confirming, setConfirming] = useState(false)

  const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
  const DAYS   = ['Su','Mo','Tu','We','Th','Fr','Sa']

  const prevMonth = () => { if (month === 0) { setMonth(11); setYear(y => y - 1) } else setMonth(m => m - 1); setSelDay(null) }
  const nextMonth = () => { if (month === 11) { setMonth(0); setYear(y => y + 1) } else setMonth(m => m + 1); setSelDay(null) }
  const isToday   = (d: number) => d === today.getDate() && month === today.getMonth() && year === today.getFullYear()
  const isPast    = (d: number) => new Date(year, month, d) < new Date(today.getFullYear(), today.getMonth(), today.getDate())
  const cells     = buildCalendarDays(year, month)
  const canConfirm = selDay !== null && selSlot !== null && !!reason

  const doConfirm = () => {
    if (!selDay || !selSlot) return
    const mm = String(month + 1).padStart(2, '0')
    const dd = String(selDay).padStart(2, '0')
    const remarks = [reason, notes].filter(Boolean).join(' — ')
    onConfirm(`${year}-${mm}-${dd}`, selSlot, remarks)
  }

  /* ── Confirmation step ── */
  if (confirming) {
    const slotInfo = TIME_SLOTS.find(s => s.id === selSlot)
    return (
      <div className="fixed inset-0 bg-black/60 z-[60] flex items-end">
        <motion.div initial={{ y: '100%' }} animate={{ y: 0 }}
          transition={{ type: 'spring', damping: 30, stiffness: 300 }}
          className="bg-white rounded-t-3xl w-full flex flex-col">
          <div className="px-5 pt-6 pb-4 text-center">
            <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <CalendarDays className="w-9 h-9 text-orange-500" />
            </div>
            <h3 className="text-xl font-black text-gray-900 mb-3">Confirm Reschedule?</h3>
            <div className="bg-orange-50 border border-orange-200 rounded-2xl px-4 py-3 text-left space-y-1 mb-3">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Date</span>
                <span className="font-bold text-gray-900">{MONTHS[month]} {selDay}, {year}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Slot</span>
                <span className="font-bold text-orange-700">{slotInfo?.label} · {slotInfo?.range}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Reason</span>
                <span className="font-bold text-gray-900">{reason}</span>
              </div>
              {notes && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Notes</span>
                  <span className="text-gray-700 text-right max-w-[60%]">{notes}</span>
                </div>
              )}
            </div>
          </div>
          <div className="px-5 pb-10 space-y-3 flex-shrink-0">
            <button onClick={doConfirm}
              className="w-full bg-orange-500 text-white py-4 rounded-2xl font-bold text-base active:scale-[0.97]">
              Yes, Reschedule
            </button>
            <button onClick={() => setConfirming(false)}
              className="w-full bg-gray-100 text-gray-700 py-4 rounded-2xl font-bold text-base">
              No, Go Back
            </button>
          </div>
        </motion.div>
      </div>
    )
  }

  /* ── Main form ── */
  return (
    <div className="fixed inset-0 bg-black/60 z-[60] flex items-end" onClick={onClose}>
      <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 30, stiffness: 300 }}
        className="bg-white rounded-t-3xl w-full max-h-[92vh] flex flex-col"
        onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-3 flex-shrink-0 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <CalendarDays className="w-5 h-5 text-orange-500" />
            <h3 className="font-bold text-gray-900 text-lg">Reschedule Delivery</h3>
          </div>
          <button onClick={onClose} className="p-1 text-gray-400"><X className="w-5 h-5" /></button>
        </div>

        {/* Scrollable content */}
        <div className="px-5 space-y-4 overflow-y-auto flex-1 py-4">
          {/* Reschedule reason */}
          <div>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Reason for Reschedule <span className="text-orange-500">*</span></p>
            <div className="grid grid-cols-2 gap-2">
              {RESCHEDULE_REASONS.map(r => (
                <button key={r} onClick={() => setReason(r === reason ? '' : r)}
                  className={`text-sm font-semibold border-2 rounded-2xl px-3 py-2.5 text-left transition-all active:scale-95 ${
                    reason === r ? 'border-orange-400 bg-orange-50 text-orange-700' : 'border-gray-200 bg-white text-gray-600'
                  }`}>
                  {r}
                </button>
              ))}
            </div>
          </div>

          {/* Month nav */}
          <div>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Choose Date</p>
            <div className="flex items-center justify-between mb-3">
              <button onClick={prevMonth} className="w-9 h-9 flex items-center justify-center rounded-xl border border-gray-200 active:scale-90 transition-transform">
                <ChevronLeft className="w-4 h-4 text-gray-600" />
              </button>
              <span className="font-bold text-gray-900">{MONTHS[month]} {year}</span>
              <button onClick={nextMonth} className="w-9 h-9 flex items-center justify-center rounded-xl border border-gray-200 active:scale-90 transition-transform">
                <ChevronRight className="w-4 h-4 text-gray-600" />
              </button>
            </div>
            <div className="grid grid-cols-7 mb-1">
              {DAYS.map(d => <div key={d} className="text-center text-[11px] font-bold text-gray-400 py-1">{d}</div>)}
            </div>
            <div className="grid grid-cols-7 gap-y-1">
              {cells.map((day, i) => {
                if (!day) return <div key={`b${i}`} />
                const past = isPast(day); const todayMark = isToday(day); const selected = selDay === day
                return (
                  <button key={day} disabled={past} onClick={() => setSelDay(day)}
                    className={`mx-auto w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold transition-all active:scale-90
                      ${selected  ? 'bg-orange-500 text-white shadow-md shadow-orange-200' :
                        todayMark ? 'border-2 border-orange-400 text-orange-600' :
                        past      ? 'text-gray-300 cursor-not-allowed' : 'text-gray-800 hover:bg-orange-50'}`}>
                    {day}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Time slots */}
          <div>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Choose Time Slot</p>
            <div className="grid grid-cols-2 gap-2">
              {TIME_SLOTS.map(({ id, label, range, icon: Icon, color }) => {
                const active = selSlot === id
                return (
                  <button key={id} onClick={() => setSelSlot(id)}
                    className={`flex items-center gap-3 border-2 rounded-2xl px-4 py-3.5 transition-all active:scale-95 ${active ? color + ' shadow-sm' : 'border-gray-200 bg-white text-gray-600'}`}>
                    <Icon className={`w-5 h-5 flex-shrink-0 ${active ? '' : 'text-gray-400'}`} />
                    <div className="text-left">
                      <div className="font-bold text-sm leading-tight">{label}</div>
                      <div className={`text-[10px] leading-tight ${active ? 'opacity-80' : 'text-gray-400'}`}>{range}</div>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

        </div>

        {/* Notes — pinned outside scroll area so keyboard never pushes it up */}
        <div className="px-5 pt-2 pb-2 flex-shrink-0 border-t border-gray-100">
          <label className="flex items-center gap-1.5 text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
            <MessageSquare className="w-3.5 h-3.5" /> Additional Notes (optional)
          </label>
          <textarea value={notes} onChange={e => setNotes(e.target.value)}
            placeholder="e.g. Call before coming, deliver after 5pm..."
            rows={2}
            className="w-full border border-gray-200 rounded-2xl px-4 py-3 text-sm resize-none focus:outline-none focus:border-orange-400 focus:ring-1 focus:ring-orange-200"
            style={{ fontSize: '16px' }} />
        </div>

        {/* Confirm button */}
        <div className="px-5 pt-2 pb-10 flex-shrink-0">
          <button disabled={!canConfirm} onClick={() => canConfirm && setConfirming(true)}
            className="w-full bg-orange-500 disabled:bg-gray-200 disabled:text-gray-400 text-white py-4 rounded-2xl font-bold text-base transition-all active:scale-[0.97]">
            {!reason ? 'Select a reason first' : !selDay || !selSlot ? 'Select date & time slot' : 'Review & Confirm Reschedule'}
          </button>
        </div>
      </motion.div>
    </div>
  )
}

// ── Main Component ───────────────────────────────────────────────
export default function StopDetail() {
  const { stopId } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [stop, setStop] = useState<StopData | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [paymentCollected, setPaymentCollected] = useState(false)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [signatureUrl, setSignatureUrl] = useState<string | null>(null)
  const [showSignaturePad, setShowSignaturePad] = useState(false)
  const [showRescheduler, setShowRescheduler] = useState(false)
  const [showConfirmDeliver, setShowConfirmDeliver] = useState(false)
  const [showFailureModal, setShowFailureModal] = useState(false)
  const [currentStatus, setCurrentStatus] = useState<StopData['status']>('pending')
  const [rescheduleDate, setRescheduleDate] = useState<string | null>(null)
  const [rescheduleSlot, setRescheduleSlot] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [deliveryRemarks, setDeliveryRemarks] = useState<string | null>(null)

  useEffect(() => { if (stopId) loadStop() }, [stopId])

  async function loadStop() {
    setLoading(true); setError('')
    setPaymentCollected(false); setPhotoPreview(null); setPhotoFile(null); setSignatureUrl(null)
    const { data, error } = await supabase.rpc('get_stop_detail', { p_stop_id: stopId })
    if (error || !data || data.length === 0) {
      setError('Could not load stop details. Please go back and try again.')
      setLoading(false); return
    }
    const d = data[0]
    const addressText = d.address_street
      ? `${d.address_street}, ${d.address_city}${d.address_landmark ? ' · ' + d.address_landmark : ''}`
      : 'No address'
    const s: StopData = {
      id: d.stop_id, order_id: d.order_id, sequence: d.stop_sequence,
      status: (d.stop_status || 'pending').toLowerCase() as StopData['status'],
      customerName: d.customer_name || 'Customer', customerPhone: d.customer_phone || '',
      address: addressText, notes: d.notes || null,
      codAmount: d.payment_method === 'COD' ? Number(d.total_amount) : 0,
      paymentMethod: d.payment_method || 'COD',
    }
    setStop(s); setCurrentStatus(s.status); setLoading(false)
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setPhotoFile(file)
    const reader = new FileReader()
    reader.onloadend = () => setPhotoPreview(reader.result as string)
    reader.readAsDataURL(file)
  }

  const handleSignatureSave = useCallback((dataUrl: string) => {
    setSignatureUrl(dataUrl); setShowSignaturePad(false)
  }, [])

  async function uploadProofs(): Promise<{ photoUrl: string | null; sigUrl: string | null }> {
    let photoUrl: string | null = null
    let sigUrl: string | null = null
    if (!stop) return { photoUrl, sigUrl }
    setUploading(true)
    try {
      if (photoFile) {
        const ext = photoFile.name.split('.').pop() || 'jpg'
        const path = `stops/${stop.id}/photo_${Date.now()}.${ext}`
        const { error: upErr } = await supabase.storage.from('delivery-proofs').upload(path, photoFile, { contentType: photoFile.type, upsert: true })
        if (!upErr) {
          const { data: urlData } = supabase.storage.from('delivery-proofs').getPublicUrl(path)
          photoUrl = urlData.publicUrl
        }
      }
      if (signatureUrl) {
        const res = await fetch(signatureUrl)
        const blob = await res.blob()
        const path = `stops/${stop.id}/signature_${Date.now()}.png`
        const { error: sigErr } = await supabase.storage.from('delivery-proofs').upload(path, blob, { contentType: 'image/png', upsert: true })
        if (!sigErr) {
          const { data: urlData } = supabase.storage.from('delivery-proofs').getPublicUrl(path)
          sigUrl = urlData.publicUrl
        }
      }
    } catch (e) { console.error('Proof upload failed:', e) }
    setUploading(false)
    return { photoUrl, sigUrl }
  }

  async function updateStopStatus(
    newStatus: 'delivered' | 'failed' | 'rescheduled',
    rDate?: string, rSlot?: string, remarks?: string,
  ) {
    if (!stop || !user) return
    setSaving(true); setError('')
    try {
      const { photoUrl, sigUrl } = await uploadProofs()
      const { error } = await supabase.rpc('update_stop_status', {
        p_stop_id:          stop.id,
        p_status:           newStatus,
        p_cod_collected:    paymentCollected && stop.codAmount > 0,
        p_photo_url:        photoUrl,
        p_signature_url:    sigUrl,
        p_reschedule_date:  rDate ?? null,
        p_reschedule_slot:  rSlot ?? null,
        p_remarks:          remarks ?? null,
      })
      if (error) throw error
      if (rDate) { setRescheduleDate(rDate); setRescheduleSlot(rSlot ?? null) }
      if (remarks) setDeliveryRemarks(remarks)
      setCurrentStatus(newStatus)
    } catch (err: any) {
      setError(err.message || 'Failed to update. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  function handleDeliverConfirm() {
    setShowConfirmDeliver(false)
    updateStopStatus('delivered')
  }

  function handleFailureConfirm(remarks: string) {
    setShowFailureModal(false)
    updateStopStatus('failed', undefined, undefined, remarks)
  }

  function handleRescheduleConfirm(date: string, slot: string, remarks: string) {
    setShowRescheduler(false)
    updateStopStatus('rescheduled', date, slot, remarks)
  }

  if (loading) return <div className="flex items-center justify-center py-24"><Loader2 className="w-8 h-8 animate-spin text-primary-600" /></div>

  if (error && !stop) return (
    <div className="text-center py-24 px-4">
      <XCircle className="w-12 h-12 text-red-400 mx-auto mb-3" />
      <p className="text-gray-600 text-sm mb-4">{error}</p>
      <button onClick={() => navigate('/driver')} className="text-primary-600 font-semibold">← Back to route</button>
    </div>
  )

  if (!stop) return null

  // ── Completed screen ─────────────────────────────────────────
  if (currentStatus !== 'pending') {
    return (
      <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
        className="flex flex-col items-center justify-center text-center py-20 px-4 min-h-[70vh]">
        <div className={`w-24 h-24 rounded-full flex items-center justify-center mb-6 shadow-lg ${
          currentStatus === 'delivered' ? 'bg-emerald-100 shadow-emerald-500/20' :
          currentStatus === 'failed'    ? 'bg-red-100 shadow-red-500/20' : 'bg-orange-100 shadow-orange-500/20'
        }`}>
          {currentStatus === 'delivered'   && <CheckCircle2 className="w-12 h-12 text-emerald-600" />}
          {currentStatus === 'failed'      && <XCircle      className="w-12 h-12 text-red-600" />}
          {currentStatus === 'rescheduled' && <Clock        className="w-12 h-12 text-orange-600" />}
        </div>
        <h2 className="text-2xl font-extrabold text-gray-900 mb-2">
          {currentStatus === 'delivered' ? 'Delivered!' : currentStatus === 'failed' ? 'Marked Failed' : 'Rescheduled'}
        </h2>
        <p className="text-gray-500 mb-3 text-sm">
          {currentStatus === 'delivered'
            ? `₹${stop.codAmount > 0 ? stop.codAmount.toLocaleString() + ' COD collected' : 'Online — no cash needed'}`
            : currentStatus === 'failed' ? 'This stop has been marked as failed.'
            : 'Delivery rescheduled.'}
        </p>

        {/* Reschedule date */}
        {currentStatus === 'rescheduled' && rescheduleDate && (
          <div className="bg-orange-50 border border-orange-200 rounded-2xl px-5 py-3 mb-3 flex items-center gap-3 w-full max-w-xs">
            <CalendarDays className="w-5 h-5 text-orange-500 flex-shrink-0" />
            <div className="text-left">
              <div className="text-sm font-bold text-gray-900">
                {new Date(rescheduleDate + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
              </div>
              {rescheduleSlot && (
                <div className="text-xs text-orange-600 font-semibold">
                  {TIME_SLOTS.find(s => s.id === rescheduleSlot)?.label} · {TIME_SLOTS.find(s => s.id === rescheduleSlot)?.range}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Remarks */}
        {deliveryRemarks && (
          <div className="bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3 mb-3 flex items-start gap-2 w-full max-w-xs text-left">
            <MessageSquare className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
            <p className="text-sm text-gray-600">{deliveryRemarks}</p>
          </div>
        )}

        {photoPreview && <p className="text-xs text-emerald-600 mb-1">✓ Proof photo saved</p>}
        {signatureUrl && <p className="text-xs text-emerald-600 mb-4">✓ Signature saved</p>}
        {!photoPreview && !signatureUrl && <div className="mb-4" />}
        <button onClick={() => navigate('/driver')} className="bg-slate-900 text-white px-8 py-3 rounded-xl font-bold shadow-md">
          Back to Route
        </button>
      </motion.div>
    )
  }

  // ── Active stop screen ────────────────────────────────────────
  return (
    <div className="space-y-4 pb-28">
      <button onClick={() => navigate('/driver')} className="flex items-center text-sm font-medium text-gray-500 hover:text-gray-700 mb-2">
        <ArrowLeft className="w-4 h-4 mr-1" /> Back to route
      </button>

      {/* Customer info */}
      <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <div>
            <span className="text-xs font-bold text-primary-600 uppercase tracking-widest">Stop #{stop.sequence}</span>
            <h2 className="text-xl font-extrabold text-gray-900 mt-1">{stop.customerName}</h2>
          </div>
          {stop.customerPhone && (
            <a href={`tel:${stop.customerPhone}`}
              className="w-11 h-11 bg-emerald-100 rounded-full flex items-center justify-center hover:bg-emerald-200 transition-colors">
              <Phone className="w-5 h-5 text-emerald-700" />
            </a>
          )}
        </div>
        <p className="text-sm text-gray-500 mb-3">{stop.address}</p>
        {stop.notes && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 mb-3">
            <p className="text-xs font-semibold text-amber-700 mb-0.5">Note</p>
            <p className="text-sm text-amber-900">{stop.notes}</p>
          </div>
        )}
        <button
          onClick={() => window.open(`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(stop.address)}`, '_blank')}
          className="w-full bg-primary-600 text-white py-3 rounded-xl text-sm font-bold flex items-center justify-center shadow-sm hover:bg-primary-700 transition-colors">
          <Navigation className="w-4 h-4 mr-2" /> Navigate in Google Maps
        </button>
      </div>

      {/* Order info */}
      <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
        <h3 className="font-bold text-gray-900 mb-3">Order Details</h3>
        <div className="flex justify-between items-center py-2">
          <span className="text-sm text-gray-600">Payment Method</span>
          <span className={`text-sm font-bold ${stop.paymentMethod === 'COD' ? 'text-orange-600' : 'text-emerald-600'}`}>
            {stop.paymentMethod === 'COD' ? 'Cash on Delivery' : 'Already Paid Online'}
          </span>
        </div>
        <div className="flex justify-between items-center py-2 border-t border-gray-100">
          <span className="text-sm text-gray-600">Order Amount</span>
          <span className="text-sm font-bold text-gray-900">₹{Number(stop.codAmount || 0).toLocaleString()}</span>
        </div>
      </div>

      {/* COD Payment collection */}
      {stop.codAmount > 0 && (
        <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
          <h3 className="font-bold text-gray-900 mb-3">Collect Cash</h3>
          <div className={`flex items-center justify-between rounded-xl p-4 mb-4 border transition-all ${
            paymentCollected ? 'bg-emerald-50 border-emerald-300' : 'bg-orange-50 border-orange-200'}`}>
            <div>
              <span className="text-xs font-bold text-orange-600 uppercase tracking-wider">COD Amount</span>
              <div className="text-2xl font-black text-orange-700 flex items-center mt-1">
                <IndianRupee className="w-5 h-5 mr-0.5" /> {stop.codAmount.toLocaleString()}
              </div>
            </div>
            {paymentCollected ? <CheckCircle2 className="w-9 h-9 text-emerald-500" /> : <span className="text-2xl">💵</span>}
          </div>
          <button onClick={() => setPaymentCollected(v => !v)}
            className={`w-full py-3.5 rounded-xl text-sm font-bold flex items-center justify-center transition-all ${
              paymentCollected ? 'bg-emerald-500 text-white shadow-md shadow-emerald-200' : 'bg-slate-900 text-white shadow-sm'}`}>
            <IndianRupee className="w-4 h-4 mr-1.5" />
            {paymentCollected ? 'Cash Received ✓ — Tap to undo' : 'Mark Cash Received'}
          </button>
        </div>
      )}

      {/* Delivery proof */}
      <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
        <h3 className="font-bold text-gray-900 mb-3">Delivery Proof <span className="text-gray-400 font-normal text-xs">(optional)</span></h3>
        <input ref={fileInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFileChange} />
        <div className="grid grid-cols-2 gap-3">
          <button onClick={() => fileInputRef.current?.click()}
            className={`py-8 rounded-xl border-2 border-dashed flex flex-col items-center justify-center text-sm font-medium transition-all ${
              photoPreview ? 'border-emerald-300 bg-emerald-50' : 'border-gray-300 hover:border-primary-400 hover:bg-primary-50'}`}>
            {photoPreview
              ? <><img src={photoPreview} alt="Proof" className="w-full h-20 object-cover rounded-lg mb-1" /><span className="text-xs text-emerald-600 font-semibold">✓ Photo taken</span></>
              : <><Camera className="w-7 h-7 text-gray-400 mb-2" /><span className="text-gray-500 text-xs">Take Photo</span></>}
          </button>
          <button onClick={() => setShowSignaturePad(true)}
            className={`py-8 rounded-xl border-2 border-dashed flex flex-col items-center justify-center text-sm font-medium transition-all ${
              signatureUrl ? 'border-emerald-300 bg-emerald-50' : 'border-gray-300 hover:border-primary-400 hover:bg-primary-50'}`}>
            {signatureUrl
              ? <><img src={signatureUrl} alt="Signature" className="w-full h-20 object-contain rounded-lg mb-1" /><span className="text-xs text-emerald-600 font-semibold">✓ Signed</span></>
              : <><Pencil className="w-7 h-7 text-gray-400 mb-2" /><span className="text-gray-500 text-xs">Get Signature</span></>}
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl p-3 flex items-center gap-2">
          <XCircle className="w-4 h-4 flex-shrink-0" />{error}
        </div>
      )}

      {/* Action buttons */}
      <div className="space-y-3 pt-1">
        <button
          onClick={() => setShowConfirmDeliver(true)}
          disabled={saving || uploading}
          className="w-full bg-emerald-600 text-white py-4 rounded-xl font-bold shadow-lg shadow-emerald-500/20 flex items-center justify-center text-base hover:bg-emerald-700 transition-colors active:scale-[0.98] disabled:opacity-70">
          <CheckCircle2 className="w-5 h-5 mr-2" /> Mark as Delivered
        </button>
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => setShowFailureModal(true)}
            disabled={saving || uploading}
            className="bg-white border border-red-200 text-red-600 py-3.5 rounded-xl font-bold flex items-center justify-center hover:bg-red-50 transition-colors disabled:opacity-70">
            <XCircle className="w-4 h-4 mr-1.5" /> Failed
          </button>
          <button
            onClick={() => setShowRescheduler(true)}
            disabled={saving || uploading}
            className="bg-white border border-orange-200 text-orange-600 py-3.5 rounded-xl font-bold flex items-center justify-center hover:bg-orange-50 transition-colors disabled:opacity-70">
            <Clock className="w-4 h-4 mr-1.5" /> Reschedule
          </button>
        </div>
      </div>

      {/* Modals */}
      <AnimatePresence>
        {showSignaturePad && <SignaturePad onSave={handleSignatureSave} onClose={() => setShowSignaturePad(false)} />}
      </AnimatePresence>
      <AnimatePresence>
        {showConfirmDeliver && stop && (
          <ConfirmDeliverModal
            stop={stop} paymentCollected={paymentCollected}
            photoTaken={!!photoPreview} signed={!!signatureUrl}
            saving={saving} uploading={uploading}
            onConfirm={handleDeliverConfirm} onClose={() => setShowConfirmDeliver(false)} />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {showFailureModal && <FailureRemarksModal onConfirm={handleFailureConfirm} onClose={() => setShowFailureModal(false)} />}
      </AnimatePresence>
      <AnimatePresence>
        {showRescheduler && <ReschedulePicker onConfirm={handleRescheduleConfirm} onClose={() => setShowRescheduler(false)} />}
      </AnimatePresence>
    </div>
  )
}
