-- Test script creation
INSERT INTO public.scripts (title, content, is_public)
VALUES ('Test Script', 'To be or not to be, that is the question.', true)
RETURNING id, title, content, created_at;

-- Test script analysis
INSERT INTO public.script_analyses (
    script_id,
    analysis
)
SELECT 
    id as script_id,
    '{
        "emotions": [
            {
                "name": "Contemplative",
                "intensity": 80,
                "description": "Deep philosophical reflection"
            }
        ],
        "pacing": {
            "speed": "medium",
            "suggestions": ["Pause after each phrase"]
        }
    }'::jsonb as analysis
FROM public.scripts
WHERE title = 'Test Script'
RETURNING id, script_id, analysis;

-- Test performance
INSERT INTO public.performances (
    script_id,
    transcription,
    analysis
)
SELECT 
    id as script_id,
    'To be or not to be, that is the question.' as transcription,
    '{
        "accuracy": 95,
        "emotions": ["contemplative", "uncertain"],
        "pacing": "good"
    }'::jsonb as analysis
FROM public.scripts
WHERE title = 'Test Script'
RETURNING id, script_id, transcription, analysis;

-- Verify data
SELECT 
    s.id as script_id,
    s.title,
    s.content,
    sa.analysis as script_analysis,
    p.transcription,
    p.analysis as performance_analysis
FROM public.scripts s
LEFT JOIN public.script_analyses sa ON s.id = sa.script_id
LEFT JOIN public.performances p ON s.id = p.script_id
WHERE s.title = 'Test Script'; 