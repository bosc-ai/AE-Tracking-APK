import { useState, useRef, useEffect } from 'react'
import { Calendar, ChevronDown, Check } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { format, subDays, startOfWeek, startOfMonth, endOfMonth, endOfWeek } from 'date-fns'

type Preset = {
  label: string
  getRange: () => { start: Date; end: Date }
}

const PRESETS: Preset[] = [
  { label: 'Today', getRange: () => ({ start: new Date(), end: new Date() }) },
  { label: 'Yesterday', getRange: () => ({ start: subDays(new Date(), 1), end: subDays(new Date(), 1) }) },
  { label: 'Today and yesterday', getRange: () => ({ start: subDays(new Date(), 1), end: new Date() }) },
  { label: 'Last 7 days', getRange: () => ({ start: subDays(new Date(), 6), end: new Date() }) },
  { label: 'Last 14 days', getRange: () => ({ start: subDays(new Date(), 13), end: new Date() }) },
  { label: 'Last 30 days', getRange: () => ({ start: subDays(new Date(), 29), end: new Date() }) },
  { label: 'This week', getRange: () => ({ start: startOfWeek(new Date(), { weekStartsOn: 1 }), end: new Date() }) },
  { label: 'Last week', getRange: () => ({ 
    start: startOfWeek(subDays(new Date(), 7), { weekStartsOn: 1 }), 
    end: endOfWeek(subDays(new Date(), 7), { weekStartsOn: 1 }) 
  }) },
  { label: 'This month', getRange: () => ({ start: startOfMonth(new Date()), end: new Date() }) },
  { label: 'Last month', getRange: () => ({ 
    start: startOfMonth(subDays(startOfMonth(new Date()), 1)), 
    end: endOfMonth(subDays(startOfMonth(new Date()), 1)) 
  }) },
]

interface DateRangePickerProps {
  startDate: string
  endDate: string
  onChange: (start: string, end: string) => void
  align?: 'left' | 'right'
}

export default function DateRangePicker({ startDate, endDate, onChange, align = 'right' }: DateRangePickerProps) {
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  // Close on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handlePresetClick = (preset: Preset) => {
    const { start, end } = preset.getRange()
    onChange(start.toISOString().split('T')[0], end.toISOString().split('T')[0])
    setIsOpen(false)
  }

  const currentRangeLabel = () => {
    if (startDate === endDate) {
      if (startDate === new Date().toISOString().split('T')[0]) return 'Today'
      if (startDate === subDays(new Date(), 1).toISOString().split('T')[0]) return 'Yesterday'
      return format(new Date(startDate), 'dd MMM yyyy')
    }
    return `${format(new Date(startDate), 'dd MMM')} - ${format(new Date(endDate), 'dd MMM')}`
  }

  return (
    <div className="relative" ref={containerRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-4 py-2.5 shadow-sm hover:bg-gray-50 transition-all active:scale-[0.98]"
      >
        <Calendar className="w-4 h-4 text-primary-600" />
        <span className="text-sm font-semibold text-gray-700 whitespace-nowrap">{currentRangeLabel()}</span>
        <ChevronDown className={`w-3.5 h-3.5 text-gray-400 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            className={`absolute top-full mt-2 z-50 bg-white border border-gray-200 rounded-2xl shadow-2xl p-3 min-w-[300px] ${align === 'right' ? 'right-0' : 'left-0'}`}
          >
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 block px-1">From Date</label>
                <input 
                  type="date" 
                  value={startDate}
                  onChange={(e) => onChange(e.target.value, endDate)}
                  className="w-full text-sm font-bold text-gray-900 bg-gray-50 px-3 py-2 rounded-xl focus:outline-none border border-gray-100 focus:border-primary-500 transition-colors"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 block px-1">To Date</label>
                <input 
                  type="date" 
                  value={endDate}
                  onChange={(e) => onChange(startDate, e.target.value)}
                  className="w-full text-sm font-bold text-gray-900 bg-gray-50 px-3 py-2 rounded-xl focus:outline-none border border-gray-100 focus:border-primary-500 transition-colors"
                />
              </div>
            </div>

            <div className="border-t border-gray-100 pt-3 max-h-[320px] overflow-y-auto custom-scrollbar">
              <p className="px-1 py-1.5 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Quick Presets</p>
              <div className="space-y-1">
                {PRESETS.map((preset) => {
                  const range = preset.getRange()
                  const isActive = startDate === range.start.toISOString().split('T')[0] && endDate === range.end.toISOString().split('T')[0]
                  
                  return (
                    <button
                      key={preset.label}
                      onClick={() => handlePresetClick(preset)}
                      className={`w-full flex items-center justify-between px-3 py-2.5 text-sm rounded-xl transition-all ${
                        isActive ? 'bg-primary-500 text-white font-bold shadow-md shadow-primary-500/20' : 'text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      {preset.label}
                      {isActive && <Check className="w-4 h-4" />}
                    </button>
                  )
                })}
              </div>
            </div>
            
            <div className="border-t border-gray-100 p-1 mt-3 flex justify-end">
              <button 
                onClick={() => setIsOpen(false)}
                className="w-full bg-primary-600 hover:bg-primary-700 text-white py-2.5 rounded-xl text-sm font-bold shadow-lg shadow-primary-600/20 active:scale-95 transition-all mt-2"
              >
                Apply & Close
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
