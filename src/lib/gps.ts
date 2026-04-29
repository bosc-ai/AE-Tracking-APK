import { supabase } from './supabase'

let watchId: number | null = null
let intervalId: ReturnType<typeof setInterval> | null = null

/**
 * Start pinging GPS location to Supabase every `intervalMs` milliseconds.
 * Designed for the driver app — runs while a route is active.
 */
type GPSCallback = (error: string | null) => void
let onErrorCallback: GPSCallback | null = null

export function setGPSErrorCallback(cb: GPSCallback) {
  onErrorCallback = cb
}

export function startGPSPinging(driverId: string, intervalMs = 20000) {
  if (watchId !== null) {
    console.warn('GPS pinging already active.')
    return
  }

  if (!navigator.geolocation) {
    onErrorCallback?.('Geolocation is not supported on this device.')
    return
  }

  const sendPosition = async (position: GeolocationPosition) => {
    const { latitude, longitude, accuracy, heading, speed } = position.coords

    try {
      await supabase.rpc('upsert_driver_location', {
        p_driver_id: driverId,
        p_lat: latitude,
        p_lng: longitude,
        p_accuracy: accuracy,
        p_heading: heading,
        p_speed: speed,
      })
    } catch (error) {
      console.error('Failed to send GPS ping:', error)
    }
  }

  const handleError = (err: GeolocationPositionError) => {
    if (err.code === err.PERMISSION_DENIED) {
      onErrorCallback?.('Location permission denied. Please enable it in your browser settings.')
      stopGPSPinging()
    } else {
      console.error('GPS error:', err.message)
    }
  }

  // Initial high-accuracy watch
  watchId = navigator.geolocation.watchPosition(
    (pos) => {
      // Store latest position for interval-based sends
      ;(window as any).__lastDriverPos = pos
    },
    handleError,
    { enableHighAccuracy: true, maximumAge: 10000 }
  )

  // Send at regular intervals
  intervalId = setInterval(() => {
    const pos = (window as any).__lastDriverPos as GeolocationPosition | undefined
    if (pos) sendPosition(pos)
  }, intervalMs)

  console.log('🛰️ GPS pinging started')
}

/**
 * Stop GPS pinging and clean up resources.
 */
export function stopGPSPinging() {
  if (watchId !== null) {
    navigator.geolocation.clearWatch(watchId)
    watchId = null
  }
  if (intervalId !== null) {
    clearInterval(intervalId)
    intervalId = null
  }
  delete (window as any).__lastDriverPos
  console.log('🛰️ GPS pinging stopped')
}
