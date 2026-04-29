-- Phase 3 Schema: Routes & Routing logic

-- Routes Table (Groups orders together for a driver)
CREATE TABLE public.routes (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    driver_id UUID REFERENCES auth.users ON DELETE SET NULL,
    status TEXT NOT NULL CHECK (status IN ('pending', 'active', 'completed', 'cancelled')),
    route_date DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Route Stops Table (Specific deliveries within a route)
CREATE TABLE public.route_stops (
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

-- RLS Settings
ALTER TABLE public.routes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.route_stops ENABLE ROW LEVEL SECURITY;

-- Admins can do everything with Routes
CREATE POLICY "Admins manage routes" ON public.routes FOR ALL USING (
  EXISTS (SELECT 1 FROM user_roles WHERE user_roles.id = auth.uid() AND user_roles.role = 'admin')
);

-- Drivers can only view their own active/pending routes
CREATE POLICY "Drivers view own routes" ON public.routes FOR SELECT USING (
  driver_id = auth.uid()
);

-- Admins can do everything with Route Stops
CREATE POLICY "Admins manage route stops" ON public.route_stops FOR ALL USING (
  EXISTS (SELECT 1 FROM user_roles WHERE user_roles.id = auth.uid() AND user_roles.role = 'admin')
);

-- Drivers can view and UPDATE their assigned stops
CREATE POLICY "Drivers view own stops" ON public.route_stops FOR SELECT USING (
  EXISTS (SELECT 1 FROM routes WHERE routes.id = route_stops.route_id AND routes.driver_id = auth.uid())
);

CREATE POLICY "Drivers update own stops" ON public.route_stops FOR UPDATE USING (
  EXISTS (SELECT 1 FROM routes WHERE routes.id = route_stops.route_id AND routes.driver_id = auth.uid())
);
