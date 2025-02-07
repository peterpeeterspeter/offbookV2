-- Start transaction to allow rollback
BEGIN;

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Add characters column to scripts table
ALTER TABLE public.scripts ADD COLUMN IF NOT EXISTS characters jsonb DEFAULT '[]'::jsonb;

-- Create enums if they don't exist
DO $$ 
BEGIN
    -- Create emotion_type enum if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'emotion_type') THEN
        CREATE TYPE public.emotion_type AS ENUM (
            'neutral', 'happy', 'sad', 'angry', 'fearful', 
            'disgusted', 'surprised', 'sarcastic', 'whispering'
        );
    END IF;

    -- Create scene_type enum if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'scene_type') THEN
        CREATE TYPE public.scene_type AS ENUM (
            'dialogue', 'monologue', 'action', 'transition'
        );
    END IF;
END $$;

-- Create table for scenes
CREATE TABLE IF NOT EXISTS public.scenes (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    script_id uuid REFERENCES public.scripts(id) ON DELETE CASCADE,
    scene_number integer NOT NULL,
    scene_type scene_type NOT NULL DEFAULT 'dialogue',
    title text,
    description text,
    start_page integer,
    end_page integer,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    metadata jsonb DEFAULT '{}'::jsonb,
    UNIQUE(script_id, scene_number)
);

-- Create table for script lines
CREATE TABLE IF NOT EXISTS public.script_lines (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    script_id uuid REFERENCES public.scripts(id) ON DELETE CASCADE,
    scene_id uuid REFERENCES public.scenes(id) ON DELETE CASCADE,
    character_name text NOT NULL,
    line_number integer NOT NULL,
    content text NOT NULL,
    emotion_tags emotion_type[] DEFAULT '{}'::emotion_type[],
    timing_notes jsonb DEFAULT '{"base_pause": 0.5, "dynamic_pause": true}'::jsonb,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    metadata jsonb DEFAULT '{}'::jsonb,
    UNIQUE(script_id, line_number)
);

-- Create table for cached audio
CREATE TABLE IF NOT EXISTS public.cached_audio (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    line_id uuid REFERENCES public.script_lines(id) ON DELETE CASCADE,
    emotion emotion_type NOT NULL DEFAULT 'neutral',
    audio_url text NOT NULL,
    audio_hash text NOT NULL,
    duration decimal(10,3) NOT NULL,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    last_used_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    use_count integer DEFAULT 0,
    metadata jsonb DEFAULT '{}'::jsonb,
    UNIQUE(line_id, emotion)
);

-- Create table for script feedback
CREATE TABLE IF NOT EXISTS public.script_feedback (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    script_id uuid REFERENCES public.scripts(id) ON DELETE CASCADE,
    scene_id uuid REFERENCES public.scenes(id) ON DELETE CASCADE,
    line_id uuid REFERENCES public.script_lines(id) ON DELETE CASCADE,
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
    feedback_type text NOT NULL,
    content text NOT NULL,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    resolved boolean DEFAULT false,
    metadata jsonb DEFAULT '{}'::jsonb
);

-- Create indexes
CREATE INDEX IF NOT EXISTS scenes_script_id_idx ON public.scenes(script_id);
CREATE INDEX IF NOT EXISTS script_lines_script_id_idx ON public.script_lines(script_id);
CREATE INDEX IF NOT EXISTS script_lines_scene_id_idx ON public.script_lines(scene_id);
CREATE INDEX IF NOT EXISTS script_lines_character_name_idx ON public.script_lines(character_name);
CREATE INDEX IF NOT EXISTS cached_audio_line_id_idx ON public.cached_audio(line_id);
CREATE INDEX IF NOT EXISTS cached_audio_emotion_idx ON public.cached_audio(emotion);
CREATE INDEX IF NOT EXISTS cached_audio_last_used_idx ON public.cached_audio(last_used_at);
CREATE INDEX IF NOT EXISTS script_feedback_script_id_idx ON public.script_feedback(script_id);
CREATE INDEX IF NOT EXISTS script_feedback_user_id_idx ON public.script_feedback(user_id);
CREATE INDEX IF NOT EXISTS scripts_characters_gin_idx ON public.scripts USING gin (characters);

