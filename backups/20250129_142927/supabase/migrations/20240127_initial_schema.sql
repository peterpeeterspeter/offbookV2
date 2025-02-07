-- Enable necessary extensions
create extension if not exists "uuid-ossp";

-- Create tables
create table public.scripts (
    id uuid primary key default uuid_generate_v4(),
    title text not null,
    content text not null,
    user_id uuid references auth.users(id),
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
    is_public boolean default false not null
);

create table public.script_analyses (
    id uuid primary key default uuid_generate_v4(),
    script_id uuid references public.scripts(id) on delete cascade not null,
    analysis jsonb not null default '{}'::jsonb,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create table public.performances (
    id uuid primary key default uuid_generate_v4(),
    script_id uuid references public.scripts(id) on delete cascade not null,
    user_id uuid references auth.users(id),
    recording_url text,
    transcription text,
    analysis jsonb not null default '{}'::jsonb,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create indexes
create index scripts_user_id_idx on public.scripts(user_id);
create index scripts_created_at_idx on public.scripts(created_at);
create index script_analyses_script_id_idx on public.script_analyses(script_id);
create index performances_script_id_idx on public.performances(script_id);
create index performances_user_id_idx on public.performances(user_id);

-- Enable Row Level Security
alter table public.scripts enable row level security;
alter table public.script_analyses enable row level security;
alter table public.performances enable row level security;

-- Create RLS policies

-- Scripts policies
create policy "Users can view their own scripts"
    on public.scripts for select
    using (auth.uid() = user_id);

create policy "Users can view public scripts"
    on public.scripts for select
    using (is_public = true);

create policy "Users can create their own scripts"
    on public.scripts for insert
    with check (auth.uid() = user_id);

create policy "Users can update their own scripts"
    on public.scripts for update
    using (auth.uid() = user_id);

create policy "Users can delete their own scripts"
    on public.scripts for delete
    using (auth.uid() = user_id);

-- Script analyses policies
create policy "Users can view analyses of accessible scripts"
    on public.script_analyses for select
    using (
        exists (
            select 1 from public.scripts
            where scripts.id = script_analyses.script_id
            and (scripts.is_public or scripts.user_id = auth.uid())
        )
    );

create policy "Users can create analyses for accessible scripts"
    on public.script_analyses for insert
    with check (
        exists (
            select 1 from public.scripts
            where scripts.id = script_analyses.script_id
            and (scripts.is_public or scripts.user_id = auth.uid())
        )
    );

-- Performances policies
create policy "Users can view performances of accessible scripts"
    on public.performances for select
    using (
        exists (
            select 1 from public.scripts
            where scripts.id = performances.script_id
            and (scripts.is_public or scripts.user_id = auth.uid())
        )
    );

create policy "Users can create their own performances"
    on public.performances for insert
    with check (auth.uid() = user_id);

create policy "Users can update their own performances"
    on public.performances for update
    using (auth.uid() = user_id);

create policy "Users can delete their own performances"
    on public.performances for delete
    using (auth.uid() = user_id);

-- Create functions for automatic timestamp updates
create or replace function public.handle_updated_at()
returns trigger as $$
begin
    new.updated_at = timezone('utc'::text, now());
    return new;
end;
$$ language plpgsql;

-- Create triggers for updated_at
create trigger handle_updated_at
    before update on public.scripts
    for each row
    execute function public.handle_updated_at(); 