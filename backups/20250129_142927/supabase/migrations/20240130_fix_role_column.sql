-- Drop existing table if it exists (to avoid conflicts)
DROP TABLE IF EXISTS public.practice_sessions CASCADE;

-- Recreate table with correct column name
CREATE TABLE public.practice_sessions (
    id uuid primary key default uuid_generate_v4(),
    script_id uuid references public.scripts(id) on delete cascade not null,
    user_id uuid references auth.users(id),
    character_role text not null,
    status text not null default 'active',
    settings jsonb not null default '{}'::jsonb,
    started_at timestamp with time zone default timezone('utc'::text, now()) not null,
    ended_at timestamp with time zone,
    last_active_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create indexes
CREATE INDEX practice_sessions_script_id_idx ON public.practice_sessions(script_id);
CREATE INDEX practice_sessions_user_id_idx ON public.practice_sessions(user_id);
CREATE INDEX practice_sessions_status_idx ON public.practice_sessions(status);

-- Enable RLS
ALTER TABLE public.practice_sessions ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own practice sessions"
    ON public.practice_sessions FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can view practice sessions of accessible scripts"
    ON public.practice_sessions FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.scripts
            WHERE scripts.id = practice_sessions.script_id
            AND (scripts.is_public OR scripts.user_id = auth.uid())
        )
    );

CREATE POLICY "Users can create their own practice sessions"
    ON public.practice_sessions FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own practice sessions"
    ON public.practice_sessions FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own practice sessions"
    ON public.practice_sessions FOR DELETE
    USING (auth.uid() = user_id);

-- Create function to automatically update last_active_at
CREATE OR REPLACE FUNCTION public.handle_practice_session_activity()
RETURNS TRIGGER AS $$
BEGIN
    NEW.last_active_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for last_active_at
CREATE TRIGGER handle_practice_session_activity
    BEFORE UPDATE ON public.practice_sessions
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_practice_session_activity(); 