-- Run this in Supabase SQL Editor
-- Adds stop_status to get_all_orders so admin can see rescheduled/delivered/failed per stop

DROP FUNCTION IF EXISTS public.get_all_orders();

CREATE OR REPLACE FUNCTION public.get_all_orders()
RETURNS TABLE (
  id                uuid,
  customer_name     text,
  customer_phone    text,
  total_amount      numeric,
  status            text,
  stop_status       text,
  payment_method    text,
  notes             text,
  delivery_remarks  text,
  created_at        timestamptz,
  address_id        uuid,
  street            text,
  city              text,
  zip_code          text,
  landmark          text,
  lat               double precision,
  lng               double precision,
  driver_name       text,
  driver_phone      text
)
LANGUAGE sql SECURITY DEFINER
AS $$
  SELECT * FROM (
    SELECT DISTINCT ON (o.id)
      o.id,
      o.customer_name,
      o.customer_phone,
      o.total_amount,
      o.status,
      rs.status            AS stop_status,
      o.payment_method,
      o.notes,
      rs.delivery_remarks,
      o.created_at,
      a.id                 AS address_id,
      a.street,
      a.city,
      a.zip_code,
      a.landmark,
      a.lat,
      a.lng,
      p.full_name          AS driver_name,
      p.phone_number       AS driver_phone
    FROM orders o
    LEFT JOIN addresses a    ON a.id = o.address_id
    LEFT JOIN route_stops rs ON rs.order_id = o.id
    LEFT JOIN routes r       ON r.id = rs.route_id
    LEFT JOIN profiles p     ON p.id = r.driver_id
    ORDER BY o.id, rs.updated_at DESC NULLS LAST
  ) sub
  ORDER BY created_at DESC;
$$;
