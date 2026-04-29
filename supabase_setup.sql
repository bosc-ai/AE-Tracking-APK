-- Create User Roles table for the D2C Platform
-- Roles can be 'customer', 'driver', 'admin'

CREATE TABLE public.user_roles (
    id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
    role TEXT NOT NULL CHECK (role IN ('customer', 'driver', 'admin')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- RLS Settings for user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Admins can read all roles, users can read their own role
CREATE POLICY "Users can read own role" ON public.user_roles
    FOR SELECT
    USING (auth.uid() = id);

-- Create Profiles table for extended user metadata
CREATE TABLE public.profiles (
    id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
    full_name TEXT,
    phone_number TEXT,
    avatar_url TEXT,
    updated_at TIMESTAMP WITH TIME ZONE
);

-- RLS Settings for profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Trigger to automatically create a profile and user_role ('customer' by default) when an auth.user is created
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, full_name)
    VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name');

    INSERT INTO public.user_roles (id, role)
    VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'role', 'customer'));
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
