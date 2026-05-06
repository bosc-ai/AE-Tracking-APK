-- Update get_all_orders to support date range filtering
DROP FUNCTION IF EXISTS public.get_all_orders(date, date);
DROP FUNCTION IF EXISTS public.get_all_orders(date);
DROP FUNCTION IF EXISTS public.get_all_orders();
CREATE OR REPLACE FUNCTION public.get_all_orders(p_start_date DATE DEFAULT NULL, p_end_date DATE DEFAULT NULL)
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
    WHERE (p_start_date IS NULL OR o.created_at::date >= p_start_date)
      AND (p_end_date IS NULL OR o.created_at::date <= p_end_date)
    ORDER BY o.id, rs.updated_at DESC NULLS LAST
  ) sub
  ORDER BY created_at DESC;
$$;

-- Update get_driver_stops to support date range filtering
DROP FUNCTION IF EXISTS public.get_driver_stops(date, date);
DROP FUNCTION IF EXISTS public.get_driver_stops(date);
CREATE OR REPLACE FUNCTION public.get_driver_stops(p_start_date DATE DEFAULT CURRENT_DATE, p_end_date DATE DEFAULT NULL)
RETURNS TABLE (
  stop_id           uuid,
  order_id          uuid,
  stop_sequence     integer,
  stop_status       text,
  customer_name     text,
  customer_phone    text,
  address_street    text,
  address_city      text,
  address_landmark  text,
  total_amount      numeric,
  payment_method    text,
  notes             text,
  updated_at        timestamptz,
  route_date        date
)
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    rs.id,
    o.id,
    rs.stop_sequence,
    rs.status,
    o.customer_name,
    o.customer_phone,
    a.street,
    a.city,
    a.landmark,
    o.total_amount,
    o.payment_method,
    o.notes,
    rs.updated_at,
    r.route_date
  FROM routes r
  JOIN route_stops rs ON rs.route_id = r.id
  JOIN orders o       ON o.id = rs.order_id
  LEFT JOIN addresses a    ON a.id = o.address_id
  WHERE r.driver_id = auth.uid()
    AND r.status != 'cancelled'
    AND (
      -- Normal range filtering
      (r.route_date >= p_start_date AND (p_end_date IS NULL OR r.route_date <= p_end_date))
      OR
      -- Auto-push overdue: if viewing "today" or a range starting today, 
      -- include all pending stops from the past
      (p_start_date <= CURRENT_DATE AND r.route_date < CURRENT_DATE AND rs.status = 'pending')
    )
  ORDER BY r.route_date ASC, rs.stop_sequence ASC;
END;
$$;
