-- Supabase Database Backup
-- Generated: 2024-01-27

-- 1. Schema
CREATE TABLE IF NOT EXISTS public.scripts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    user_id UUID REFERENCES auth.users(id),
    is_public BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 2. Current Data
INSERT INTO public.scripts (id, title, content, user_id, is_public, created_at, updated_at) VALUES
    ('025deb91-f71e-40df-912a-2a94a39af3f0', 'Test Script', 'To be or not to be, that is the question.', NULL, true, '2025-01-27 18:38:36.789838+00', '2025-01-27 18:38:36.789838+00'),
    ('f12a345e-dba6-40da-a064-bb01a904865c', 'Private Script User 1', 'Content 1', 'd7bed83c-44a0-4a9f-8bb9-d2cd5e7a5a8f', false, '2025-01-27 18:35:35.090658+00', '2025-01-27 18:35:35.090658+00'),
    ('6e6ef458-98e1-4e44-8c79-441e621b04c0', 'Public Script User 1', 'Content 2', 'd7bed83c-44a0-4a9f-8bb9-d2cd5e7a5a8f', true, '2025-01-27 18:35:35.090658+00', '2025-01-27 18:35:35.090658+00'),
    ('941e43e6-a5bf-4e75-a807-7393999e9093', 'Private Script User 2', 'Content 3', 'e9be4f7d-5946-4a4f-8bb9-b2cd5e7a5a8e', false, '2025-01-27 18:35:35.090658+00', '2025-01-27 18:35:35.090658+00');

-- 3. RLS Policies
ALTER TABLE public.scripts FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "allow_public_scripts" ON public.scripts;
DROP POLICY IF EXISTS "allow_own_scripts" ON public.scripts;

CREATE POLICY "allow_public_scripts" ON public.scripts
FOR SELECT TO anon
USING (is_public = true);

CREATE POLICY "allow_own_scripts" ON public.scripts
FOR SELECT TO authenticated
USING (
    is_public = true OR 
    (user_id::text = auth.uid()::text AND auth.role() = 'authenticated')
);

-- 4. Verification Queries
SELECT 'Schema Check' as check_type, count(*) as count FROM information_schema.tables WHERE table_name = 'scripts';
SELECT 'Data Check' as check_type, count(*) as count FROM public.scripts;
SELECT 'Policy Check' as check_type, count(*) as count FROM pg_policies WHERE tablename = 'scripts'; 