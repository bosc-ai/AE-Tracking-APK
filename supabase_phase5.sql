-- Phase 5 Schema: Tracking Tokens + Notifications Log

-- Add tracking token to orders
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS tracking_token TEXT UNIQUE;

-- Create index for fast token lookups
CREATE INDEX IF NOT EXISTS idx_orders_tracking_token ON public.orders (tracking_token);

-- Notifications Log Table
CREATE TABLE public.notifications_log (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    order_id UUID REFERENCES public.orders ON DELETE CASCADE NOT NULL,
    channel TEXT NOT NULL CHECK (channel IN ('whatsapp', 'sms', 'email')),
    event TEXT NOT NULL CHECK (event IN ('confirmed', 'out_for_delivery', 'delivered', 'failed')),
    recipient TEXT NOT NULL,
    message_sid TEXT, -- Twilio message SID
    status TEXT NOT NULL CHECK (status IN ('queued', 'sent', 'delivered', 'failed')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- RLS
ALTER TABLE public.notifications_log ENABLE ROW LEVEL SECURITY;

-- Only admins can view notification logs
CREATE POLICY "Admins manage notifications" ON public.notifications_log FOR ALL USING (
  EXISTS (SELECT 1 FROM user_roles WHERE user_roles.id = auth.uid() AND user_roles.role = 'admin')
);

-- Allow public (anonymous) read of tracking data through orders
-- The tracking page will use the token directly, queried via a Supabase function or direct RLS
CREATE POLICY "Public read order by tracking token" ON public.orders FOR SELECT USING (
  tracking_token IS NOT NULL AND tracking_token = current_setting('request.headers', true)::json->>'x-tracking-token'
);