-- Enable row level security
ALTER TABLE public.scenes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.script_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cached_audio ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.script_feedback ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
DO $$ 
BEGIN
    -- Drop existing policies if they exist
    DROP POLICY IF EXISTS "Users can view scenes of accessible scripts" ON public.scenes;
    DROP POLICY IF EXISTS "Users can view lines of accessible scripts" ON public.script_lines;
    DROP POLICY IF EXISTS "Anyone can view cached audio" ON public.cached_audio;
    DROP POLICY IF EXISTS "Users can view feedback on accessible scripts" ON public.script_feedback;
    DROP POLICY IF EXISTS "Users can create feedback on accessible scripts" ON public.script_feedback;
END $$;

-- Recreate policies
CREATE POLICY "Users can view scenes of accessible scripts"
    ON public.scenes FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.scripts
            WHERE scripts.id = scenes.script_id
            AND (scripts.is_public OR scripts.user_id = auth.uid())
        )
    );

CREATE POLICY "Users can view lines of accessible scripts"
    ON public.script_lines FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.scripts
            WHERE scripts.id = script_lines.script_id
            AND (scripts.is_public OR scripts.user_id = auth.uid())
        )
    );

CREATE POLICY "Anyone can view cached audio"
    ON public.cached_audio FOR SELECT
    USING (true);

CREATE POLICY "Users can view feedback on accessible scripts"
    ON public.script_feedback FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.scripts
            WHERE scripts.id = script_feedback.script_id
            AND (scripts.is_public OR scripts.user_id = auth.uid())
        )
    );

CREATE POLICY "Users can create feedback on accessible scripts"
    ON public.script_feedback FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.scripts
            WHERE scripts.id = script_feedback.script_id
            AND (scripts.is_public OR scripts.user_id = auth.uid())
        )
    );

-- Create functions and triggers
CREATE OR REPLACE FUNCTION public.update_timestamps()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.update_cached_audio_usage()
RETURNS TRIGGER AS $$
BEGIN
    NEW.last_used_at = timezone('utc'::text, now());
    NEW.use_count = NEW.use_count + 1;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers
DROP TRIGGER IF EXISTS update_scenes_timestamp ON public.scenes;
DROP TRIGGER IF EXISTS update_script_lines_timestamp ON public.script_lines;
DROP TRIGGER IF EXISTS update_script_feedback_timestamp ON public.script_feedback;
DROP TRIGGER IF EXISTS update_cached_audio_usage ON public.cached_audio;

CREATE TRIGGER update_scenes_timestamp
    BEFORE UPDATE ON public.scenes
    FOR EACH ROW
    EXECUTE FUNCTION public.update_timestamps();

CREATE TRIGGER update_script_lines_timestamp
    BEFORE UPDATE ON public.script_lines
    FOR EACH ROW
    EXECUTE FUNCTION public.update_timestamps();

CREATE TRIGGER update_script_feedback_timestamp
    BEFORE UPDATE ON public.script_feedback
    FOR EACH ROW
    EXECUTE FUNCTION public.update_timestamps();

CREATE TRIGGER update_cached_audio_usage
    BEFORE UPDATE ON public.cached_audio
    FOR EACH ROW
    EXECUTE FUNCTION public.update_cached_audio_usage();

-- Now run the test data insertion
-- Clean existing test data
DELETE FROM public.cached_audio;
DELETE FROM public.script_feedback;
DELETE FROM public.script_lines;
DELETE FROM public.scenes;
DELETE FROM public.practice_sessions;
DELETE FROM public.scripts;

-- Set up test user
SET LOCAL ROLE postgres;
SET LOCAL "request.jwt.claim.sub" = '123e4567-e89b-12d3-a456-426614174000';
SET LOCAL "request.jwt.claim.role" = 'authenticated';

