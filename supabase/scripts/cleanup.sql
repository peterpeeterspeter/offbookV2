-- Clean up test data
DELETE FROM public.session_participants;
DELETE FROM public.practice_sessions;
DELETE FROM public.performances;
DELETE FROM public.script_analyses;
DELETE FROM public.scripts;

-- Reset sequences
ALTER SEQUENCE IF EXISTS session_participants_id_seq RESTART;
ALTER SEQUENCE IF EXISTS practice_sessions_id_seq RESTART;
ALTER SEQUENCE IF EXISTS performances_id_seq RESTART;
ALTER SEQUENCE IF EXISTS script_analyses_id_seq RESTART;
ALTER SEQUENCE IF EXISTS scripts_id_seq RESTART; 