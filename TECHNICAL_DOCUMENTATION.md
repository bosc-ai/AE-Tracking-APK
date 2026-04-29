# Technical Documentation: D2C Delivery Platform

This document provides a full technical overview of the D2C Logistics platform built with Vite, React, Supabase, and Capacitor.

---

## 1. Architecture Overview
- **Frontend**: React 19 + TypeScript + Tailwind CSS v4.
- **Backend / BaaS**: Supabase (PostgreSQL, Auth, Edge Functions, Realtime).
- **Mobile**: Capacitor (wrapping the Driver dashboard into an Android APK).
- **External APIs**: 
    - Google Maps: For routing optimization and tracking maps.
    - Twilio: For WhatsApp/SMS notifications via Supabase Edge Functions.
    - Razorpay: Hooked for UPI/Card payments (placeholder logic).

---

## 2. Authentication & RBAC (Role-Based Access Control)
The system uses a custom RBAC layer on top of Supabase Auth.

- **Storage**: User roles are stored in the `public.user_roles` table, linked to `auth.users` via UUID.
- **Roles**: `admin`, `driver`, `customer`.
- **Flow**:
    1. User signs up/in.
    2. `AuthContext.tsx` fetches the role from `user_roles`.
    3. `App.tsx` uses a `ProtectedRoute` component to redirect users based on their role:
        - Admin -> `/admin/*`
        - Driver -> `/driver/*`
        - Customer -> `/customer/*`
- **Fallback**: If the database query is blocked by RLS, the context checks `user_metadata` for the role.

---

## 3. Database Schema (Public Schema)
Executed via `supabase_complete.sql`.

### Core Tables:
- `profiles`: User profile data (name, phone).
- `user_roles`: Maps UUID to 'admin'|'driver'|'customer'.
- `products`: Catalog items (price, stock, image_url).
- `orders`: Core transaction record (status, total, payment_method, tracking_token).
- `order_items`: Line items for each order.
- `addresses`: Delivery locations linked to users.
- `routes`: A group of orders assigned to a driver for a specific day.
- `route_stops`: Individual sequence of deliveries within a route.
- `driver_locations`: Real-time GPS pings (lat/lng) for live tracking.
- `delivery_proofs`: Links to photo/signature assets.

---

## 4. Key Modules & Logic

### Admin: Bulk Product Upload
- **File**: `src/pages/admin/ProductsView.tsx`
- **Logic**: Uses the `xlsx` library to parse `.csv` and `.xlsx` files.
- **Workflow**:
    1. Downloads a structured template.
    2. Maps headers (name, price, stock, etc.).
    3. Performs batch inserts (50 rows/call) to Supabase to prevent timeouts.

### Admin: Route Optimization
- **File**: `src/lib/routing.ts`
- **Logic**: Currently uses a greedy distance-based algorithm (placeholder) to sequence orders based on coordinates. Designed to be swapped with Google Routes API.

### Driver: GPS Tracking
- **File**: `src/lib/gps.ts`
- **Logic**: Uses the Geolocation API to `watchPosition`. Pings the `driver_locations` table every 15-30 seconds when a route is active.

### Notifications: Twilio Edge Function
- **File**: `supabase/functions/notify-customer/index.ts`
- **Flow**: Triggered via HTTP or Database Webhook. Connects to Twilio to send WhatsApp/SMS when an order status changes (Confirmed -> Shipped -> Delivered).

---

## 5. Development & Build Commands

### Environment Variables (.env)
```env
VITE_SUPABASE_URL=YOUR_PROJECT_URL
VITE_SUPABASE_ANON_KEY=YOUR_ANON_KEY
```

### Installation
```bash
npm install
```

### Running Locally
```bash
npm run dev
```

### Building for Production
```bash
npm run build
```

### Mobile APK Generation (Capacitor)
```bash
npx cap add android
npx cap sync android
npx cap open android # Opens Android Studio to build APK
```

---

## 6. Known Integrations Points (Ready for Production)
1. **Google Maps**: Replace markers in `LiveTracker.tsx` with a Google Maps JS instance using the `VITE_GOOGLE_MAPS_KEY`.
2. **Razorpay**: Replace standard navigation in `Checkout.tsx` with the Razorpay Checkout script.
3. **SMS/WhatsApp**: Deploy the Supabase Edge function and set Twilio Secrets inside the Supabase CLI/Dashboard.
