-- Start transaction to allow rollback
BEGIN;

-- First create the participant_role enum and tables
CREATE TYPE public.participant_role AS ENUM ('speaker', 'listener', 'observer');

-- Add characters column to scripts table if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'scripts' 
        AND column_name = 'characters'
    ) THEN
        ALTER TABLE public.scripts ADD COLUMN characters jsonb DEFAULT '[]'::jsonb;
    END IF;
END $$;

-- Create session participants table
CREATE TABLE public.session_participants (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id uuid REFERENCES public.practice_sessions(id) ON DELETE CASCADE,
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
    role participant_role NOT NULL DEFAULT 'listener',
    joined_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    left_at timestamp with time zone,
    last_active_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    device_info jsonb DEFAULT '{}'::jsonb,
    permissions jsonb DEFAULT '{"can_speak": false, "can_listen": true, "can_share_screen": false, "can_record": false}'::jsonb,
    settings jsonb DEFAULT '{}'::jsonb,
    UNIQUE(session_id, user_id)
);

-- Enable realtime for session_participants
ALTER PUBLICATION supabase_realtime ADD TABLE public.session_participants;

-- Create indexes
CREATE INDEX session_participants_session_id_idx ON public.session_participants(session_id);
CREATE INDEX session_participants_user_id_idx ON public.session_participants(user_id);
CREATE INDEX session_participants_role_idx ON public.session_participants(role);
CREATE INDEX session_participants_active_idx ON public.session_participants(left_at) 
    WHERE left_at IS NULL;

-- Add index for character lookup in scripts
CREATE INDEX scripts_characters_gin_idx ON public.scripts USING gin (characters);

-- Enable RLS
ALTER TABLE public.session_participants ENABLE ROW LEVEL SECURITY;

-- Create RLS policies with role checks
CREATE POLICY "Users can view participants in their sessions"
    ON public.session_participants FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.practice_sessions
            WHERE practice_sessions.id = session_participants.session_id
            AND practice_sessions.user_id = auth.uid()
            AND auth.role() = 'authenticated'
        )
    );

CREATE POLICY "Users can view participants in accessible sessions"
    ON public.session_participants FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.practice_sessions
            JOIN public.scripts ON scripts.id = practice_sessions.script_id
            WHERE practice_sessions.id = session_participants.session_id
            AND (scripts.is_public OR scripts.user_id = auth.uid())
            AND auth.role() = 'authenticated'
        )
    );

CREATE POLICY "Users can join sessions they have access to"
    ON public.session_participants FOR INSERT
    WITH CHECK (
        auth.uid() = user_id 
        AND auth.role() = 'authenticated'
        AND EXISTS (
            SELECT 1 FROM public.practice_sessions
            JOIN public.scripts ON scripts.id = practice_sessions.script_id
            WHERE practice_sessions.id = session_participants.session_id
            AND (scripts.is_public OR scripts.user_id = auth.uid())
        )
    );

CREATE POLICY "Users can update their own participant records"
    ON public.session_participants FOR UPDATE
    USING (auth.uid() = user_id AND auth.role() = 'authenticated');

CREATE POLICY "Users can delete their own participant records"
    ON public.session_participants FOR DELETE
    USING (auth.uid() = user_id AND auth.role() = 'authenticated');

-- Create function to automatically update last_active_at
CREATE OR REPLACE FUNCTION public.handle_participant_activity()
RETURNS TRIGGER AS $$
BEGIN
    NEW.last_active_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for last_active_at
CREATE TRIGGER handle_participant_activity
    BEFORE UPDATE ON public.session_participants
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_participant_activity();

-- Create function to validate character_role against script characters
CREATE OR REPLACE FUNCTION public.validate_character_role()
RETURNS TRIGGER AS $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM public.scripts
        WHERE id = NEW.script_id
        AND characters @> jsonb_build_array(NEW.character_role)  -- Use JSONB containment operator with array
    ) THEN
        RAISE EXCEPTION 'Invalid character_role: %. Must be one of the characters defined in the script.', NEW.character_role;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for character_role validation
CREATE TRIGGER validate_character_role
    BEFORE INSERT OR UPDATE ON public.practice_sessions
    FOR EACH ROW
    EXECUTE FUNCTION public.validate_character_role();

-- Now run the tests
-- Clean any existing test data
DELETE FROM public.session_participants;
DELETE FROM public.practice_sessions;
DELETE FROM public.scripts;

-- Set up test users (simulating auth.uid())
SET LOCAL ROLE postgres;
SET LOCAL "request.jwt.claim.sub" = '123e4567-e89b-12d3-a456-426614174000';
SET LOCAL "request.jwt.claim.role" = 'authenticated';

-- Create a test script with character roles
INSERT INTO public.scripts (id, title, content, user_id, is_public, characters)
VALUES (
    '123e4567-e89b-12d3-a456-426614174001'::uuid,
    'Test Script',
    '{"content": "Hello world"}',
    '123e4567-e89b-12d3-a456-426614174000'::uuid,
    false,
    '["Romeo", "Juliet", "Nurse"]'::jsonb
) RETURNING id;

