-- SEED DATA: Run this AFTER all schema scripts
-- This creates your initial admin user and sample products
-- 
-- IMPORTANT: After running this, you need to manually:
-- 1. Go to Supabase Dashboard → Authentication → Users
-- 2. Find the admin user and confirm their email (or disable email confirmation in Auth settings)
-- 3. Sign in with: admin@d2c.com / admin123456
--
-- Alternatively, just sign up via the app's login page, 
-- then manually change your role in user_roles table from 'customer' to 'admin'

-- Sample Products (these will show up in the customer catalog)
INSERT INTO public.products (name, description, price, image_url, stock_count) VALUES
('Premium Wireless Headphones', 'Noise-cancelling over-ear headphones with 40hr battery', 12999, 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?q=80&w=400&auto=format&fit=crop', 50),
('Smart Fitness Watch', 'Track health, workouts, and notifications on your wrist', 4999, 'https://images.unsplash.com/photo-1579586337278-3befd40fd17a?q=80&w=400&auto=format&fit=crop', 100),
('Ergonomic Mechanical Keyboard', 'Tactile switches with RGB backlight for productivity', 8500, 'https://images.unsplash.com/photo-1595225476474-87563907a212?q=80&w=400&auto=format&fit=crop', 30),
('Portable Bluetooth Speaker', 'Waterproof speaker with 360-degree surround sound', 3499, 'https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?q=80&w=400&auto=format&fit=crop', 75),
('USB-C Fast Charger', '65W GaN charger for laptops and phones', 1999, 'https://images.unsplash.com/photo-1583863788434-e58a36330cf0?q=80&w=400&auto=format&fit=crop', 200),
('Wireless Mouse', 'Ergonomic design with silent click technology', 1499, 'https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?q=80&w=400&auto=format&fit=crop', 150);
