-- Start transaction
BEGIN;

-- Set up test users
SET LOCAL ROLE postgres;
SET LOCAL "request.jwt.claim.sub" = '123e4567-e89b-12d3-a456-426614174000';
SET LOCAL "request.jwt.claim.role" = 'authenticated';

-- Test Case 1: Script with no characters
INSERT INTO public.scripts (id, title, content, user_id, is_public, characters)
VALUES (
    '123e4567-e89b-12d3-a456-426614174101'::uuid,
    'Empty Script',
    '{"format": "text", "version": "1.0"}',
    '123e4567-e89b-12d3-a456-426614174000'::uuid,
    true,
    '[]'::jsonb
) RETURNING id;

-- Test Case 2: Script with special characters in title and content
INSERT INTO public.scripts (id, title, content, user_id, is_public, characters)
VALUES (
    '123e4567-e89b-12d3-a456-426614174102'::uuid,
    'Script with Special Characters: ¡™£¢∞§¶•ªº!@#$%^&*()',
    '{"format": "text", "version": "1.0", "encoding": "UTF-8"}',
    '123e4567-e89b-12d3-a456-426614174000'::uuid,
    true,
    '["Character¡™£", "Character#$%"]'::jsonb
) RETURNING id;

-- Test Case 3: Scene with maximum values
INSERT INTO public.scenes (
    id, script_id, scene_number, scene_type, 
    title, description, start_page, end_page
)
VALUES (
    '123e4567-e89b-12d3-a456-426614174103'::uuid,
    '123e4567-e89b-12d3-a456-426614174102'::uuid,
    2147483647, -- max int
    'dialogue',
    repeat('Long Title ', 100), -- very long title
    repeat('Long Description ', 1000), -- very long description
    1,
    2147483647 -- max int
);

-- Test Case 4: Line with empty emotion tags and complex timing
INSERT INTO public.script_lines (
    id, script_id, scene_id, character_name, 
    line_number, content, emotion_tags, timing_notes
)
VALUES (
    '123e4567-e89b-12d3-a456-426614174104'::uuid,
    '123e4567-e89b-12d3-a456-426614174102'::uuid,
    '123e4567-e89b-12d3-a456-426614174103'::uuid,
    'Character¡™£',
    1,
    'Line with no emotions but complex timing',
    '{}'::emotion_type[],
    '{"base_pause": 0.001, "dynamic_pause": true, "emphasis_points": [1,2,3,4,5,6,7,8,9,10], "custom_timing": {"start": 0, "end": 999.999}}'::jsonb
);

-- Test Case 5: Line with maximum emotions
INSERT INTO public.script_lines (
    id, script_id, scene_id, character_name, 
    line_number, content, emotion_tags, timing_notes
)
VALUES (
    '123e4567-e89b-12d3-a456-426614174105'::uuid,
    '123e4567-e89b-12d3-a456-426614174102'::uuid,
    '123e4567-e89b-12d3-a456-426614174103'::uuid,
    'Character#$%',
    2,
    'Line with all possible emotions',
    ARRAY['neutral', 'happy', 'sad', 'angry', 'fearful', 'disgusted', 'surprised', 'sarcastic', 'whispering']::emotion_type[],
    '{"base_pause": 0.5}'::jsonb
);

-- Test Case 6: Cached audio with extreme values
INSERT INTO public.cached_audio (
    id, line_id, emotion, audio_url, audio_hash,
    duration, use_count
)
VALUES 
(
    '123e4567-e89b-12d3-a456-426614174106'::uuid,
    '123e4567-e89b-12d3-a456-426614174104'::uuid,
    'neutral',
    repeat('https://very-long-domain-name.com/', 100) || '/audio.mp3',
    md5(random()::text),
    0.001, -- very short duration
    0
),
(
    '123e4567-e89b-12d3-a456-426614174107'::uuid,
    '123e4567-e89b-12d3-a456-426614174105'::uuid,
    'whispering',
    'https://example.com/audio.mp3',
    md5(random()::text),
    999.999, -- very long duration
    2147483647 -- max int for use_count
);

-- Test Case 7: Feedback with empty content
INSERT INTO public.script_feedback (
    id, script_id, scene_id, line_id, 
    user_id, feedback_type, content
)
VALUES (
    '123e4567-e89b-12d3-a456-426614174108'::uuid,
    '123e4567-e89b-12d3-a456-426614174102'::uuid,
    '123e4567-e89b-12d3-a456-426614174103'::uuid,
    '123e4567-e89b-12d3-a456-426614174104'::uuid,
    '123e4567-e89b-12d3-a456-426614174000'::uuid,
    'empty_feedback',
    ''
);

-- Test Case 8: Concurrent user access simulation
DO $$
DECLARE
    i int;
BEGIN
    FOR i IN 1..5 LOOP
        -- Simulate different users trying to access the same script
        SET LOCAL "request.jwt.claim.sub" = md5(i::text);
        
        -- Try to add feedback
        INSERT INTO public.script_feedback (
            id, script_id, scene_id, line_id,
            user_id, feedback_type, content
        ) VALUES (
            gen_random_uuid(),
            '123e4567-e89b-12d3-a456-426614174102'::uuid,
            '123e4567-e89b-12d3-a456-426614174103'::uuid,
            '123e4567-e89b-12d3-a456-426614174104'::uuid,
            md5(i::text)::uuid,
            'concurrent_feedback',
            format('Concurrent feedback from user %s', i)
        );
    END LOOP;
