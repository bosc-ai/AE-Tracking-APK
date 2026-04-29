import { useEffect, useState } from 'react'
import { Capacitor } from '@capacitor/core'
import { Keyboard } from '@capacitor/keyboard'

export function useKeyboardHeight() {
  const [keyboardHeight, setKeyboardHeight] = useState(0)

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return

    let mounted = true
    const listeners: Array<{ remove: () => Promise<void> }> = []

    Keyboard.addListener('keyboardDidShow', info => {
      if (mounted) setKeyboardHeight(info.keyboardHeight)
    }).then(l => listeners.push(l))

    Keyboard.addListener('keyboardDidHide', () => {
      if (mounted) setKeyboardHeight(0)
    }).then(l => listeners.push(l))

    return () => {
      mounted = false
      listeners.forEach(l => l.remove())
    }
  }, [])

  return keyboardHeight
}
