import { useEffect, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Capacitor } from '@capacitor/core'
import { App } from '@capacitor/app'
import { motion, AnimatePresence } from 'framer-motion'

// Paths where pressing back should ask to exit the app
function isRootPath(pathname: string) {
  return (
    pathname === '/login' ||
    pathname === '/driver' ||
    pathname === '/driver/summary' ||
    pathname === '/driver/profile' ||
    pathname.startsWith('/admin') ||
    pathname.startsWith('/customer')
  )
}

export default function AndroidBackHandler() {
  const navigate  = useNavigate()
  const location  = useLocation()
  const [showExit, setShowExit] = useState(false)

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return

    let handle: { remove: () => void } | null = null

    App.addListener('backButton', () => {
      if (isRootPath(location.pathname)) {
        setShowExit(true)
      } else {
        navigate(-1)
      }
    }).then(h => { handle = h })

    return () => { handle?.remove() }
  }, [location.pathname, navigate])

  return (
    <AnimatePresence>
      {showExit && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-black/60">
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="bg-white rounded-3xl w-full max-w-xs p-6 shadow-2xl text-center"
          >
            <div className="w-14 h-14 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl">👋</span>
            </div>
            <h3 className="text-xl font-black text-gray-900 mb-2">Exit App?</h3>
            <p className="text-gray-500 text-sm mb-6 leading-relaxed">
              Are you sure you want to close the app?
            </p>
            <div className="flex flex-col gap-3">
              <button
                onClick={() => App.exitApp()}
                className="w-full bg-red-600 text-white py-3.5 rounded-2xl font-bold active:scale-[0.97] transition-transform"
              >
                Yes, Exit
              </button>
              <button
                onClick={() => setShowExit(false)}
                className="w-full bg-gray-100 text-gray-700 py-3.5 rounded-2xl font-bold active:scale-[0.97] transition-transform"
              >
                Cancel
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