END $$;

-- Test Case 9: RLS edge cases
DO $$
DECLARE
    r RECORD;
BEGIN
    RAISE NOTICE 'Testing RLS Edge Cases:';
    
    -- Test 1: Access with no role
    SET LOCAL "request.jwt.claim.role" = NULL;
    BEGIN
        SELECT * FROM public.scripts LIMIT 1 INTO r;
        RAISE NOTICE 'Unexpected: Access allowed without role';
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Expected: Access denied without role';
    END;

    -- Test 2: Access with invalid role
    SET LOCAL "request.jwt.claim.role" = 'invalid_role';
    BEGIN
        SELECT * FROM public.scripts LIMIT 1 INTO r;
        RAISE NOTICE 'Unexpected: Access allowed with invalid role';
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Expected: Access denied with invalid role';
    END;

    -- Test 3: Access with no user ID
    SET LOCAL "request.jwt.claim.sub" = NULL;
    SET LOCAL "request.jwt.claim.role" = 'authenticated';
    BEGIN
        SELECT * FROM public.scripts LIMIT 1 INTO r;
        RAISE NOTICE 'Unexpected: Access allowed without user ID';
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Expected: Access denied without user ID';
    END;
END $$;

-- Test Case 10: Performance test with large data
DO $$
DECLARE
    base_script_id uuid := '123e4567-e89b-12d3-a456-426614174102'::uuid;
    base_scene_id uuid := '123e4567-e89b-12d3-a456-426614174103'::uuid;
    start_time timestamptz;
    end_time timestamptz;
    i int;
BEGIN
    RAISE NOTICE 'Starting Performance Tests:';
    
    -- Test 1: Bulk line insertion
    start_time := clock_timestamp();
    FOR i IN 1..1000 LOOP
        INSERT INTO public.script_lines (
            script_id, scene_id, character_name,
            line_number, content, emotion_tags
        ) VALUES (
            base_script_id,
            base_scene_id,
            'Bulk Character',
            i + 1000,
            format('Bulk test line %s with some additional content to make it more realistic', i),
            ARRAY['neutral', 'happy']::emotion_type[]
        );
    END LOOP;
    end_time := clock_timestamp();
    RAISE NOTICE 'Bulk insertion time: %', end_time - start_time;
    
    -- Test 2: Complex query performance
    start_time := clock_timestamp();
    WITH emotion_stats AS (
        SELECT 
            script_id,
            unnest(emotion_tags) as emotion,
            count(*) as emotion_count
        FROM public.script_lines
        GROUP BY script_id, emotion
    ),
    line_stats AS (
        SELECT 
            sl.script_id,
            count(*) as total_lines,
            count(DISTINCT character_name) as character_count,
            array_agg(DISTINCT character_name) as characters
        FROM public.script_lines sl
        GROUP BY sl.script_id
    )
    SELECT 
        s.title,
        ls.total_lines,
        ls.character_count,
        ls.characters,
        json_object_agg(es.emotion::text, es.emotion_count) as emotion_distribution
    FROM public.scripts s
    JOIN line_stats ls ON ls.script_id = s.id
    LEFT JOIN emotion_stats es ON es.script_id = s.id
    GROUP BY s.id, s.title, ls.total_lines, ls.character_count, ls.characters;
    
    end_time := clock_timestamp();
    RAISE NOTICE 'Complex query time: %', end_time - start_time;
END $$;

-- Display test results
DO $$
DECLARE
    r RECORD;
BEGIN
    RAISE NOTICE E'\n=== Edge Case Test Results ===\n';
    
    -- Test empty script
    SELECT COUNT(*) FROM public.scripts WHERE characters = '[]'::jsonb INTO r;
    RAISE NOTICE 'Scripts with no characters: %', r;
    
    -- Test special characters
    SELECT COUNT(*) FROM public.scripts 
    WHERE title ~ '[^a-zA-Z0-9\s]' INTO r;
    RAISE NOTICE 'Scripts with special characters: %', r;
    
    -- Test emotion distribution
    SELECT 
        character_name,
        array_length(emotion_tags, 1) as emotion_count
    FROM public.script_lines
    WHERE array_length(emotion_tags, 1) > 5 INTO r;
    RAISE NOTICE 'Lines with many emotions - Character: %, Count: %', r.character_name, r.emotion_count;
    
    -- Test cached audio extremes
    SELECT MIN(duration) as min_dur, MAX(duration) as max_dur, MAX(use_count) as max_uses
    FROM public.cached_audio INTO r;
    RAISE NOTICE 'Audio duration range: % to %, Max uses: %', r.min_dur, r.max_dur, r.max_uses;
    
    -- Test concurrent feedback
    SELECT COUNT(*) FROM public.script_feedback 
    WHERE feedback_type = 'concurrent_feedback' INTO r;
    RAISE NOTICE 'Concurrent feedback entries: %', r;
END $$;

COMMIT; 