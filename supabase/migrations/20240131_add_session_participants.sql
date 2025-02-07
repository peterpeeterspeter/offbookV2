-- Create enum for participant roles
CREATE TYPE public.participant_role AS ENUM ('speaker', 'listener', 'observer');

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

-- Create indexes
CREATE INDEX session_participants_session_id_idx ON public.session_participants(session_id);
CREATE INDEX session_participants_user_id_idx ON public.session_participants(user_id);
CREATE INDEX session_participants_role_idx ON public.session_participants(role);
CREATE INDEX session_participants_active_idx ON public.session_participants(left_at) 
    WHERE left_at IS NULL;

-- Enable RLS
ALTER TABLE public.session_participants ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view participants in their sessions"
    ON public.session_participants FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.practice_sessions
            WHERE practice_sessions.id = session_participants.session_id
            AND practice_sessions.user_id = auth.uid()
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
        )
    );

CREATE POLICY "Users can join sessions they have access to"
    ON public.session_participants FOR INSERT
    WITH CHECK (
        auth.uid() = user_id AND
        EXISTS (
            SELECT 1 FROM public.practice_sessions
            JOIN public.scripts ON scripts.id = practice_sessions.script_id
            WHERE practice_sessions.id = session_participants.session_id
            AND (scripts.is_public OR scripts.user_id = auth.uid())
        )
    );

CREATE POLICY "Users can update their own participant records"
    ON public.session_participants FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own participant records"
    ON public.session_participants FOR DELETE
    USING (auth.uid() = user_id);

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