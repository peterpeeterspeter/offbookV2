-- Enable security context for our session
BEGIN;
SET LOCAL ROLE postgres;

-- Create test users in auth.users
INSERT INTO auth.users (id, email)
VALUES 
    ('123e4567-e89b-12d3-a456-426614174000', 'test1@example.com'),
    ('987fcdeb-51a2-43e7-9abc-def123456789', 'test2@example.com')
ON CONFLICT (id) DO NOTHING;

-- Set up first user context
SET LOCAL "request.jwt.claim.sub" TO '123e4567-e89b-12d3-a456-426614174000';
SET LOCAL "request.jwt.claim.role" TO 'authenticated';

-- Start with a clean slate for testing
DELETE FROM public.practice_sessions;
DELETE FROM public.scripts;

-- Create a test script
INSERT INTO public.scripts (title, content, user_id, is_public)
VALUES (
    'Test Script',
    'Character A: Hello\nCharacter B: Hi there!',
    (SELECT current_setting('request.jwt.claim.sub')::uuid),
    false
) RETURNING id;

-- Now create a practice session (using the script we just created)
INSERT INTO public.practice_sessions (
    script_id,
    user_id,
    character_role,
    status,
    settings
)
SELECT 
    id as script_id,
    (SELECT current_setting('request.jwt.claim.sub')::uuid) as user_id,
    'Character A' as character_role,
    'active' as status,
    '{"mode": "practice", "voice_enabled": true}'::jsonb as settings
FROM public.scripts
WHERE user_id = (SELECT current_setting('request.jwt.claim.sub')::uuid)
RETURNING *;

-- Try to read back our practice session
SELECT 
    ps.*,
    s.title as script_title
FROM public.practice_sessions ps
JOIN public.scripts s ON s.id = ps.script_id
WHERE ps.user_id = (SELECT current_setting('request.jwt.claim.sub')::uuid);

COMMIT;

-- Test as a different user
BEGIN;
SET LOCAL ROLE postgres;
SET LOCAL "request.jwt.claim.sub" TO '987fcdeb-51a2-43e7-9abc-def123456789';
SET LOCAL "request.jwt.claim.role" TO 'authenticated';

-- This should return no rows due to RLS
SELECT * FROM public.practice_sessions;

-- But if we make the script public, it should be visible
UPDATE public.scripts 
SET is_public = true 
WHERE user_id = '123e4567-e89b-12d3-a456-426614174000'::uuid;

-- Now we should see the session because the script is public
SELECT 
    ps.*,
    s.title as script_title
FROM public.practice_sessions ps
JOIN public.scripts s ON s.id = ps.script_id
WHERE s.is_public = true;

COMMIT;

-- Clean up test users (optional, comment out if you want to keep them)
-- DELETE FROM auth.users 
-- WHERE id IN (
--     '123e4567-e89b-12d3-a456-426614174000',
--     '987fcdeb-51a2-43e7-9abc-def123456789'
-- ); 