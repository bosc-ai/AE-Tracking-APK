-- ==========================================
-- SQL Migration: Add Delete Driver RPC
-- Run this in your Supabase SQL Editor
-- ==========================================

CREATE OR REPLACE FUNCTION delete_driver(target_driver_id UUID)
RETURNS void AS $$
BEGIN
  -- 1. Ensure the calling user is an admin
  IF NOT EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE id = auth.uid() AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Not authorized. Only admins can delete drivers.';
  END IF;

  -- 2. Verify the target user is actually a driver
  IF NOT EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE id = target_driver_id AND role = 'driver'
  ) THEN
    RAISE EXCEPTION 'Target user is not a driver.';
  END IF;

  -- 3. Delete from auth.users (this will CASCADE to profiles, user_roles, etc.)
  DELETE FROM auth.users WHERE id = target_driver_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
