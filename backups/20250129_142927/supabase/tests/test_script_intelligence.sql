-- Start transaction to allow rollback
BEGIN;

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

-- Create the balcony scene
INSERT INTO public.scenes (
    id, script_id, scene_number, scene_type, 
    title, description, start_page, end_page
)
VALUES (
    '123e4567-e89b-12d3-a456-426614174002'::uuid,
    '123e4567-e89b-12d3-a456-426614174001'::uuid,
    1,
    'dialogue',
    'The Balcony Scene',
    'Juliet appears on her balcony, with Romeo in the garden below',
    1,
    3
) RETURNING id;

-- Insert script lines with emotion tags
INSERT INTO public.script_lines (
    id, script_id, scene_id, character_name, 
    line_number, content, emotion_tags, timing_notes
) VALUES 
-- Romeo's lines
(
    '123e4567-e89b-12d3-a456-426614174003'::uuid,
    '123e4567-e89b-12d3-a456-426614174001'::uuid,
    '123e4567-e89b-12d3-a456-426614174002'::uuid,
    'Romeo',
    1,
    'But, soft! what light through yonder window breaks?',
    ARRAY['surprised', 'whispering']::emotion_type[],
    '{"base_pause": 0.8, "dynamic_pause": true, "emphasis_points": [5, 8]}'::jsonb
),
(
    '123e4567-e89b-12d3-a456-426614174004'::uuid,
    '123e4567-e89b-12d3-a456-426614174001'::uuid,
    '123e4567-e89b-12d3-a456-426614174002'::uuid,
    'Romeo',
    2,
    'It is the east, and Juliet is the sun.',
    ARRAY['happy']::emotion_type[],
    '{"base_pause": 0.5, "dynamic_pause": true, "emphasis_points": [4, 7]}'::jsonb
),
-- Juliet's lines
(
    '123e4567-e89b-12d3-a456-426614174005'::uuid,
    '123e4567-e89b-12d3-a456-426614174001'::uuid,
    '123e4567-e89b-12d3-a456-426614174002'::uuid,
    'Juliet',
    3,
    'O Romeo, Romeo! wherefore art thou Romeo?',
    ARRAY['sad', 'surprised']::emotion_type[],
    '{"base_pause": 1.0, "dynamic_pause": true, "emphasis_points": [2, 8]}'::jsonb
);

-- Create some cached audio entries
INSERT INTO public.cached_audio (
    id, line_id, emotion, audio_url, audio_hash,
    duration, use_count
) VALUES 
(
    '123e4567-e89b-12d3-a456-426614174006'::uuid,
    '123e4567-e89b-12d3-a456-426614174003'::uuid,
    'whispering',
    'https://storage.example.com/audio/romeo_line1_whisper.mp3',
    'hash123',
    3.5,
    1
),
(
    '123e4567-e89b-12d3-a456-426614174007'::uuid,
    '123e4567-e89b-12d3-a456-426614174005'::uuid,
    'sad',
    'https://storage.example.com/audio/juliet_line1_sad.mp3',
    'hash456',
    4.2,
    1
);

-- Add some feedback
INSERT INTO public.script_feedback (
    id, script_id, scene_id, line_id, 
    user_id, feedback_type, content
) VALUES 
(
    '123e4567-e89b-12d3-a456-426614174008'::uuid,
    '123e4567-e89b-12d3-a456-426614174001'::uuid,
    '123e4567-e89b-12d3-a456-426614174002'::uuid,
    '123e4567-e89b-12d3-a456-426614174003'::uuid,
    '123e4567-e89b-12d3-a456-426614174000'::uuid,
    'emotion_suggestion',
    'Consider adding more yearning to the delivery'
);

-- Test queries

-- 1. Test scene retrieval with line count
SELECT 
    s.title,
    s.scene_type,
    COUNT(sl.id) as line_count,
    array_agg(DISTINCT sl.character_name) as characters
FROM public.scenes s
LEFT JOIN public.script_lines sl ON sl.scene_id = s.id
GROUP BY s.id, s.title, s.scene_type;

-- 2. Test emotion tag usage
SELECT 
    unnest(emotion_tags) as emotion,
    COUNT(*) as usage_count
FROM public.script_lines
GROUP BY emotion
ORDER BY usage_count DESC;

-- 3. Test cached audio statistics
SELECT 
    sl.character_name,
    ca.emotion,
    ca.duration,
    ca.use_count
FROM public.cached_audio ca
JOIN public.script_lines sl ON sl.id = ca.line_id
ORDER BY ca.use_count DESC;

-- 4. Test feedback retrieval
SELECT 
    sf.feedback_type,
    sf.content,
    sl.character_name,
    sl.content as line_content
FROM public.script_feedback sf
JOIN public.script_lines sl ON sl.id = sf.line_id;

-- 5. Test character line distribution
SELECT 
    character_name,
    COUNT(*) as line_count,
    array_agg(DISTINCT unnest(emotion_tags)) as emotions_used
FROM public.script_lines
GROUP BY character_name;

-- Test updating cached audio usage
UPDATE public.cached_audio 
SET use_count = use_count 
WHERE id = '123e4567-e89b-12d3-a456-426614174006'::uuid
RETURNING id, use_count, last_used_at;

-- Verify RLS policies

-- Switch to another user
SET LOCAL "request.jwt.claim.sub" = '123e4567-e89b-12d3-a456-426614174999';

-- Try to view script lines (should work as script is public)
SELECT character_name, content 
FROM public.script_lines 
WHERE script_id = '123e4567-e89b-12d3-a456-426614174001'::uuid;

-- Try to add feedback (should work as script is public)
INSERT INTO public.script_feedback (
    id, script_id, scene_id, line_id,
    user_id, feedback_type, content
) VALUES (
    '123e4567-e89b-12d3-a456-426614174009'::uuid,
    '123e4567-e89b-12d3-a456-426614174001'::uuid,
    '123e4567-e89b-12d3-a456-426614174002'::uuid,
    '123e4567-e89b-12d3-a456-426614174003'::uuid,
    '123e4567-e89b-12d3-a456-426614174999'::uuid,
    'timing_suggestion',
    'Pause longer after "soft!"'
);

-- Make script private
UPDATE public.scripts 
SET is_public = false 
WHERE id = '123e4567-e89b-12d3-a456-426614174001'::uuid;

-- Try to view script lines again (should fail due to RLS)
SELECT character_name, content 
FROM public.script_lines 
WHERE script_id = '123e4567-e89b-12d3-a456-426614174001'::uuid;

-- Rollback all changes
ROLLBACK; 