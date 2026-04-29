-- ============================================
-- D2C Delivery Platform — COMPLETE SAFE SETUP
-- Run this ONCE in Supabase SQL Editor
-- Safe to re-run: uses IF NOT EXISTS everywhere
-- ============================================

-- =====================
-- PHASE 1: Auth & Profiles
-- =====================

CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
    full_name TEXT,
    phone_number TEXT,
    avatar_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.user_roles (
    id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
    role TEXT NOT NULL CHECK (role IN ('customer', 'driver', 'admin')) DEFAULT 'customer',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist, then recreate
DO $$ BEGIN
  DROP POLICY IF EXISTS "Users read own profile" ON public.profiles;
  DROP POLICY IF EXISTS "Users update own profile" ON public.profiles;
  DROP POLICY IF EXISTS "Users read own role" ON public.user_roles;
  DROP POLICY IF EXISTS "Admins read all roles" ON public.user_roles;
END $$;

CREATE POLICY "Users read own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users read own role" ON public.user_roles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Admins read all roles" ON public.user_roles FOR ALL USING (
  EXISTS (SELECT 1 FROM user_roles WHERE user_roles.id = auth.uid() AND user_roles.role = 'admin')
);

-- Auto-create profile + role on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name')
  ON CONFLICT (id) DO NOTHING;
  
  INSERT INTO public.user_roles (id, role)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'role', 'customer'))
  ON CONFLICT (id) DO NOTHING;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =====================
-- PHASE 2: Products & Orders
-- =====================

