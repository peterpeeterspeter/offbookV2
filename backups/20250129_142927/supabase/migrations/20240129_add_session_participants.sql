-- Add session participants table
create table public.session_participants (
    id uuid primary key default uuid_generate_v4(),
    session_id uuid references public.practice_sessions(id) on delete cascade not null,
    user_id uuid references auth.users(id) not null,
    character_role text not null,
    joined_at timestamp with time zone default timezone('utc'::text, now()) not null,
    left_at timestamp with time zone,
    last_active_at timestamp with time zone default timezone('utc'::text, now()) not null,
    settings jsonb not null default '{}'::jsonb
);

-- Create indexes
create index session_participants_session_id_idx on public.session_participants(session_id);
create index session_participants_user_id_idx on public.session_participants(user_id);

-- Enable RLS
alter table public.session_participants enable row level security;

-- Create RLS policies
create policy "Users can view participants in their sessions"
    on public.session_participants for select
    using (
        exists (
            select 1 from public.practice_sessions
            where practice_sessions.id = session_participants.session_id
            and practice_sessions.user_id = auth.uid()
        )
    );

create policy "Users can view participants in accessible sessions"
    on public.session_participants for select
    using (
        exists (
            select 1 from public.practice_sessions
            join public.scripts on scripts.id = practice_sessions.script_id
            where practice_sessions.id = session_participants.session_id
            and (scripts.is_public or scripts.user_id = auth.uid())
        )
    );

create policy "Users can join sessions they have access to"
    on public.session_participants for insert
    with check (
        auth.uid() = user_id and
        exists (
            select 1 from public.practice_sessions
            join public.scripts on scripts.id = practice_sessions.script_id
            where practice_sessions.id = session_participants.session_id
            and (scripts.is_public or scripts.user_id = auth.uid())
        )
    );

create policy "Users can update their own participant records"
    on public.session_participants for update
    using (auth.uid() = user_id);

create policy "Users can delete their own participant records"
    on public.session_participants for delete
    using (auth.uid() = user_id);

-- Create function to automatically update last_active_at
create or replace function public.handle_participant_activity()
returns trigger as $$
begin
    new.last_active_at = timezone('utc'::text, now());
    return new;
end;
$$ language plpgsql;

-- Create trigger for last_active_at
create trigger handle_participant_activity
    before update on public.session_participants
    for each row
    execute function public.handle_participant_activity(); 