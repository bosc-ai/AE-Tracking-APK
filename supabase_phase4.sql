-- Phase 4 Schema: Driver Locations, Delivery Proofs, Payments

-- Driver Locations (GPS pings for live tracking)
CREATE TABLE public.driver_locations (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    driver_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
    lat DOUBLE PRECISION NOT NULL,
    lng DOUBLE PRECISION NOT NULL,
    accuracy DOUBLE PRECISION,
    heading DOUBLE PRECISION,
    speed DOUBLE PRECISION,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Index for fast lookups by driver and time
CREATE INDEX idx_driver_locations_driver_time ON public.driver_locations (driver_id, created_at DESC);

-- Delivery Proofs (photo + signature per stop)
CREATE TABLE public.delivery_proofs (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    route_stop_id UUID REFERENCES public.route_stops ON DELETE CASCADE NOT NULL,
    photo_url TEXT,
    signature_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Payments (COD cash logs + Razorpay online)
CREATE TABLE public.payments (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    order_id UUID REFERENCES public.orders ON DELETE CASCADE NOT NULL,
    amount NUMERIC(10, 2) NOT NULL,
    method TEXT NOT NULL CHECK (method IN ('cash', 'upi', 'card', 'netbanking')),
    status TEXT NOT NULL CHECK (status IN ('pending', 'collected', 'verified', 'failed')),
    razorpay_payment_id TEXT,
    collected_by UUID REFERENCES auth.users ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- RLS
ALTER TABLE public.driver_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.delivery_proofs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- Driver locations: drivers insert their own, admins read all
CREATE POLICY "Drivers insert own location" ON public.driver_locations FOR INSERT WITH CHECK (auth.uid() = driver_id);
CREATE POLICY "Drivers read own location" ON public.driver_locations FOR SELECT USING (auth.uid() = driver_id);
CREATE POLICY "Admins read all locations" ON public.driver_locations FOR SELECT USING (
  EXISTS (SELECT 1 FROM user_roles WHERE user_roles.id = auth.uid() AND user_roles.role = 'admin')
);

-- Delivery proofs: drivers create for their stops, admins read all
CREATE POLICY "Drivers create proofs for own stops" ON public.delivery_proofs FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM route_stops rs
    JOIN routes r ON r.id = rs.route_id
    WHERE rs.id = delivery_proofs.route_stop_id AND r.driver_id = auth.uid()
  )
);
CREATE POLICY "Admins read all proofs" ON public.delivery_proofs FOR SELECT USING (
  EXISTS (SELECT 1 FROM user_roles WHERE user_roles.id = auth.uid() AND user_roles.role = 'admin')
);

-- Payments: drivers create, admins manage all
CREATE POLICY "Drivers create payments" ON public.payments FOR INSERT WITH CHECK (auth.uid() = collected_by);
CREATE POLICY "Admins manage payments" ON public.payments FOR ALL USING (
  EXISTS (SELECT 1 FROM user_roles WHERE user_roles.id = auth.uid() AND user_roles.role = 'admin')
);
