import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'com.d2c.delivery.driver',
  appName: 'AE Delivery',
  webDir: 'dist',
  server: {
    // For development, point to your local dev server
    // url: 'http://YOUR_LOCAL_IP:5173',
    // cleartext: true,
    androidScheme: 'https',
  },
  plugins: {
    Camera: {},
    Geolocation: {},
    Keyboard: {
      resize: 'none',
      style: 'dark',
      resizeOnFullScreen: false,
    },
  },
  android: {
    allowMixedContent: true,
    backgroundColor: '#0f172a', // slate-900 to match driver UI
  },
}

export default config