CREATE TABLE IF NOT EXISTS public.products (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    price NUMERIC(10, 2) NOT NULL,
    image_url TEXT,
    stock_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.addresses (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
    street TEXT NOT NULL,
    city TEXT NOT NULL,
    state TEXT NOT NULL DEFAULT 'India',
    zip_code TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.orders (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
    address_id UUID REFERENCES public.addresses ON DELETE SET NULL,
    total_amount NUMERIC(10, 2) NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('pending', 'confirmed', 'shipped', 'delivered', 'cancelled', 'failed')) DEFAULT 'pending',
    payment_method TEXT CHECK (payment_method IN ('COD', 'ONLINE')) DEFAULT 'COD',
    tracking_token TEXT UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.order_items (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    order_id UUID REFERENCES public.orders ON DELETE CASCADE NOT NULL,
    product_id UUID REFERENCES public.products ON DELETE SET NULL,
    quantity INTEGER NOT NULL DEFAULT 1,
    price_at_time NUMERIC(10, 2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  DROP POLICY IF EXISTS "Anyone can read products" ON public.products;
  DROP POLICY IF EXISTS "Admins manage products" ON public.products;
  DROP POLICY IF EXISTS "Users manage own addresses" ON public.addresses;
  DROP POLICY IF EXISTS "Users read own orders" ON public.orders;
  DROP POLICY IF EXISTS "Users create own orders" ON public.orders;
  DROP POLICY IF EXISTS "Admins read all orders" ON public.orders;
  DROP POLICY IF EXISTS "Admins update orders" ON public.orders;
  DROP POLICY IF EXISTS "Users read own order items" ON public.order_items;
  DROP POLICY IF EXISTS "Users create order items" ON public.order_items;
  DROP POLICY IF EXISTS "Admins read all order items" ON public.order_items;
END $$;

CREATE POLICY "Anyone can read products" ON public.products FOR SELECT USING (true);
CREATE POLICY "Admins manage products" ON public.products FOR ALL USING (
  EXISTS (SELECT 1 FROM user_roles WHERE user_roles.id = auth.uid() AND user_roles.role = 'admin')
);
CREATE POLICY "Users manage own addresses" ON public.addresses FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users read own orders" ON public.orders FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users create own orders" ON public.orders FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins read all orders" ON public.orders FOR SELECT USING (
  EXISTS (SELECT 1 FROM user_roles WHERE user_roles.id = auth.uid() AND user_roles.role = 'admin')
);
CREATE POLICY "Admins update orders" ON public.orders FOR UPDATE USING (
  EXISTS (SELECT 1 FROM user_roles WHERE user_roles.id = auth.uid() AND user_roles.role = 'admin')
);
CREATE POLICY "Users read own order items" ON public.order_items FOR SELECT USING (
  EXISTS (SELECT 1 FROM orders WHERE orders.id = order_items.order_id AND orders.user_id = auth.uid())
);
CREATE POLICY "Users create order items" ON public.order_items FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM orders WHERE orders.id = order_items.order_id AND orders.user_id = auth.uid())
);
CREATE POLICY "Admins read all order items" ON public.order_items FOR SELECT USING (
  EXISTS (SELECT 1 FROM user_roles WHERE user_roles.id = auth.uid() AND user_roles.role = 'admin')
);

-- =====================
-- PHASE 3: Routes
-- =====================

CREATE TABLE IF NOT EXISTS public.routes (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    driver_id UUID REFERENCES auth.users ON DELETE SET NULL,
    status TEXT NOT NULL CHECK (status IN ('pending', 'active', 'completed', 'cancelled')),
    route_date DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.route_stops (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    route_id UUID REFERENCES public.routes ON DELETE CASCADE NOT NULL,
    order_id UUID REFERENCES public.orders ON DELETE CASCADE NOT NULL,
    stop_sequence INTEGER NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('pending', 'delivered', 'failed', 'rescheduled')),
    delivery_proof_url TEXT,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(route_id, stop_sequence)
);

ALTER TABLE public.routes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.route_stops ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  DROP POLICY IF EXISTS "Admins manage routes" ON public.routes;
  DROP POLICY IF EXISTS "Drivers view own routes" ON public.routes;
  DROP POLICY IF EXISTS "Admins manage route stops" ON public.route_stops;
  DROP POLICY IF EXISTS "Drivers view own stops" ON public.route_stops;
  DROP POLICY IF EXISTS "Drivers update own stops" ON public.route_stops;
END $$;

CREATE POLICY "Admins manage routes" ON public.routes FOR ALL USING (
  EXISTS (SELECT 1 FROM user_roles WHERE user_roles.id = auth.uid() AND user_roles.role = 'admin')
);
CREATE POLICY "Drivers view own routes" ON public.routes FOR SELECT USING (driver_id = auth.uid());
CREATE POLICY "Admins manage route stops" ON public.route_stops FOR ALL USING (
  EXISTS (SELECT 1 FROM user_roles WHERE user_roles.id = auth.uid() AND user_roles.role = 'admin')
);
CREATE POLICY "Drivers view own stops" ON public.route_stops FOR SELECT USING (
  EXISTS (SELECT 1 FROM routes WHERE routes.id = route_stops.route_id AND routes.driver_id = auth.uid())
);
CREATE POLICY "Drivers update own stops" ON public.route_stops FOR UPDATE USING (
  EXISTS (SELECT 1 FROM routes WHERE routes.id = route_stops.route_id AND routes.driver_id = auth.uid())
);

-- =====================
-- PHASE 4: GPS, Proofs, Payments
-- =====================

CREATE TABLE IF NOT EXISTS public.driver_locations (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    driver_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
    lat DOUBLE PRECISION NOT NULL,
    lng DOUBLE PRECISION NOT NULL,
    accuracy DOUBLE PRECISION,
    heading DOUBLE PRECISION,
    speed DOUBLE PRECISION,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_driver_locations_driver_time ON public.driver_locations (driver_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.delivery_proofs (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    route_stop_id UUID REFERENCES public.route_stops ON DELETE CASCADE NOT NULL,
    photo_url TEXT,
    signature_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.payments (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    order_id UUID REFERENCES public.orders ON DELETE CASCADE NOT NULL,
    amount NUMERIC(10, 2) NOT NULL,
    method TEXT NOT NULL CHECK (method IN ('cash', 'upi', 'card', 'netbanking')),
    status TEXT NOT NULL CHECK (status IN ('pending', 'collected', 'verified', 'failed')),
    razorpay_payment_id TEXT,
    collected_by UUID REFERENCES auth.users ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.driver_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.delivery_proofs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  DROP POLICY IF EXISTS "Drivers insert own location" ON public.driver_locations;
  DROP POLICY IF EXISTS "Drivers read own location" ON public.driver_locations;
  DROP POLICY IF EXISTS "Admins read all locations" ON public.driver_locations;
  DROP POLICY IF EXISTS "Drivers create proofs for own stops" ON public.delivery_proofs;
  DROP POLICY IF EXISTS "Admins read all proofs" ON public.delivery_proofs;
  DROP POLICY IF EXISTS "Drivers create payments" ON public.payments;
  DROP POLICY IF EXISTS "Admins manage payments" ON public.payments;
END $$;

CREATE POLICY "Drivers insert own location" ON public.driver_locations FOR INSERT WITH CHECK (auth.uid() = driver_id);
CREATE POLICY "Drivers read own location" ON public.driver_locations FOR SELECT USING (auth.uid() = driver_id);
CREATE POLICY "Admins read all locations" ON public.driver_locations FOR SELECT USING (
  EXISTS (SELECT 1 FROM user_roles WHERE user_roles.id = auth.uid() AND user_roles.role = 'admin')
);
CREATE POLICY "Drivers create proofs for own stops" ON public.delivery_proofs FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM route_stops rs JOIN routes r ON r.id = rs.route_id
    WHERE rs.id = delivery_proofs.route_stop_id AND r.driver_id = auth.uid()
  )
);
CREATE POLICY "Admins read all proofs" ON public.delivery_proofs FOR SELECT USING (
  EXISTS (SELECT 1 FROM user_roles WHERE user_roles.id = auth.uid() AND user_roles.role = 'admin')
);
CREATE POLICY "Drivers create payments" ON public.payments FOR INSERT WITH CHECK (auth.uid() = collected_by);
CREATE POLICY "Admins manage payments" ON public.payments FOR ALL USING (
  EXISTS (SELECT 1 FROM user_roles WHERE user_roles.id = auth.uid() AND user_roles.role = 'admin')
);

-- =====================
-- PHASE 5: Tracking & Notifications
-- =====================

CREATE INDEX IF NOT EXISTS idx_orders_tracking_token ON public.orders (tracking_token);

CREATE TABLE IF NOT EXISTS public.notifications_log (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    order_id UUID REFERENCES public.orders ON DELETE CASCADE NOT NULL,
    channel TEXT NOT NULL CHECK (channel IN ('whatsapp', 'sms', 'email')),
    event TEXT NOT NULL CHECK (event IN ('confirmed', 'out_for_delivery', 'delivered', 'failed')),
    recipient TEXT NOT NULL,
    message_sid TEXT,
    status TEXT NOT NULL CHECK (status IN ('queued', 'sent', 'delivered', 'failed')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.notifications_log ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  DROP POLICY IF EXISTS "Admins manage notifications" ON public.notifications_log;
END $$;

CREATE POLICY "Admins manage notifications" ON public.notifications_log FOR ALL USING (
  EXISTS (SELECT 1 FROM user_roles WHERE user_roles.id = auth.uid() AND user_roles.role = 'admin')
);

-- =====================
-- SEED: Sample Products
-- =====================

INSERT INTO public.products (name, description, price, image_url, stock_count) VALUES
('Premium Wireless Headphones', 'Noise-cancelling over-ear headphones with 40hr battery', 12999, 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?q=80&w=400&auto=format&fit=crop', 50),
('Smart Fitness Watch', 'Track health, workouts, and notifications on your wrist', 4999, 'https://images.unsplash.com/photo-1579586337278-3befd40fd17a?q=80&w=400&auto=format&fit=crop', 100),
('Ergonomic Mechanical Keyboard', 'Tactile switches with RGB backlight for productivity', 8500, 'https://images.unsplash.com/photo-1595225476474-87563907a212?q=80&w=400&auto=format&fit=crop', 30),
('Portable Bluetooth Speaker', 'Waterproof speaker with 360-degree surround sound', 3499, 'https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?q=80&w=400&auto=format&fit=crop', 75),
('USB-C Fast Charger', '65W GaN charger for laptops and phones', 1999, 'https://images.unsplash.com/photo-1583863788434-e58a36330cf0?q=80&w=400&auto=format&fit=crop', 200),
('Wireless Mouse', 'Ergonomic design with silent click technology', 1499, 'https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?q=80&w=400&auto=format&fit=crop', 150)
ON CONFLICT DO NOTHING;

-- ============================================
-- DONE! All tables, policies, and seed data created.
-- ============================================
