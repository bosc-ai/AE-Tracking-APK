// Supabase client available via: import { supabase } from './supabase'

/**
 * Generate a unique tracking token for an order.
 * In production this would be called server-side when order status changes to "out_for_delivery".
 */
export function generateTrackingToken(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  let token = ''
  for (let i = 0; i < 16; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return token
}

/**
 * Build the full tracking URL for a given token.
 */
export function getTrackingUrl(token: string): string {
  return `${window.location.origin}/track/${token}`
}

/**
 * Fetch the order and associated route info using a tracking token.
 * This is designed to work without authentication (public access).
 */
export async function resolveTrackingToken(token: string) {
  // In a real setup, this would hit a Supabase Edge Function or use anon-accessible RPC
  // For now, we return mock data so the UI works
  return {
    order: {
      id: 'ORD-001',
      status: 'out_for_delivery',
      tracking_token: token,
      total_amount: 4999,
      created_at: new Date().toISOString(),
    },
    driver: {
      name: 'Ravi Kumar',
      phone: '+91 90000 00003',
      avatar: null,
    },
    route: {
      totalStops: 12,
      currentStop: 7,
      stopsBeforeCustomer: 2,
    },
    eta: '15 mins',
    lastLocation: {
      lat: 19.0760 + (Math.random() * 0.01),
      lng: 72.8777 + (Math.random() * 0.01),
    },
    customerLocation: {
      lat: 19.0820,
      lng: 72.8810,
    },
  }
}