-- Create a practice session with character_role
INSERT INTO public.practice_sessions (id, script_id, user_id, status, character_role)
VALUES (
    '123e4567-e89b-12d3-a456-426614174002'::uuid,
    '123e4567-e89b-12d3-a456-426614174001'::uuid,
    '123e4567-e89b-12d3-a456-426614174000'::uuid,
    'active',
    'Romeo'
) RETURNING id;

-- Test 1: Join session as owner/speaker practicing Romeo
INSERT INTO public.session_participants (
    id, session_id, user_id, role, device_info
)
VALUES (
    '123e4567-e89b-12d3-a456-426614174003'::uuid,
    '123e4567-e89b-12d3-a456-426614174002'::uuid,
    '123e4567-e89b-12d3-a456-426614174000'::uuid,
    'speaker',
    '{"browser": "Chrome", "os": "MacOS"}'::jsonb
);

-- Verify we can read our own participant record
SELECT id, role, permissions FROM public.session_participants 
WHERE session_id = '123e4567-e89b-12d3-a456-426614174002'::uuid;

-- Test 2: Try to join as another user (should fail due to RLS)
SET LOCAL "request.jwt.claim.sub" = '123e4567-e89b-12d3-a456-426614174999';
SET LOCAL "request.jwt.claim.role" = 'authenticated';

INSERT INTO public.session_participants (
    session_id, user_id, role
)
VALUES (
    '123e4567-e89b-12d3-a456-426614174002'::uuid,
    '123e4567-e89b-12d3-a456-426614174999'::uuid,
    'listener'
); -- This should fail due to RLS (private script)

-- Test 3: Make script public and try again
SET LOCAL "request.jwt.claim.sub" = '123e4567-e89b-12d3-a456-426614174000';
SET LOCAL "request.jwt.claim.role" = 'authenticated';
UPDATE public.scripts SET is_public = true WHERE id = '123e4567-e89b-12d3-a456-426614174001'::uuid;

-- Now try joining as another user (should succeed)
SET LOCAL "request.jwt.claim.sub" = '123e4567-e89b-12d3-a456-426614174999';
SET LOCAL "request.jwt.claim.role" = 'authenticated';
INSERT INTO public.session_participants (
    id, session_id, user_id, role
)
VALUES (
    '123e4567-e89b-12d3-a456-426614174004'::uuid,
    '123e4567-e89b-12d3-a456-426614174002'::uuid,
    '123e4567-e89b-12d3-a456-426614174999'::uuid,
    'listener'
);

-- Test 4: Verify automatic timestamp updates
UPDATE public.session_participants 
SET role = 'observer'
WHERE id = '123e4567-e89b-12d3-a456-426614174004'::uuid;

-- Check if last_active_at was updated
SELECT id, role, last_active_at 
FROM public.session_participants 
WHERE id = '123e4567-e89b-12d3-a456-426614174004'::uuid;

-- Test 5: Verify permissions
-- Try to update another user's record (should fail)
UPDATE public.session_participants 
SET role = 'speaker'
WHERE id = '123e4567-e89b-12d3-a456-426614174003'::uuid; -- Should fail due to RLS

-- Test 6: Test participant leaving
UPDATE public.session_participants 
SET left_at = now()
WHERE id = '123e4567-e89b-12d3-a456-426614174004'::uuid;

-- Verify active participants index
SELECT id, role FROM public.session_participants 
WHERE left_at IS NULL;

-- Test 7: Create another practice session for a different character
INSERT INTO public.practice_sessions (id, script_id, user_id, status, character_role)
VALUES (
    '123e4567-e89b-12d3-a456-426614174005'::uuid,
    '123e4567-e89b-12d3-a456-426614174001'::uuid,
    '123e4567-e89b-12d3-a456-426614174000'::uuid,
    'active',
    'Juliet'
) RETURNING id;

-- Join as a speaker for Juliet practice
INSERT INTO public.session_participants (
    id, session_id, user_id, role
)
VALUES (
    '123e4567-e89b-12d3-a456-426614174006'::uuid,
    '123e4567-e89b-12d3-a456-426614174005'::uuid,
    '123e4567-e89b-12d3-a456-426614174000'::uuid,
    'speaker'
);

-- Test 8: Try to create a session with invalid character (should fail)
INSERT INTO public.practice_sessions (id, script_id, user_id, status, character_role)
VALUES (
    '123e4567-e89b-12d3-a456-426614174007'::uuid,
    '123e4567-e89b-12d3-a456-426614174001'::uuid,
    '123e4567-e89b-12d3-a456-426614174000'::uuid,
    'active',
    'InvalidCharacter'
); -- This should fail due to character validation

-- Verify we can have multiple active sessions with different characters
SELECT ps.character_role, sp.role, sp.last_active_at
FROM public.practice_sessions ps
JOIN public.session_participants sp ON sp.session_id = ps.id
WHERE sp.left_at IS NULL
ORDER BY ps.character_role;

-- Rollback all changes (this will undo everything including table creation)
ROLLBACK; 
