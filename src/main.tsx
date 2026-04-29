import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { Keyboard } from '@capacitor/keyboard'
import { Capacitor } from '@capacitor/core'

// Prevent keyboard from resizing the WebView on Android
if (Capacitor.isNativePlatform()) {
  Keyboard.addListener('keyboardWillShow', () => {
    document.documentElement.classList.add('keyboard-open')
  })
  Keyboard.addListener('keyboardWillHide', () => {
    document.documentElement.classList.remove('keyboard-open')
  })
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
