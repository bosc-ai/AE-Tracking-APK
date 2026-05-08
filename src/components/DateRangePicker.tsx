import { useState, useRef, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { Calendar, ChevronDown, Check } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { format, subDays, startOfWeek, startOfMonth, endOfMonth, endOfWeek } from 'date-fns'

type Preset = {
  label: string
  getRange: () => { start: Date; end: Date }
}

const PRESETS: Preset[] = [
  { label: 'Today',              getRange: () => ({ start: new Date(), end: new Date() }) },
  { label: 'Yesterday',          getRange: () => ({ start: subDays(new Date(), 1), end: subDays(new Date(), 1) }) },
  { label: 'Today and yesterday',getRange: () => ({ start: subDays(new Date(), 1), end: new Date() }) },
  { label: 'Last 7 days',        getRange: () => ({ start: subDays(new Date(), 6), end: new Date() }) },
  { label: 'Last 14 days',       getRange: () => ({ start: subDays(new Date(), 13), end: new Date() }) },
  { label: 'Last 30 days',       getRange: () => ({ start: subDays(new Date(), 29), end: new Date() }) },
  { label: 'This week',          getRange: () => ({ start: startOfWeek(new Date(), { weekStartsOn: 1 }), end: new Date() }) },
  { label: 'Last week',          getRange: () => ({
    start: startOfWeek(subDays(new Date(), 7), { weekStartsOn: 1 }),
    end:   endOfWeek(subDays(new Date(), 7),   { weekStartsOn: 1 }),
  }) },
  { label: 'This month',         getRange: () => ({ start: startOfMonth(new Date()), end: new Date() }) },
  { label: 'Last month',         getRange: () => ({
    start: startOfMonth(subDays(startOfMonth(new Date()), 1)),
    end:   endOfMonth(subDays(startOfMonth(new Date()), 1)),
  }) },
]

interface DateRangePickerProps {
  startDate: string
  endDate: string
  onChange: (start: string, end: string) => void
  align?: 'left' | 'right'
}

type DropdownPos = { top: number; left: number; width: number }

export default function DateRangePicker({
  startDate, endDate, onChange, align = 'right',
}: DateRangePickerProps) {
  const [isOpen, setIsOpen]     = useState(false)
  const [pos, setPos]           = useState<DropdownPos>({ top: 0, left: 0, width: 300 })
  const triggerRef              = useRef<HTMLButtonElement>(null)
  const dropdownRef             = useRef<HTMLDivElement>(null)

  // Calculate dropdown position from the trigger button's bounding rect
  const updatePos = useCallback(() => {
    if (!triggerRef.current) return
    const rect = triggerRef.current.getBoundingClientRect()
    const dropW = 316 // min-width of the dropdown
    let left = align === 'right' ? rect.right - dropW : rect.left
    // Clamp to viewport
    if (left < 8) left = 8
    if (left + dropW > window.innerWidth - 8) left = window.innerWidth - dropW - 8
    setPos({ top: rect.bottom + 8, left, width: rect.width })
  }, [align])

  // Open / close
  const toggle = () => {
    if (!isOpen) updatePos()
    setIsOpen(v => !v)
  }

  // Keep position in sync while open
  useEffect(() => {
    if (!isOpen) return
    const update = () => updatePos()
    window.addEventListener('scroll', update, true)
    window.addEventListener('resize', update)
    return () => {
      window.removeEventListener('scroll', update, true)
      window.removeEventListener('resize', update)
    }
  }, [isOpen, updatePos])

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return
    const onMouseDown = (e: MouseEvent) => {
      const target = e.target as Node
      if (
        triggerRef.current?.contains(target) ||
        dropdownRef.current?.contains(target)
      ) return
      setIsOpen(false)
    }
    document.addEventListener('mousedown', onMouseDown)
    return () => document.removeEventListener('mousedown', onMouseDown)
  }, [isOpen])

  const handlePresetClick = (preset: Preset) => {
    const { start, end } = preset.getRange()
    onChange(start.toISOString().split('T')[0], end.toISOString().split('T')[0])
    setIsOpen(false)
  }

  const currentRangeLabel = () => {
    if (startDate === endDate) {
      if (startDate === new Date().toISOString().split('T')[0]) return 'Today'
      if (startDate === subDays(new Date(), 1).toISOString().split('T')[0]) return 'Yesterday'
      return format(new Date(startDate + 'T00:00:00'), 'dd MMM yyyy')
    }
    return `${format(new Date(startDate + 'T00:00:00'), 'dd MMM')} – ${format(new Date(endDate + 'T00:00:00'), 'dd MMM')}`
  }

  const dropdown = (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          ref={dropdownRef}
          initial={{ opacity: 0, y: 8, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 8, scale: 0.97 }}
          transition={{ duration: 0.15 }}
          style={{
            position: 'fixed',
            top: pos.top,
            left: pos.left,
            zIndex: 9999,
            minWidth: 316,
          }}
          className="bg-white border border-gray-200 rounded-2xl shadow-2xl p-3"
        >
          {/* Date inputs */}
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div>
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 block px-1">
                From Date
              </label>
              <input
                type="date"
                value={startDate}
                onChange={e => onChange(e.target.value, endDate)}
                className="w-full text-sm font-bold text-gray-900 bg-gray-50 px-3 py-2 rounded-xl focus:outline-none border border-gray-100 focus:border-primary-500 transition-colors"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 block px-1">
                To Date
              </label>
              <input
                type="date"
                value={endDate}
                onChange={e => onChange(startDate, e.target.value)}
                className="w-full text-sm font-bold text-gray-900 bg-gray-50 px-3 py-2 rounded-xl focus:outline-none border border-gray-100 focus:border-primary-500 transition-colors"
              />
            </div>
          </div>

          {/* Quick presets */}
          <div className="border-t border-gray-100 pt-3 max-h-[280px] overflow-y-auto">
            <p className="px-1 py-1.5 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
              Quick Presets
            </p>
            <div className="space-y-0.5">
              {PRESETS.map(preset => {
                const range    = preset.getRange()
                const isActive =
                  startDate === range.start.toISOString().split('T')[0] &&
                  endDate   === range.end.toISOString().split('T')[0]
                return (
                  <button
                    key={preset.label}
                    onClick={() => handlePresetClick(preset)}
                    className={`w-full flex items-center justify-between px-3 py-2.5 text-sm rounded-xl transition-all ${
                      isActive
                        ? 'bg-primary-500 text-white font-bold shadow-md shadow-primary-500/20'
                        : 'text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    {preset.label}
                    {isActive && <Check className="w-4 h-4" />}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Apply & Close */}
          <div className="border-t border-gray-100 mt-3 pt-1">
            <button
              onClick={() => setIsOpen(false)}
              className="w-full bg-primary-600 hover:bg-primary-700 text-white py-2.5 rounded-xl text-sm font-bold shadow-lg shadow-primary-600/20 active:scale-95 transition-all mt-2"
            >
              Apply &amp; Close
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )

  return (
    <>
      <button
        ref={triggerRef}
        onClick={toggle}
        className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-4 py-2.5 shadow-sm hover:bg-gray-50 transition-all active:scale-[0.98]"
      >
        <Calendar className="w-4 h-4 text-primary-600" />
        <span className="text-sm font-semibold text-gray-700 whitespace-nowrap">
          {currentRangeLabel()}
        </span>
        <ChevronDown className={`w-3.5 h-3.5 text-gray-400 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {createPortal(dropdown, document.body)}
    </>
  )
}
