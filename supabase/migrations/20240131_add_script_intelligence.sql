-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create enum for emotion tags
CREATE TYPE public.emotion_type AS ENUM (
    'neutral', 'happy', 'sad', 'angry', 'fearful', 
    'disgusted', 'surprised', 'sarcastic', 'whispering'
);

-- Create enum for scene types
CREATE TYPE public.scene_type AS ENUM (
    'dialogue', 'monologue', 'action', 'transition'
);

-- Create table for scenes
CREATE TABLE public.scenes (
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
CREATE TABLE public.script_lines (
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
CREATE TABLE public.cached_audio (
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
CREATE TABLE public.script_feedback (
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
CREATE INDEX scenes_script_id_idx ON public.scenes(script_id);
CREATE INDEX script_lines_script_id_idx ON public.script_lines(script_id);
CREATE INDEX script_lines_scene_id_idx ON public.script_lines(scene_id);
CREATE INDEX script_lines_character_name_idx ON public.script_lines(character_name);
CREATE INDEX cached_audio_line_id_idx ON public.cached_audio(line_id);
CREATE INDEX cached_audio_emotion_idx ON public.cached_audio(emotion);
CREATE INDEX cached_audio_last_used_idx ON public.cached_audio(last_used_at);
CREATE INDEX script_feedback_script_id_idx ON public.script_feedback(script_id);
CREATE INDEX script_feedback_user_id_idx ON public.script_feedback(user_id);

-- Enable row level security
ALTER TABLE public.scenes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.script_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cached_audio ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.script_feedback ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for scenes
CREATE POLICY "Users can view scenes of accessible scripts"
    ON public.scenes FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.scripts
            WHERE scripts.id = scenes.script_id
            AND (scripts.is_public OR scripts.user_id = auth.uid())
        )
    );

-- Create RLS policies for script lines
CREATE POLICY "Users can view lines of accessible scripts"
    ON public.script_lines FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.scripts
            WHERE scripts.id = script_lines.script_id
            AND (scripts.is_public OR scripts.user_id = auth.uid())
        )
    );

-- Create RLS policies for cached audio
CREATE POLICY "Anyone can view cached audio"
    ON public.cached_audio FOR SELECT
    USING (true);

-- Create RLS policies for script feedback
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

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_timestamps()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for timestamp updates
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

-- Create function to update cached audio usage
CREATE OR REPLACE FUNCTION public.update_cached_audio_usage()
RETURNS TRIGGER AS $$
BEGIN
    NEW.last_used_at = timezone('utc'::text, now());
    NEW.use_count = NEW.use_count + 1;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for cached audio usage updates
CREATE TRIGGER update_cached_audio_usage
    BEFORE UPDATE ON public.cached_audio
    FOR EACH ROW
    EXECUTE FUNCTION public.update_cached_audio_usage(); 