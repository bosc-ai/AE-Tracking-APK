export interface Location {
  lat: number
  lng: number
}

export interface Order {
  id: string
  address: string
  location?: Location
}

export const RR_NAGAR_HUB: Location = { lat: 12.9352, lng: 77.5152 }

export function haversineKm(a: Location, b: Location): number {
  const R = 6371
  const dLat = (b.lat - a.lat) * Math.PI / 180
  const dLng = (b.lng - a.lng) * Math.PI / 180
  const sinDLat = Math.sin(dLat / 2)
  const sinDLng = Math.sin(dLng / 2)
  const c = sinDLat * sinDLat + Math.cos(a.lat * Math.PI / 180) * Math.cos(b.lat * Math.PI / 180) * sinDLng * sinDLng
  return R * 2 * Math.atan2(Math.sqrt(c), Math.sqrt(1 - c))
}

export async function geocodeAddress(address: string): Promise<Location | null> {
  try {
    const q = encodeURIComponent(`${address}, Bangalore, Karnataka, India`)
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${q}&format=json&limit=1`,
      { headers: { 'User-Agent': 'D2C-Delivery-Platform/1.0' } }
    )
    const data = await res.json()
    if (data[0]) return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) }
  } catch {}
  return null
}

export async function optimizeRouteSequence(orders: Order[], hubLocation: Location = RR_NAGAR_HUB): Promise<Order[]> {
  const withCoords: Order[] = []
  for (const [i, order] of orders.entries()) {
    if (i > 0 && !order.location) await new Promise(r => setTimeout(r, 1100)) // Nominatim: 1 req/sec
    const location = order.location ?? (await geocodeAddress(order.address)) ?? undefined
    withCoords.push({ ...order, location })
  }
  return withCoords.sort((a, b) => {
    const da = a.location ? haversineKm(hubLocation, a.location) : 999
    const db = b.location ? haversineKm(hubLocation, b.location) : 999
    return da - db
  })
}