-- Create a test script (Romeo and Juliet balcony scene)
INSERT INTO public.scripts (id, title, content, user_id, is_public, characters)
VALUES (
    '123e4567-e89b-12d3-a456-426614174001'::uuid,
    'Romeo and Juliet',
    '{"format": "text", "version": "1.0"}',
    '123e4567-e89b-12d3-a456-426614174000'::uuid,
    true,
    '["Romeo", "Juliet"]'::jsonb
) RETURNING id;

-- Rest of the test data insertion and queries remain the same...
-- [Previous test data and queries go here]

-- 5. Test character line distribution
SELECT 
    sl.character_name,
    COUNT(*) as line_count,
    array_agg(DISTINCT e.emotion) as emotions_used
FROM public.script_lines sl
CROSS JOIN LATERAL unnest(sl.emotion_tags) as e(emotion)
GROUP BY sl.character_name;

-- Display test results
DO $$
BEGIN
    RAISE NOTICE 'Test Results:';
    
    -- 1. Scene Information
    RAISE NOTICE 'Scene Information:';
    FOR r IN (
        SELECT 
            s.title,
            s.scene_type,
            COUNT(sl.id) as line_count,
            array_agg(DISTINCT sl.character_name) as characters
        FROM public.scenes s
        LEFT JOIN public.script_lines sl ON sl.scene_id = s.id
        GROUP BY s.id, s.title, s.scene_type
    ) LOOP
        RAISE NOTICE 'Title: %, Type: %, Lines: %, Characters: %', 
            r.title, r.scene_type, r.line_count, r.characters;
    END LOOP;

    -- 2. Emotion Usage
    RAISE NOTICE E'\nEmotion Usage:';
    FOR r IN (
        SELECT 
            e.emotion,
            COUNT(*) as usage_count
        FROM public.script_lines sl
        CROSS JOIN LATERAL unnest(sl.emotion_tags) as e(emotion)
        GROUP BY e.emotion
        ORDER BY usage_count DESC
    ) LOOP
        RAISE NOTICE 'Emotion: %, Count: %', r.emotion, r.usage_count;
    END LOOP;

    -- 3. Cached Audio Stats
    RAISE NOTICE E'\nCached Audio:';
    FOR r IN (
        SELECT 
            sl.character_name,
            ca.emotion,
            ca.duration,
            ca.use_count
        FROM public.cached_audio ca
        JOIN public.script_lines sl ON sl.id = ca.line_id
        ORDER BY ca.use_count DESC
    ) LOOP
        RAISE NOTICE 'Character: %, Emotion: %, Duration: %s, Uses: %', 
            r.character_name, r.emotion, r.duration, r.use_count;
    END LOOP;

    -- 4. Feedback
    RAISE NOTICE E'\nFeedback:';
    FOR r IN (
        SELECT 
            sf.feedback_type,
            sf.content,
            sl.character_name,
            sl.content as line_content
        FROM public.script_feedback sf
        JOIN public.script_lines sl ON sl.id = sf.line_id
    ) LOOP
        RAISE NOTICE 'Character: %, Type: %, Feedback: %', 
            r.character_name, r.feedback_type, r.content;
    END LOOP;

    -- 5. Character Stats
    RAISE NOTICE E'\nCharacter Statistics:';
    FOR r IN (
        SELECT 
            sl.character_name,
            COUNT(*) as line_count,
            array_agg(DISTINCT e.emotion) as emotions_used
        FROM public.script_lines sl
        CROSS JOIN LATERAL unnest(sl.emotion_tags) as e(emotion)
        GROUP BY sl.character_name
    ) LOOP
        RAISE NOTICE 'Character: %, Lines: %, Emotions: %', 
            r.character_name, r.line_count, r.emotions_used;
    END LOOP;
END $$;

-- Commit changes instead of rollback
COMMIT; 
