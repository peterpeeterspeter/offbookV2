-- Add practice sessions table
create table public.practice_sessions (
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
create index practice_sessions_script_id_idx on public.practice_sessions(script_id);
create index practice_sessions_user_id_idx on public.practice_sessions(user_id);
create index practice_sessions_status_idx on public.practice_sessions(status);

-- Enable RLS
alter table public.practice_sessions enable row level security;

-- Create RLS policies
create policy "Users can view their own practice sessions"
    on public.practice_sessions for select
    using (auth.uid() = user_id);

create policy "Users can view practice sessions of accessible scripts"
    on public.practice_sessions for select
    using (
        exists (
            select 1 from public.scripts
            where scripts.id = practice_sessions.script_id
            and (scripts.is_public or scripts.user_id = auth.uid())
        )
    );

create policy "Users can create their own practice sessions"
    on public.practice_sessions for insert
    with check (auth.uid() = user_id);

create policy "Users can update their own practice sessions"
    on public.practice_sessions for update
    using (auth.uid() = user_id);

create policy "Users can delete their own practice sessions"
    on public.practice_sessions for delete
    using (auth.uid() = user_id);

-- Create function to automatically update last_active_at
create or replace function public.handle_practice_session_activity()
returns trigger as $$
begin
    new.last_active_at = timezone('utc'::text, now());
    return new;
end;
$$ language plpgsql;

-- Create trigger for last_active_at
create trigger handle_practice_session_activity
    before update on public.practice_sessions
    for each row
    execute function public.handle_practice_session_activity(); 