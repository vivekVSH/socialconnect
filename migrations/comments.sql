-- Create comments table
create table public.comments (
    id uuid primary key default uuid_generate_v4(),
    post_id uuid references public.posts(id) on delete cascade,
    author_id uuid references public.profiles(id) on delete cascade,
    content text not null,
    created_at timestamptz not null default now()
);

-- Add RLS policies for comments
alter table public.comments enable row level security;

create policy "Anyone can view comments"
    on public.comments for select
    to authenticated
    using (true);

create policy "Users can create comments"
    on public.comments for insert
    to authenticated
    with check (auth.uid() = author_id);
