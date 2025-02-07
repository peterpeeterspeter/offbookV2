-- Start transaction to allow rollback
BEGIN;

-- Clean existing test data
DELETE FROM public.session_participants;
DELETE FROM public.practice_sessions;
DELETE FROM public.scripts;

-- Set up test users (simulating auth.uid())
SET LOCAL ROLE postgres;
SET LOCAL "request.jwt.claim.sub" = '12345';
SET LOCAL "request.jwt.claim.role" = 'authenticated';

-- Create a test script
INSERT INTO public.scripts (id, title, content, user_id, is_public)
VALUES (
    'script123',
    'Test Script',
    '{"content": "Hello world"}',
    '12345',
    false
) RETURNING id;

-- Create a practice session
INSERT INTO public.practice_sessions (id, script_id, user_id, status)
VALUES (
    'session123',
    'script123',
    '12345',
    'active'
) RETURNING id;

-- Test 1: Join session as owner
INSERT INTO public.session_participants (
    id, session_id, user_id, role, device_info
)
VALUES (
    'participant1',
    'session123',
    '12345',
    'speaker',
    '{"browser": "Chrome", "os": "MacOS"}'::jsonb
);

-- Verify we can read our own participant record
SELECT id, role, permissions FROM public.session_participants 
WHERE session_id = 'session123';

-- Test 2: Try to join as another user (should fail due to RLS)
SET LOCAL "request.jwt.claim.sub" = '67890';

INSERT INTO public.session_participants (
    session_id, user_id, role
)
VALUES (
    'session123',
    '67890',
    'listener'
); -- This should fail due to RLS (private script)

-- Test 3: Make script public and try again
SET LOCAL "request.jwt.claim.sub" = '12345';
UPDATE public.scripts SET is_public = true WHERE id = 'script123';

-- Now try joining as another user (should succeed)
SET LOCAL "request.jwt.claim.sub" = '67890';
INSERT INTO public.session_participants (
    id, session_id, user_id, role
)
VALUES (
    'participant2',
    'session123',
    '67890',
    'listener'
);

-- Test 4: Verify automatic timestamp updates
UPDATE public.session_participants 
SET role = 'observer'
WHERE id = 'participant2';

-- Check if last_active_at was updated
SELECT id, role, last_active_at 
FROM public.session_participants 
WHERE id = 'participant2';

-- Test 5: Verify permissions
-- Try to update another user's record (should fail)
UPDATE public.session_participants 
SET role = 'speaker'
WHERE id = 'participant1'; -- Should fail due to RLS

-- Test 6: Test participant leaving
UPDATE public.session_participants 
SET left_at = now()
WHERE id = 'participant2';

-- Verify active participants index
SELECT id, role FROM public.session_participants 
WHERE left_at IS NULL;

-- Rollback all changes
ROLLBACK; 